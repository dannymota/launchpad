"use client";

import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { useState } from "react";
import { browserApi, errorMessage } from "@/lib/api-client";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await browserApi().account.delete({ confirm: "delete my account" });
      window.location.assign("/");
    } catch (cause) {
      setBusy(false);
      setOpen(false);
      setError(errorMessage(cause));
    }
  };

  return (
    <VStack gap={3}>
      {error && <Banner status="error" title={error} />}
      <HStack>
        <Button label="Delete account" variant="destructive" onClick={() => setOpen(true)} />
      </HStack>
      <AlertDialog
        isOpen={open}
        onOpenChange={setOpen}
        title="Delete your account?"
        description="Your account and everything in it are removed for good. This cannot be undone."
        actionLabel="Delete account"
        onAction={remove}
        isActionLoading={busy}
      />
    </VStack>
  );
}
