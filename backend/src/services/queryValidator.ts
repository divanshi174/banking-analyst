const forbiddenKeywords = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|PRAGMA|VACUUM)\b/i;
const suspiciousSqlInput = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|PRAGMA|VACUUM)\b/i;
const blockedSyntax = /[;]|--|\/\*|\*\//;

export function containsUnsafeSqlInput(input: string): boolean {
    const normalizedInput = input.trim();

    if (!normalizedInput) {
        return false;
    }

    return blockedSyntax.test(normalizedInput) || suspiciousSqlInput.test(normalizedInput);
}

export function validateQuery(sql: string): boolean {
    const normalizedSql = sql.trim();

    if (!normalizedSql || !/^SELECT\b/i.test(normalizedSql)) {
        return false;
    }

    if (blockedSyntax.test(normalizedSql)) {
        return false;
    }

    return !forbiddenKeywords.test(normalizedSql);
}