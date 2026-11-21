import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatEval, type EvalRow } from "../src/eval";

const row: EvalRow = {
  file: "collaborator.json",
  mark: "ok",
  category: "research",
  categoryConfidence: 1,
  priority: "normal",
  priorityConfidence: 0.8,
  needsHuman: false,
  needsHumanProbability: 0.09,
  expectedCategory: "research",
  expectedPriority: "normal",
  expectedNeedsHuman: false,
};

describe("formatEval", () => {
  it("names confidence and the needs-a-person probability separately", () => {
    const text = formatEval([row]);
    assert.match(text, /cat conf/);
    assert.match(text, /pri conf/);
    assert.match(text, /p\(decides\)/);
    assert.match(text, /collaborator\.json\s+ok\s+research\s+1\.00\s+normal\s+0\.80\s+no\s+0\.09/);
    assert.doesNotMatch(text, /expected collaborator/);
  });

  it("prints the expected labels only on a miss", () => {
    const text = formatEval([{ ...row, file: "regrade.json", mark: "miss", expectedPriority: "high" }]);
    assert.match(text, /expected regrade\.json: research \/ high \/ needs person no/);
  });
});
