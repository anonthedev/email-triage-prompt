import { notFound } from "next/navigation";
import { AccessProblem } from "@/components/access-problem";
import { MailDetail } from "@/components/mail-detail";
import { readConfig } from "@/lib/env";
import { loadSample } from "@/lib/samples";
import { classifyMail } from "@/lib/triage";

export default async function SampleMessagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sample = loadSample(id);
  if (!sample) notFound();
  const configured = readConfig();
  if (!configured.ok) return <AccessProblem title="Sample" message={configured.error} />;
  const mail = await classifyMail(sample.id, sample.email, configured.config, `/sample/${sample.id}`);
  return <MailDetail mail={mail} backHref="/" backLabel="Sample" />;
}
