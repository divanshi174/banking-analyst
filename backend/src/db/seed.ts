import db from "./index.js";

const customers = [
    ["Aisha Patel", "Downtown", "Low", "2021-02-14"],
    ["Marcus Johnson", "Northside", "Medium", "2020-07-09"],
    ["Elena Garcia", "Westend", "Low", "2022-11-21"],
    ["Daniel Kim", "Downtown", "High", "2019-04-03"],
    ["Priya Shah", "Northside", "Low", "2023-01-18"],
    ["Thomas Brown", "Westend", "Medium", "2021-09-27"],
    ["Sofia Martinez", "Downtown", "Low", "2022-05-12"],
    ["Liam Wilson", "Northside", "High", "2018-12-06"],
    ["Grace Chen", "Westend", "Low", "2020-03-30"],
    ["Noah Thompson", "Downtown", "Medium", "2023-06-15"],
    ["Amara Okafor", "Northside", "Low", "2021-11-02"],
    ["Ethan Davis", "Westend", "Medium", "2019-08-19"],
] as const;

const categories = ["Groceries", "Salary", "Rent", "Utilities", "Dining"] as const;
const branches = ["Downtown", "Northside", "Westend"] as const;

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    branch TEXT NOT NULL CHECK (branch IN ('Downtown', 'Northside', 'Westend')),
    risk_rating TEXT NOT NULL CHECK (risk_rating IN ('Low', 'Medium', 'High')),
    joined_date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
    category TEXT NOT NULL CHECK (category IN ('Groceries', 'Salary', 'Rent', 'Utilities', 'Dining')),
    transaction_date TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );
`);

const seed = db.transaction(() => {
    db.exec("DELETE FROM transactions; DELETE FROM customers;");

    const insertCustomer = db.prepare(
        "INSERT INTO customers (name, branch, risk_rating, joined_date) VALUES (?, ?, ?, ?)",
    );
    const insertTransaction = db.prepare(
        "INSERT INTO transactions (customer_id, amount, type, category, transaction_date) VALUES (?, ?, ?, ?, ?)",
    );

    for (const customer of customers) {
        insertCustomer.run(...customer);
    }

    for (let index = 0; index < 50; index += 1) {
        const customerId = (index % customers.length) + 1;
        const category = categories[index % categories.length];
        const isCredit = category === "Salary" || index % 7 === 0;
        const amount = category === "Salary"
            ? 3200 + (index % 4) * 450
            : 24 + (index * 37) % 420;
        const month = String((index % 6) + 1).padStart(2, "0");
        const day = String((index % 27) + 1).padStart(2, "0");

        insertTransaction.run(
            customerId,
            amount,
            isCredit ? "CREDIT" : "DEBIT",
            category,
            `2025-${month}-${day}`,
        );
    }
});

seed();
db.close();

console.log(`Seeded ${customers.length} customers and 50 transactions.`);