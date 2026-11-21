import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertEmail, buildRequest, classify, emailState, endpoint, parseClassification, unwrapEmail } from "../src/lib/classify";
import { configFromEnv } from "../src/lib/env";
import { CATEGORIES, PRIORITIES, type Email } from "../src/lib/types";

const email: Email = {
  from: "a@student.edu",
  subject: "Extension",
  body: "Can I turn the problem set in on Wednesday?",
};

describe("emailState", () => {
  it("keeps a long body for Jev and clips it for Laya", () => {
    const long: Email = { ...email, body: "word ".repeat(2000) };
    const jev = emailState(long, "jev-latest");
    const laya = emailState(long, "laya");
    assert.equal(jev.truncated, false);
    assert.equal(laya.truncated, true);
    assert.ok(laya.state.length <= 1000);
    assert.ok(laya.state.includes("Extension"));
  });
});

describe("buildRequest", () => {
  it("asks for category, priority, and needs_human", () => {
    const { request } = buildRequest(email, "jev-latest");
    assert.equal(request.model, "jev-latest");
    assert.deepEqual(Object.keys(request.questions).sort(), ["category", "needs_human", "priority"]);
    const category = request.questions.category as { criteria: Record<string, string> };
    assert.deepEqual(Object.keys(category.criteria), [...CATEGORIES]);
    const priority = request.questions.priority as { criteria: string[] };
    assert.equal(priority.criteria.length, PRIORITIES.length);
  });
});

describe("parseClassification", () => {
  const response = {
    model: "jev-latest",
    answers: {
      category: {
        type: "choice" as const,
        choice: "grades",
        confidence: 0.8,
        probabilities: { grades: 0.8, advising: 0.2 },
      },
      priority: {
        type: "score" as const,
        score: 1.6,
        confidence: 0.6,
        probabilities: { "0": 0.05, "1": 0.1, "2": 0.7, "3": 0.15 },
      },
      needs_human: { type: "noul" as const, noul: 0.91 },
    },
  };

  it("uses the peak priority level rather than the rounded score", () => {
    const result = parseClassification(response, false);
    assert.equal(result.category, "grades");
    assert.equal(result.priority, "high");
    assert.equal(result.priority_probabilities.high, 0.7);
    assert.equal(result.needs_human, true);
    assert.equal(result.needs_human_probability, 0.91);
    assert.equal(result.truncated, false);
  });

  it("treats a low noul as staff-answerable", () => {
    const result = parseClassification(
      { ...response, answers: { ...response.answers, needs_human: { type: "noul", noul: 0.2 } } },
      true,
    );
    assert.equal(result.needs_human, false);
    assert.equal(result.truncated, true);
  });

  it("rejects a category outside the rubric", () => {
    assert.throws(
      () =>
        parseClassification(
          { ...response, answers: { ...response.answers, category: { ...response.answers.category, choice: "spam" } } },
          false,
        ),
      /unknown category/,
    );
  });
});

describe("classify", () => {
  it("posts the email to the System One endpoint", async () => {
    let seen = "";
    let auth = "";
    const fetchImpl: typeof fetch = async (url, init) => {
      seen = String(url);
      auth = new Headers(init?.headers).get("authorization") ?? "";
      const body = JSON.parse(String(init?.body));
      assert.equal(body.state.includes("Extension"), true);
      return new Response(
        JSON.stringify({
          model: "laya:en",
          answers: {
            category: { type: "choice", choice: "grades", confidence: 0.7, probabilities: { grades: 0.7 } },
            priority: { type: "score", score: 2, confidence: 0.5, probabilities: { "2": 1 } },
            needs_human: { type: "noul", noul: 0.66 },
          },
        }),
        { status: 200 },
      );
    };
    const result = await classify(email, { apiKey: "test-key", baseUrl: "http://localhost:11435", model: "laya" }, fetchImpl);
    assert.equal(seen, "http://localhost:11435/v1/systemone");
    assert.equal(auth, "Bearer test-key");
    assert.equal(result.model, "laya:en");
    assert.equal(result.category, "grades");
  });

  it("refuses to call without a key", async () => {
    await assert.rejects(() => classify(email, { apiKey: "  ", baseUrl: "https://api.typesafe.ai", model: "jev-latest" }), /TYPESAFE_API_KEY/);
  });
});

describe("config and email parsing", () => {
  it("reads the endpoint and model from the environment", () => {
    const config = configFromEnv({
      TYPESAFE_API_KEY: "abc",
      TYPESAFE_BASE_URL: "http://localhost:11435/",
      TYPESAFE_MODEL: "laya",
    });
    assert.equal(config.apiKey, "abc");
    assert.equal(endpoint(config.baseUrl), "http://localhost:11435/v1/systemone");
    assert.equal(config.model, "laya");
  });

  it("requires the three email fields", () => {
    assert.throws(() => assertEmail({ from: "a@b.c", subject: "Hi" }), /body/);
  });

  it("reads the email out of a fixture wrapper", () => {
    const parsed = unwrapEmail({ email, expect: { category: "grades" } });
    assert.equal(parsed.subject, "Extension");
  });
});
