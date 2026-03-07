import { NextRequest, NextResponse } from "next/server";
import {
  CreateAccessKeyCommand,
  CreateUserCommand,
  DeleteAccessKeyCommand,
  GetUserCommand,
  IAMClient,
  ListAccessKeysCommand,
  PutUserPolicyCommand,
} from "@aws-sdk/client-iam";
import { ApiErrors, withErrorHandler } from "@/lib/api-error";
import { auth } from "@/lib/auth";
import { upsertTenantDropZoneAccessKeyId } from "@/lib/db/client";

export const runtime = "nodejs";

function parseAdminEmails(): string[] {
  return (process.env.DROP_ZONE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isDropZoneAdmin(email: string | null | undefined): boolean {
  const adminEmails = parseAdminEmails();
  if (adminEmails.length === 0) {
    return process.env.NODE_ENV !== "production";
  }
  if (!email) return false;
  return adminEmails.includes(email.toLowerCase());
}

function sanitizeTenantForIam(tenantId: string): string {
  const cleaned = tenantId.replace(/[^a-zA-Z0-9+=,.@_-]/g, "-");
  return cleaned.slice(0, 40);
}

function buildDropZonePrefix(tenantId: string): string {
  return `tenants/${tenantId}/inbox/`;
}

function buildPolicyDocument(bucket: string, tenantId: string): string {
  const prefix = buildDropZonePrefix(tenantId);
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "AllowTenantWriteOnlyToInbox",
        Effect: "Allow",
        Action: ["s3:PutObject"],
        Resource: `arn:aws:s3:::${bucket}/${prefix}*`,
      },
    ],
  });
}

function getIamClient(): IAMClient {
  const region = process.env.AWS_DROP_ZONE_REGION?.trim() || "us-east-1";
  return new IAMClient({ region });
}

async function ensureIamUser(client: IAMClient, userName: string): Promise<void> {
  try {
    await client.send(new GetUserCommand({ UserName: userName }));
    return;
  } catch (error) {
    const maybe = error as { name?: string };
    if (maybe?.name !== "NoSuchEntity") {
      throw error;
    }
  }
  await client.send(new CreateUserCommand({ UserName: userName }));
}

async function deleteExistingAccessKeys(client: IAMClient, userName: string): Promise<void> {
  const listed = await client.send(new ListAccessKeysCommand({ UserName: userName }));
  const keys = listed.AccessKeyMetadata ?? [];
  for (const key of keys) {
    if (!key.AccessKeyId) continue;
    await client.send(
      new DeleteAccessKeyCommand({
        UserName: userName,
        AccessKeyId: key.AccessKeyId,
      })
    );
  }
}

export const POST = withErrorHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ tenantId: string }> }
  ) => {
    const params = await context.params;
    const tenantId = params.tenantId?.trim();
    if (!tenantId) {
      return ApiErrors.badRequest("Missing tenant id");
    }

    let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
    try {
      session = await auth.api.getSession({
        headers: request.headers,
      });
    } catch (error) {
      console.warn("Auth session lookup failed:", error);
    }
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }
    if (!isDropZoneAdmin(session.user.email)) {
      return ApiErrors.forbidden(
        "Admin access required for drop-zone credential management",
        "Set DROP_ZONE_ADMIN_EMAILS to authorize specific users"
      );
    }

    const bucketName = process.env.AWS_DROP_ZONE_BUCKET?.trim();
    if (!bucketName) {
      return ApiErrors.badRequest(
        "AWS_DROP_ZONE_BUCKET is not configured",
        "Set AWS_DROP_ZONE_BUCKET before creating tenant drop-zone credentials"
      );
    }
    const region = process.env.AWS_DROP_ZONE_REGION?.trim() || "us-east-1";
    const prefix = buildDropZonePrefix(tenantId);
    const userName = `acctrecon-drop-${sanitizeTenantForIam(tenantId)}`;
    const policyName = `acctrecon-drop-${sanitizeTenantForIam(tenantId)}-put-only`;

    const client = getIamClient();
    await ensureIamUser(client, userName);
    await client.send(
      new PutUserPolicyCommand({
        UserName: userName,
        PolicyName: policyName,
        PolicyDocument: buildPolicyDocument(bucketName, tenantId),
      })
    );
    await deleteExistingAccessKeys(client, userName);

    const createdKey = await client.send(
      new CreateAccessKeyCommand({
        UserName: userName,
      })
    );

    const accessKeyId = createdKey.AccessKey?.AccessKeyId;
    const secretAccessKey = createdKey.AccessKey?.SecretAccessKey;
    if (!accessKeyId || !secretAccessKey) {
      return ApiErrors.internalError("Failed to create IAM access key");
    }

    await upsertTenantDropZoneAccessKeyId(tenantId, accessKeyId);

    return NextResponse.json({
      ok: true,
      tenantId,
      bucketName,
      region,
      prefix,
      accessKeyId,
      secretAccessKey,
    });
  }
);
