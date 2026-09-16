const forbiddenKeywords = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|PRAGMA|VACUUM)\b/i;

export function validateQuery(sql: string): boolean {
  const normalizedSql = sql.trim();

  if (!normalizedSql || !/^SELECT\b/i.test(normalizedSql)) {
    return false;
  }

  if (/[;]|--|\/\*|\*\//.test(normalizedSql)) {
    return false;
  }

  return !forbiddenKeywords.test(normalizedSql);
}