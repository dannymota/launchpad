// Accounts, for admins. Internal in every preset: Cloudflare Access is in front of /admin,
// and only an Access-verified email in ADMIN_EMAILS gets past the Worker's router.
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Heading } from "@astryxdesign/core/Text";
import type { Metadata } from "next";
import { api } from "@/lib/server";
import { UsersTable } from "./UsersTable";

export const metadata: Metadata = { title: "Accounts", robots: { index: false } };

export default async function AdminPage() {
  const first = await api().admin.users.list({ limit: 50 });
  return (
    <Layout
      header={
        <LayoutHeader hasDivider>
          <Heading level={1}>Accounts</Heading>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={4}>
          <UsersTable initial={first.users} initialNext={first.next} />
        </LayoutContent>
      }
    />
  );
}
