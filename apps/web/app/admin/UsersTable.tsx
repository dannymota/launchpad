"use client";

import type { AdminUser } from "@app/shared";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { browserApi, errorMessage } from "@/lib/api-client";

interface Row extends Record<string, unknown>, AdminUser {}

export function UsersTable({ initial, initialNext }: { initial: AdminUser[]; initialNext: string | null }) {
  const [users, setUsers] = useState<Row[]>(initial);
  const [next, setNext] = useState(initialNext);
  const [error, setError] = useState<string | null>(null);

  const attempt = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const setBanned = (user: Row, banned: boolean) =>
    attempt(async () => {
      await browserApi().admin.users.setBanned({ userId: user.id, banned });
      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, banned } : item)));
    });

  const loadMore = () =>
    attempt(async () => {
      if (!next) return;
      const page = await browserApi().admin.users.list({ limit: 50, before: next });
      setUsers((current) => [...current, ...page.users]);
      setNext(page.next);
    });

  if (users.length === 0) {
    return (
      <EmptyState
        headingLevel={2}
        title="No accounts yet"
        description="People appear here the first time they sign in."
      />
    );
  }

  return (
    <VStack gap={4}>
      {error && <Banner status="error" title={error} />}
      <Table<Row>
        data={users}
        idKey="id"
        hasHover
        columns={[
          { key: "email", header: "Email" },
          {
            key: "createdAt",
            header: "Joined",
            renderCell: (user) => new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" }),
          },
          {
            key: "banned",
            header: "Status",
            renderCell: (user) => (
              <HStack gap={2} vAlign="center">
                <StatusDot variant={user.banned ? "error" : "success"} label={user.banned ? "Banned" : "Active"} />
                <Text>{user.banned ? "Banned" : "Active"}</Text>
              </HStack>
            ),
          },
          {
            key: "id",
            header: "",
            align: "end",
            renderCell: (user) =>
              user.banned ? (
                <Button label="Unban" size="sm" clickAction={() => setBanned(user, false)} />
              ) : (
                <Button label="Ban" size="sm" variant="destructive" clickAction={() => setBanned(user, true)} />
              ),
          },
        ]}
      />
      {next && (
        <HStack>
          <Button label="Load more" clickAction={loadMore} />
        </HStack>
      )}
    </VStack>
  );
}
