import { describe, expect, it } from "vitest";
import { deriveIngestKindFromS3Drop } from "@/lib/s3-drop";

describe("deriveIngestKindFromS3Drop", () => {
  it("detects kind from inbox subfolders", () => {
    expect(
      deriveIngestKindFromS3Drop("tenants/t1/inbox/gl/trial-balance.csv")
    ).toBe("gl_balance");
    expect(
      deriveIngestKindFromS3Drop("tenants/t1/inbox/subledger/ap.csv")
    ).toBe("subledger_balance");
    expect(
      deriveIngestKindFromS3Drop("tenants/t1/inbox/transactions/ar.csv")
    ).toBe("transactions");
  });

  it("falls back to filename prefixes", () => {
    expect(
      deriveIngestKindFromS3Drop("tenants/t1/inbox/sl_april.csv")
    ).toBe("subledger_balance");
    expect(
      deriveIngestKindFromS3Drop("tenants/t1/inbox/txn_2026-03.csv")
    ).toBe("transactions");
    expect(
      deriveIngestKindFromS3Drop("tenants/t1/inbox/trial_balance_2026.csv")
    ).toBe("gl_balance");
  });
});

