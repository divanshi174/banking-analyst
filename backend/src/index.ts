import cors from "cors";
import express from "express";
import db from "./db/index.js";
import { parseQuestionToSql } from "./services/aiService.js";
import { validateQuery } from "./services/queryValidator.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/chat", (request, response) => {
  const { question } = request.body as { question?: unknown };

  if (typeof question !== "string" || !question.trim()) {
    response.status(400).json({ error: "question must be a non-empty string" });
    return;
  }

  const parsedQuery = parseQuestionToSql(question);

  if (!validateQuery(parsedQuery.sql)) {
    response.status(400).json({ error: "Generated query failed security validation" });
    return;
  }

  try {
    const results = db.prepare(parsedQuery.sql).all();
    response.json({
      question,
      sql: parsedQuery.sql,
      results,
      visualizationType: parsedQuery.visualizationType,
    });
  } catch {
    response.status(500).json({ error: "Unable to execute generated query" });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Banking analyst API listening on port ${port}`);
});