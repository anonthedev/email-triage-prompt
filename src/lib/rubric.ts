import { CATEGORIES, PRIORITIES } from "./types";

/** Probability at or above this means a person should decide the outcome. */
export const NEEDS_HUMAN_AT = 0.5;

/**
 * Laya's open checkpoints keep roughly 320 tokens of state after the questions.
 * Jev accepts a full email. Caps are in characters, under those budgets.
 */
const LAYA_STATE_CHARS = 1000;
const JEV_STATE_CHARS = 24_000;

export function stateBudget(model: string): number {
  return /laya/i.test(model) ? LAYA_STATE_CHARS : JEV_STATE_CHARS;
}

export function questions(): Record<string, unknown> {
  return {
    category: {
      type: "choice",
      instructions:
        "This message was sent to faculty or office staff. Which kind of mail is it?",
      criteria: {
        advising: "Student asks for course, degree, or recommendation advice.",
        grades: "Grade, extension, missing work, regrade, exam, or academic integrity.",
        scheduling: "The ask is to set, move, or confirm a time to meet.",
        admin: "Department, HR, payroll, facilities, compliance, or paperwork.",
        research: "A paper, grant, lab, review, or collaborator. Not a student grade.",
        vendor: "A sales pitch, recruiter, or marketing message.",
        fyi: "Newsletter or announcement. Nobody is waiting on a reply.",
        urgent: "Distress, safety, or a person blocked by a deadline today.",
      },
    },
    priority: {
      type: "score",
      instructions: "How soon does faculty or office staff need to deal with this message?",
      criteria: [
        "Newsletter or noise. Nobody is waiting on an answer.",
        "Ordinary mail, including a meeting ask that offers another day. A reply can wait a few days.",
        "Work or a decision is stuck until you answer, and it can wait later this week but not past it.",
        "Answer today. Someone is blocked today, a meeting is today, or a person may be in distress.",
      ],
    },
    needs_human: {
      type: "noul",
      instructions: "Must a person decide the outcome, rather than only send an acknowledgement?",
      criteria: {
        true: "Yes for an extension, a regrade, a grade change, a recommendation letter, money, conduct, or someone in distress. The yes or no is the decision.",
        false: "No for picking a meeting time, reading a newsletter, declining a sales pitch, or filing ordinary paperwork.",
      },
    },
  };
}

export function isCategory(value: string): value is (typeof CATEGORIES)[number] {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function isPriority(value: string): value is (typeof PRIORITIES)[number] {
  return (PRIORITIES as readonly string[]).includes(value);
}
