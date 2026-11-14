"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { ChatComposer, ChatMessage, ChatMessageBubble } from "@astryxdesign/core/Chat";
import { useStreamingText } from "@astryxdesign/core/hooks";
import { Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { useRef, useState } from "react";
import { browserApi, errorMessage } from "@/lib/api-client";

interface Budget {
  on: boolean;
  usedUsd: number;
  limitUsd: number;
  open: boolean;
}

/** Why an answer ended some way other than complete, in words for the person asking. */
const ENDINGS = {
  cut_short: "The answer hit the length limit and stops early.",
  refused: "The model declined to answer that.",
  failed: "The model could not be reached. Try again.",
} as const;

const dollars = (amount: number) => `$${amount.toFixed(2)}`;

export function Assistant(props: { budget: Budget }) {
  const [budget, setBudget] = useState(props.budget);
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // Bumped when the person stops an answer, so a late piece of it is not shown.
  const run = useRef(0);
  const shown = useStreamingText(answer, streaming);

  const ask = async (prompt: string) => {
    run.current += 1;
    const id = run.current;
    setQuestion(prompt);
    setAnswer("");
    setNote(null);
    setStreaming(true);
    try {
      for await (const event of await browserApi().ai.ask({ prompt })) {
        if (run.current !== id) return;
        if (event.type === "text") setAnswer((text) => text + event.text);
        else if (event.outcome !== "complete") {
          // A refusal can arrive after part of an answer; that part is not to be kept.
          if (event.outcome === "refused") setAnswer("");
          setNote(ENDINGS[event.outcome]);
        }
      }
    } catch (error) {
      if (run.current === id) setNote(errorMessage(error));
    } finally {
      if (run.current === id) setStreaming(false);
      browserApi()
        .ai.budget()
        .then(setBudget, () => undefined);
    }
  };

  const stop = () => {
    run.current += 1;
    setStreaming(false);
  };

  return (
    <Layout
      height="fill"
      contentWidth={720}
      padding={6}
      content={
        <LayoutContent>
          <VStack gap={8} vAlign="center" minHeight="100%">
            <VStack gap={1}>
              <Text type="display-2" as="p">
                Ask the assistant
              </Text>
              <Text type="supporting" color="secondary">
                {budget.on
                  ? `You have used ${dollars(budget.usedUsd)} of ${dollars(budget.limitUsd)} this month.`
                  : "Set ANTHROPIC_API_KEY to turn this on."}
              </Text>
            </VStack>

            {!budget.on && (
              <Banner
                status="info"
                title="AI is not set up yet"
                description="Add the key as a Worker secret (npm run setup asks for it), then reload."
              />
            )}
            {budget.on && !budget.open && !streaming && (
              <Banner
                status="warning"
                title="Not enough of this month's AI budget is left for another question"
                description="It resets on the 1st."
              />
            )}

            {question && (
              <VStack gap={4}>
                <ChatMessage sender="user">
                  <ChatMessageBubble>{question}</ChatMessageBubble>
                </ChatMessage>
                {(shown || streaming) && (
                  <ChatMessage sender="assistant">
                    <ChatMessageBubble>{shown || "…"}</ChatMessageBubble>
                  </ChatMessage>
                )}
                {note && <Banner status="warning" title={note} />}
              </VStack>
            )}

            <ChatComposer
              onSubmit={ask}
              onStop={stop}
              isStopShown={streaming}
              isDisabled={!budget.on || (!budget.open && !streaming)}
              placeholder="Ask anything"
            />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
