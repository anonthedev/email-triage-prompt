import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { classificationKey, readClassification, writeClassification } from "../src/lib/cache";
import { applyMailView, type FilterableMail } from "../src/lib/filter";
import { emailFromGmail, htmlToText, type MimePart } from "../src/lib/gmail";
import { deleteGoogleToken, readGoogleToken, writeGoogleToken } from "../src/lib/google-tokens";
import { mapPool } from "../src/lib/pool";
import { isWeak, senderName } from "../src/lib/present";
import { loadSample } from "../src/lib/samples";
import { compareTriage, type SortableMail } from "../src/lib/sort";
import { classifyCached } from "../src/lib/triage";
import type { Classification, Config, Priority } from "../src/lib/types";

function encoded(text: string): MimePart {
  return { mimeType: "text/plain", body: { data: Buffer.from(text).toString("base64url") } };
}

function row(priority: Priority, needsHuman: boolean, date: string): SortableMail {
  return {
    email: { date },
    classification: { priority, needs_human: needsHuman },
  };
}

describe("compareTriage", () => {
  it("puts urgent and high first, then a person, then newer mail", () => {
    const rows: SortableMail[] = [
      row("normal", false, "Tue, 3 Mar 2026 09:00:00 -0500"),
      row("high", false, "Wed, 4 Mar 2026 09:00:00 -0500"),
      row("urgent", false, "Mon, 2 Mar 2026 09:00:00 -0500"),
      row("high", true, "Mon, 2 Mar 2026 09:00:00 -0500"),
      row("high", true, "Thu, 5 Mar 2026 09:00:00 -0500"),
      { email: { date: "Fri, 6 Mar 2026 09:00:00 -0500" } },
    ];
    const sorted = [...rows].sort(compareTriage);
    assert.deepEqual(
      sorted.map((item) => item.classification?.priority ?? "error"),
      ["urgent", "high", "high", "high", "normal", "error"],
    );
    assert.equal(sorted[1]?.email.date?.includes("5 Mar"), true);
    assert.equal(sorted[2]?.classification?.needs_human, true);
    assert.equal(sorted[3]?.classification?.needs_human, false);
  });
});

describe("gmail text", () => {
  it("prefers plain text and falls back to html, then the snippet", () => {
    const both = emailFromGmail({
      payload: {
        headers: [
          { name: "From", value: "Samira Khan <samira@student.edu>" },
          { name: "Subject", value: "Extension" },
          { name: "Date", value: "Mon, 2 Mar 2026 09:14:00 -0500" },
        ],
        parts: [
          encoded("Plain body"),
          { mimeType: "text/html", body: { data: Buffer.from("<p>Html body</p>").toString("base64url") } },
        ],
      },
    });
    assert.equal(both.body, "Plain body");
    assert.equal(both.from, "Samira Khan <samira@student.edu>");

    const htmlOnly = emailFromGmail({
      snippet: "snippet",
      payload: {
        headers: [{ name: "Subject", value: "Note" }],
        parts: [{ mimeType: "text/html; charset=UTF-8", body: { data: Buffer.from("<p>Hello&nbsp;there</p>").toString("base64url") } }],
      },
    });
    assert.equal(htmlOnly.body, "Hello there");
    assert.equal(htmlToText("<script>nope</script><p>Keep</p>"), "Keep");

    const snippet = emailFromGmail({ snippet: "Just a snippet", payload: { headers: [] } });
    assert.equal(snippet.body, "Just a snippet");
    assert.equal(snippet.from, "Unknown");
  });
});

describe("presentation", () => {
  it("names the sender and marks a confidence under 0.50 as weak", () => {
    assert.equal(senderName('"Khan, Samira" <a@b.c>'), "Khan, Samira");
    assert.equal(senderName("samira@student.edu"), "samira@student.edu");
    assert.equal(isWeak(0.49), true);
    assert.equal(isWeak(0.5), false);
  });
});

