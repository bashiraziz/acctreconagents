import { describe, it, expect } from "vitest";
import { suggestColumnMappings } from "@/lib/parseFile";

describe("suggestColumnMappings", () => {
  const fields = ["account_code", "amount", "period", "currency", "description"];

  it("maps standard GL headers correctly", () => {
    const headers = ["Account Code", "Balance", "Period", "Currency", "Description"];
    const result = suggestColumnMappings(headers, fields);
    expect(result.account_code).toBe("Account Code");
    expect(result.amount).toBe("Balance");
    expect(result.period).toBe("Period");
    expect(result.currency).toBe("Currency");
    expect(result.description).toBe("Description");
  });

  it("matches account number variant", () => {
    const result = suggestColumnMappings(["Account Number"], ["account_code"]);
    expect(result.account_code).toBe("Account Number");
  });

  it("matches GL Account variant", () => {
    const result = suggestColumnMappings(["GL Account"], ["account_code"]);
    expect(result.account_code).toBe("GL Account");
  });

  it("matches Total as amount", () => {
    const result = suggestColumnMappings(["Total"], ["amount"]);
    expect(result.amount).toBe("Total");
  });

  it("matches CCY as currency", () => {
    const result = suggestColumnMappings(["CCY"], ["currency"]);
    expect(result.currency).toBe("CCY");
  });

  it("does not map fields not in the allowed list", () => {
    const result = suggestColumnMappings(["Account Code", "Amount"], ["amount"]);
    expect(result.account_code).toBeUndefined();
    expect(result.amount).toBe("Amount");
  });

  it("returns empty object for unrecognised headers", () => {
    const result = suggestColumnMappings(["Foo", "Bar", "Baz"], fields);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const result = suggestColumnMappings(["ACCOUNT CODE", "BALANCE"], fields);
    expect(result.account_code).toBe("ACCOUNT CODE");
    expect(result.amount).toBe("BALANCE");
  });
});
