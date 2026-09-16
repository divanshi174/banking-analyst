import { describe, expect, it } from "vitest";
import { containsUnsafeSqlInput, validateQuery } from "../src/services/queryValidator.js";

describe("validateQuery", () => {
    it("blocks mutating queries", () => {
        expect(validateQuery("DROP TABLE customers")).toBe(false);
        expect(validateQuery("DELETE FROM customers")).toBe(false);
        expect(validateQuery("UPDATE customers SET name = 'Attacker'")).toBe(false);
    });

    it("blocks raw sql-like user input", () => {
        expect(containsUnsafeSqlInput("DROP TABLE customers;")).toBe(true);
        expect(containsUnsafeSqlInput("SELECT * FROM customers")).toBe(true);
        expect(containsUnsafeSqlInput("show branch totals")).toBe(false);
    });
});