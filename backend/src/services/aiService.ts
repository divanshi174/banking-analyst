export type VisualizationType = "kpi" | "bar" | "line" | "table";

export interface ParsedQuestion {
    sql: string;
    visualizationType: VisualizationType;
}

const queryPatterns: Array<{
    pattern: RegExp;
    sql: string;
    visualizationType: VisualizationType;
}> = [
        {
            pattern: /branch.*(volume|volumes|transaction|transactions|activity|activities|total|totals)|((volume|volumes|total|totals|transaction|transactions).*(per|by) branch)|branch totals?/i,
            sql: "SELECT c.branch, COUNT(t.id) AS transaction_count, ROUND(SUM(t.amount), 2) AS total_amount FROM transactions t JOIN customers c ON c.id = t.customer_id GROUP BY c.branch ORDER BY total_amount DESC",
            visualizationType: "bar",
        },
        {
            pattern: /((top|highest|biggest|most).*(spender|spenders|spend|spending|customer|customers))|(spender|spenders|spend|spending).*(top|highest|biggest|most)|who spends? the most|top\s*\d+\s+spending customers?/i,
            sql: "SELECT c.name, c.branch, ROUND(SUM(t.amount), 2) AS total_spent FROM transactions t JOIN customers c ON c.id = t.customer_id WHERE t.type = 'DEBIT' GROUP BY c.id, c.name, c.branch ORDER BY total_spent DESC LIMIT 5",
            visualizationType: "table",
        },
        {
            pattern: /risk.*(distribution|rating|breakdown)|((distribution|rating|breakdown).*(risk|ratings?))|risk breakdown/i,
            sql: "SELECT risk_rating, COUNT(*) AS customer_count FROM customers GROUP BY risk_rating ORDER BY customer_count DESC",
            visualizationType: "bar",
        },
        {
            pattern: /monthly.*(trend|trends|volume|volumes|transaction|transactions)|trend.*monthly|transactions?.*month|month.*trend/i,
            sql: "SELECT substr(transaction_date, 1, 7) AS month, COUNT(*) AS transaction_count, ROUND(SUM(amount), 2) AS total_amount FROM transactions GROUP BY month ORDER BY month",
            visualizationType: "line",
        },
        {
            pattern: /total.*(balance|transaction|volume)|how many transactions|transaction count/i,
            sql: "SELECT COUNT(*) AS transaction_count, ROUND(SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END), 2) AS total_credits, ROUND(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END), 2) AS total_debits FROM transactions",
            visualizationType: "kpi",
        },
    ];

export function parseQuestionToSql(question: string): ParsedQuestion {
    const normalizedQuestion = question.trim();

    for (const queryPattern of queryPatterns) {
        if (queryPattern.pattern.test(normalizedQuestion)) {
            return {
                sql: queryPattern.sql,
                visualizationType: queryPattern.visualizationType,
            };
        }
    }

    return {
        sql: "SELECT c.name, c.branch, c.risk_rating, COUNT(t.id) AS transaction_count, ROUND(COALESCE(SUM(t.amount), 0), 2) AS total_amount FROM customers c LEFT JOIN transactions t ON t.customer_id = c.id GROUP BY c.id, c.name, c.branch, c.risk_rating ORDER BY total_amount DESC",
        visualizationType: "table",
    };
}