import { readFileSync } from "node:fs";
import { classify, unwrapEmail } from "./lib/classify";
import { configFromEnv, loadDotEnv } from "./lib/env";

const help = `Classify one faculty or office email.

  npm run triage -- fixtures/extension.json
  npm run triage -- -          JSON object on stdin
  npm run dev                  inbox at http://localhost:3000

A bare email needs "from", "subject", and "body". A fixture file with an "email" field is fine too.
Copy .env.example to .env and set TYPESAFE_API_KEY and TYPESAFE_MODEL.
`;

async function readEmail(source: string): Promise<unknown> {
  const text = source === "-" ? await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  }) : readFileSync(source, "utf8");
  return JSON.parse(text);
}

async function main(): Promise<void> {
  const source = process.argv[2];
  if (!source || source === "--help" || source === "-h") {
    process.stdout.write(help);
    return;
  }
  loadDotEnv();
  const email = unwrapEmail(await readEmail(source));
  const result = await classify(email, configFromEnv());
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
