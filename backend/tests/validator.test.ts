import { describe, expect, it } from "vitest";
import { validateQuery } from "../src/services/queryValidator.js";

describe("validateQuery", () => {
  it("blocks mutating queries", () => {
    expect(validateQuery("DROP TABLE customers")).toBe(false);
    expect(validateQuery("DELETE FROM customers")).toBe(false);
    expect(validateQuery("UPDATE customers SET name = 'Attacker'")).toBe(false);
  });
});