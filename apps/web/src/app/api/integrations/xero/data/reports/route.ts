import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, withErrorHandler } from "@/lib/api-error";
import { resolveOrganizationScope } from "@/lib/integrations/organization-scope";
import { getIntegrationProvider } from "@/lib/integrations/provider-registry";
import { fetchXeroReportsList, probeXeroReportById } from "@/lib/xero";
import { getXeroMcpConfig } from "@/lib/xero-mcp";
import { getValidDbXeroAccessToken } from "@/lib/xero-session";
import {
  getDevXeroConnection,
  getMostRecentDevXeroConnection,
  upsertDevXeroConnection,
} from "@/lib/xero-dev-store";

export const runtime = "nodejs";
const XERO_DEV_SESSION_COOKIE = "xero_dev_session";
const provider = getIntegrationProvider("xero");

const COMMON_REPORT_PROBES: Array<{
  id: string;
  buildParams: (dateIso: string) => Record<string, string | undefined>;
}> = [
  {
    id: "TrialBalance",
    buildParams: (dateIso) => ({ date: dateIso }),
  },
  {
    id: "BalanceSheet",
    buildParams: (dateIso) => ({ date: dateIso }),
  },
  {
    id: "ProfitAndLoss",
    buildParams: (dateIso) => ({
      fromDate: `${dateIso.slice(0, 7)}-01`,
      toDate: dateIso,
    }),
  },
  {
    id: "AgedReceivablesByContact",
    buildParams: (dateIso) => ({ date: dateIso }),
  },
  {
    id: "AgedPayablesByContact",
    buildParams: (dateIso) => ({ date: dateIso }),
  },
  {
    id: "BankSummary",
    buildParams: (dateIso) => ({
      fromDate: `${dateIso.slice(0, 7)}-01`,
      toDate: dateIso,
    }),
  },
  {
    id: "ExecutiveSummary",
    buildParams: (dateIso) => ({ date: dateIso }),
  },
];

function resolveRequestedMode(rawMode: string | null): "oauth" | "mcp" {
  return rawMode?.toLowerCase() === "mcp" ? "mcp" : "oauth";
}

