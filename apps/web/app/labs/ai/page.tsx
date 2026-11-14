// The AI module's example (Astryx template: ai-chat-landing): one question, one streamed
// answer, counted against the month's budget. It lives under /labs, so it is internal in
// every preset. Copy what you need into the product and delete this page.
import type { Metadata } from "next";
import { api } from "@/lib/server";
import { Assistant } from "./Assistant";

export const metadata: Metadata = { title: "Ask the assistant", robots: { index: false } };

export default async function LabsAiPage() {
  return <Assistant budget={await api().ai.budget()} />;
}
