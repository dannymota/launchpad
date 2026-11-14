"use client";

import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { authClient } from "@/lib/auth-client";

const HERE = "/settings/billing";

/** What a person can do with one plan row: nothing if it is theirs, buy it, or manage what they have. */
export function PlanAction(props: {
  planId: string;
  isCurrent: boolean;
  isPaid: boolean;
  /** True when the person has a paid plan, so changes go through Stripe's billing portal. */
  onPaidPlan: boolean;
  canBuy: boolean;
}) {
  if (props.isCurrent && !props.onPaidPlan) return <Text color="secondary">Your plan</Text>;
  if (props.onPaidPlan) {
    // Upgrades, downgrades, cancelling and invoices all live in Stripe's portal.
    return props.isCurrent ? (
      <Button
        label="Manage billing"
        size="sm"
        clickAction={async () => {
          await authClient.subscription.billingPortal({ returnUrl: HERE });
        }}
      />
    ) : null;
  }
  if (!props.isPaid) return null;
  return (
    <Button
      label="Upgrade"
      size="sm"
      variant="primary"
      isDisabled={!props.canBuy}
      clickAction={async () => {
        await authClient.subscription.upgrade({ plan: props.planId, successUrl: HERE, cancelUrl: HERE });
      }}
    />
  );
}
