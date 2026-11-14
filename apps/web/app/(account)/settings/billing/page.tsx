// Plan and billing (payments module). Checkout and the billing portal are Stripe's own pages;
// this page shows the plans from the product config and which one the person is on.
import { health, productOf } from "@app/backend";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { Metadata } from "next";
import { api, getEnv, requireUser } from "@/lib/server";
import { PlanAction } from "./PlanAction";

export const metadata: Metadata = { title: "Plan and billing" };

export default async function BillingPage() {
  await requireUser("/settings/billing");
  const env = getEnv();
  const plans = productOf(env).plans ?? [];
  const selling = health(env).modules.payments === "on";
  const current = await api().billing.current();

  return (
    <Layout
      height="fill"
      contentWidth={1440}
      header={
        <LayoutHeader hasDivider>
          <HStack vAlign="center">
            <StackItem size="fill">
              <Heading level={1}>Plan and billing</Heading>
            </StackItem>
            <Button label="Back to settings" href="/settings" />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={4}>
          <VStack gap={4}>
            {!selling && (
              <Banner
                status="info"
                title="Paid plans aren't on sale yet"
                description="Everyone is on the free plan until payments are set up."
              />
            )}
            {current.endsAtPeriodEnd && (
              <Banner status="warning" title="Your plan ends at the end of this billing period" />
            )}
            <List hasDividers>
              {plans.map((plan) => (
                <ListItem
                  key={plan.id}
                  label={`${plan.name} · ${plan.price}`}
                  description={
                    <Text type="supporting" color="secondary">
                      {plan.includes.join(" · ")}
                    </Text>
                  }
                  endContent={
                    <PlanAction
                      planId={plan.id}
                      isCurrent={plan.id === current.plan}
                      isPaid={plan.paid}
                      onPaidPlan={current.status !== "none"}
                      canBuy={selling}
                    />
                  }
                />
              ))}
            </List>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
