import { beforeEach, describe, expect, it, vi } from "vitest";

const { runIngestPipeline } = vi.hoisted(() => ({
  runIngestPipeline: vi.fn(),
}));

vi.mock("@/lib/ingest-pipeline", () => ({
  runIngestPipeline,
}));

import { POST } from "@/app/api/uploads/route";

describe("/api/uploads shared pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes UI upload through runIngestPipeline", async () => {
    runIngestPipeline.mockResolvedValueOnce({
      ok: true,
      tenantId: "anonymous",
      source: "ui",
      kind: "supporting",
      fileName: "123-test.csv",
      originalFileName: "test.csv",
      size: 20,
      storageType: "local",
      path: "C:/tmp/123-test.csv",
      rowCount: 1,
      columnCount: 2,
      headers: ["account", "amount"],
      forecastTriggered: false,
    });

    const file = new File(["account,amount\n1000,20"], "test.csv", {
      type: "text/csv",
    });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "supporting");

    const request = new Request("http://localhost:3000/api/uploads", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(runIngestPipeline).toHaveBeenCalledTimes(1);
    expect(runIngestPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "test.csv",
        kind: "supporting",
        source: "ui",
        tenantId: "anonymous",
      })
    );
    expect(json.fileName).toBe("123-test.csv");
    expect(json.rowCount).toBe(1);
  });
});