function getValidAccessTokenFromDevStore(
  organizationId: string,
  devSessionId?: string
) {
  const existing = devSessionId
    ? getDevXeroConnection(devSessionId, organizationId)
    : getMostRecentDevXeroConnection(organizationId);
  if (!existing) {
    return null;
  }

  const expiresAtMs = new Date(existing.expiresAt).getTime();
  const now = Date.now();
  const stillValid = Number.isFinite(expiresAtMs) && expiresAtMs > now + 60_000;
  if (stillValid) {
    return existing;
  }

  return null;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const devNoDbMode = provider.isDevNoDbModeEnabled();
  const mcpConfig = getXeroMcpConfig();
  const requestedMode = resolveRequestedMode(request.nextUrl.searchParams.get("mode"));
  const useMcpMode = mcpConfig.enabled && requestedMode === "mcp";

  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({
      headers: request.headers,
    });
  } catch (error) {
    console.warn("Auth session lookup failed:", error);
  }
  if (!session?.user && !devNoDbMode) {
    return ApiErrors.unauthorized();
  }

  const scope = await resolveOrganizationScope({
    request,
    userId: session?.user?.id ?? null,
    allowAnonymous: devNoDbMode,
  });
  const organizationId = scope.organizationId;

  const oauthConfig = provider.getConfig();
  if (!oauthConfig.isConfigured) {
    return ApiErrors.badRequest(
      "Xero integration is not configured",
      "Set XERO_CLIENT_ID and XERO_CLIENT_SECRET in the environment."
    );
  }

  let accessToken = "";
  let tenantId = "";
  let tenantName: string | null = null;
  if (devNoDbMode) {
    const devSessionId = request.cookies.get(XERO_DEV_SESSION_COOKIE)?.value ?? "";
    let connection = getValidAccessTokenFromDevStore(
      organizationId,
      devSessionId || undefined
    );
    if (!connection && devSessionId) {
      const stale = getDevXeroConnection(devSessionId, organizationId);
      if (stale) {
        const refreshed = await provider.oauth.refreshToken(stale.refreshToken);
        connection = upsertDevXeroConnection(stale.sessionId, organizationId, {
          tenantId: stale.tenantId,
          tenantName: stale.tenantName,
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresAt: new Date(Date.now() + Math.max(refreshed.expires_in - 60, 60) * 1000),
          scope: refreshed.scope ?? stale.scope,
          tokenType: refreshed.token_type ?? stale.tokenType,
        });
      }
    } else if (!connection) {
      const recent = getMostRecentDevXeroConnection(organizationId);
      if (recent) {
        const refreshed = await provider.oauth.refreshToken(recent.refreshToken);
        connection = upsertDevXeroConnection(recent.sessionId, organizationId, {
          tenantId: recent.tenantId,
          tenantName: recent.tenantName,
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresAt: new Date(Date.now() + Math.max(refreshed.expires_in - 60, 60) * 1000),
          scope: refreshed.scope ?? recent.scope,
          tokenType: refreshed.token_type ?? recent.tokenType,
        });
      }
    }

    if (!connection) {
      const detail = useMcpMode && mcpConfig.hasDirectCredentials
        ? "Direct MCP credentials do not expose a tenant-scoped reports list. Connect via app OAuth in API mode first."
        : "Connect Xero first, then retry Discover Reports.";
      return ApiErrors.badRequest("No connected Xero tenant", detail);
    }
    accessToken = connection.accessToken;
    tenantId = connection.tenantId;
    tenantName = connection.tenantName;
  } else if (session?.user) {
    const connection = await getValidDbXeroAccessToken({
      userId: session.user.id,
      organizationId,
      provider,
    });
    accessToken = connection.accessToken;
    tenantId = connection.externalTenantId;
    tenantName = connection.externalTenantName;
  } else {
    return ApiErrors.unauthorized();
  }

  const payload = await fetchXeroReportsList(accessToken, tenantId);
  const reportsRaw = Array.isArray(payload?.Reports) ? payload.Reports : [];
  const reportsFromList = reportsRaw
    .map((row) => ({
      id: row.ReportID?.trim() || "",
      name: row.ReportName?.trim() || row.ReportTitles?.[0]?.trim() || "Unnamed report",
      type: row.ReportType?.trim() || null,
      source: "reports_list" as const,
    }))
    .filter((row) => row.id || row.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  const dateIso = new Date().toISOString().slice(0, 10);
  const probeResults = await Promise.all(
    COMMON_REPORT_PROBES.map((probe) =>
      probeXeroReportById(
        accessToken,
        tenantId,
        probe.id,
        probe.buildParams(dateIso)
      ).catch(() => ({
        reportId: probe.id,
        available: false,
        status: 500,
        reportName: null,
      }))
    )
  );

  const reportsFromProbe = probeResults
    .filter((result) => result.available)
    .map((result) => ({
      id: result.reportId,
      name: result.reportName?.trim() || result.reportId,
      type: "probed_endpoint",
      source: "endpoint_probe" as const,
    }));

  const deduped = new Map<
    string,
    { id: string; name: string; type: string | null; source: "reports_list" | "endpoint_probe" }
  >();
  for (const report of [...reportsFromList, ...reportsFromProbe]) {
    const key = report.id || report.name.toLowerCase();
    if (!deduped.has(key)) {
      deduped.set(key, report);
    }
  }
  const reports = [...deduped.values()].sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    mode: requestedMode,
    organizationId,
    tenant: {
      id: tenantId,
      name: tenantName,
    },
    count: reports.length,
    reports,
    diagnostics: {
      listCount: reportsFromList.length,
      probedCount: reportsFromProbe.length,
      totalProbes: COMMON_REPORT_PROBES.length,
    },
  });
});
