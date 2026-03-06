import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { runIngestPipeline, downloadFromS3, headS3Object } = vi.hoisted(() => ({
  runIngestPipeline: vi.fn(),
  downloadFromS3: vi.fn(),
  headS3Object: vi.fn(),
}));

vi.mock("@/lib/ingest-pipeline", () => ({
  runIngestPipeline,
}));

vi.mock("@/lib/file-storage", () => ({
  downloadFromS3,
  headS3Object,
}));

import { POST } from "@/app/api/ingest/s3-drop/route";

describe("/api/ingest/s3-drop", () => {
  const env = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...env, INGEST_INTERNAL_SECRET: "test-secret" };
  });

  afterEach(() => {
    process.env = env;
  });

  it("returns 401 when secret is missing", async () => {
    const request = new Request("http://localhost:3000/api/ingest/s3-drop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: "tenant-1",
        s3Key: "tenants/tenant-1/inbox/gl.csv",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("processes drop with valid secret through shared pipeline", async () => {
    headS3Object.mockResolvedValueOnce({ exists: true, size: 12 });
    downloadFromS3.mockResolvedValueOnce(Buffer.from("a,b\n1,2"));
    runIngestPipeline.mockResolvedValueOnce({
      ok: true,
      tenantId: "tenant-1",
      source: "s3-drop",
      kind: "gl_balance",
      fileName: "stored.csv",
      originalFileName: "gl.csv",
      size: 8,
      storageType: "local",
      path: "C:/tmp/stored.csv",
      rowCount: 1,
      columnCount: 2,
      headers: ["a", "b"],
      forecastTriggered: false,
    });

    const request = new Request("http://localhost:3000/api/ingest/s3-drop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-internal-secret": "test-secret",
      },
      body: JSON.stringify({
        tenantId: "tenant-1",
        s3Key: "tenants/tenant-1/inbox/gl.csv",
        jobId: "job-123",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(downloadFromS3).toHaveBeenCalledWith("tenants/tenant-1/inbox/gl.csv");
    expect(runIngestPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        source: "s3-drop",
      })
    );
    expect(json.ok).toBe(true);
    expect(json.jobId).toBe("job-123");
  });
});