describe("classification cache", () => {
  it("reuses a result for the same message and model", async () => {
    const root = mkdtempSync(join(tmpdir(), "triage-cache-"));
    const email = { from: "a@b.c", subject: "Hi", body: "Hello there" };
    const config: Config = { apiKey: "k", baseUrl: "http://example.test", model: "jev-latest" };
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          model: "jev-latest",
          answers: {
            category: { type: "choice", choice: "fyi", confidence: 0.4, probabilities: { fyi: 0.4 } },
            priority: { type: "score", score: 0, confidence: 0.2, probabilities: { "0": 0.8 } },
            needs_human: { type: "noul", noul: 0.1 },
          },
        }),
        { status: 200 },
      );
    };
    const first = await classifyCached("msg-1", email, config, fetchImpl, root);
    const second = await classifyCached("msg-1", email, config, fetchImpl, root);
    assert.equal(calls, 1);
    assert.equal(second.category, first.category);
    assert.equal(first.category_confidence < 0.5, true);
    await classifyCached("msg-1", email, { ...config, model: "laya" }, fetchImpl, root);
    assert.equal(calls, 2);
    const key = classificationKey("msg-1", email, "jev-latest");
    const stored = readClassification(key, root);
    assert.equal(stored?.category, "fyi");
    rmSync(root, { recursive: true, force: true });
  });

  it("writes a classification file the process can read back", () => {
    const root = mkdtempSync(join(tmpdir(), "triage-file-"));
    const value = { category: "fyi" } as Classification;
    writeClassification("abc", value, root);
    assert.deepEqual(readdirSync(root), ["abc.json"]);
    rmSync(root, { recursive: true, force: true });
  });
});

describe("google token file", () => {
  it("stores only the access token under a safe file name", () => {
    const dir = mkdtempSync(join(tmpdir(), "triage-google-"));
    writeGoogleToken("../escaped", { accessToken: "token-a", expiresAt: 10 }, dir);
    assert.deepEqual(readGoogleToken("../escaped", dir), { accessToken: "token-a", expiresAt: 10 });
    assert.deepEqual(readdirSync(dir), ["___escaped.json"]);
    deleteGoogleToken("../escaped", dir);
    assert.equal(readGoogleToken("../escaped", dir), undefined);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("mapPool", () => {
  it("keeps result order while running a few at a time", async () => {
    const results = await mapPool([1, 2, 3, 4], 2, async (value) => {
      await new Promise((resolve) => setTimeout(resolve, value === 1 ? 20 : 0));
      return value * 2;
    });
    assert.deepEqual(results, [2, 4, 6, 8]);
  });
});

function mail(category: string, categoryConfidence: number, priority: Priority, priorityConfidence: number, needsHuman: boolean, date: string): FilterableMail {
  return {
    email: { date },
    classification: {
      category,
      category_confidence: categoryConfidence,
      priority,
      priority_confidence: priorityConfidence,
      needs_human: needsHuman,
    },
  };
}

describe("applyMailView", () => {
  const rows = [
    mail("urgent", 0.34, "urgent", 0.3, false, "Mon, 2 Mar 2026 09:00:00 -0500"),
    mail("grades", 0.9, "high", 0.8, true, "Wed, 4 Mar 2026 09:00:00 -0500"),
    mail("fyi", 0.95, "low", 0.9, false, "Thu, 5 Mar 2026 09:00:00 -0500"),
  ];

  it("keeps weak staff-answerable mail and can sort by least sure", () => {
    const weak = applyMailView(rows, { category: "", priority: "", decision: "staff", weakOnly: true, sort: "least-sure" });
    assert.equal(weak.length, 1);
    assert.equal(weak[0]?.classification?.category, "urgent");
    const bySure = applyMailView(rows, { category: "", priority: "", decision: "", weakOnly: false, sort: "least-sure" });
    assert.deepEqual(
      bySure.map((row) => row.classification?.category),
      ["urgent", "grades", "fyi"],
    );
  });
});

describe("samples", () => {
  it("refuses a path outside the fixture names", () => {
    assert.equal(loadSample("../extension"), undefined);
    assert.equal(loadSample("extension")?.email.subject.includes("problem set"), true);
  });
});
