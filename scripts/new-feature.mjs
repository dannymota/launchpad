#!/usr/bin/env node
// Scaffolds one working slice of the product, so a feature starts from code that runs and
// is tested, and only its substance is left to write:
//
//   npm run new:feature -- note            a "notes" feature
//   npm run new:feature -- category --plural categories
//
// It writes a table (and its migration), list / create / remove procedures in the API
// contract with their implementation, a Workers-runtime test and a page at /app/<plural>.
// With the mobile app, it writes a screen there too.
// Each person sees only their own rows and keeps a limited number of them, and deleting the
// account deletes them. Reshape it from there: rename the title, add fields, change the page.
// The migration is for the table as scaffolded, so that the slice runs at once. When the
// table has its real fields, `npm run db:redo` replaces it with one for the table as shaped.
// To offer it to assistants, list its procedures in apps/mcp/servers/main/scopes.ts.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** The line in the contract and in the router that new features are added above. */
export const ANCHOR = "// New features go above this line: `npm run new:feature` adds them here.";

export function names(single, given) {
  const oneWord = (word) => {
    if (!/^[a-z][a-z0-9]{1,30}$/.test(word)) throw new Error(`"${word}" must be one lowercase word, like "note".`);
  };
  oneWord(single);
  // The plural is the name with an "s" added, so a name that is plural already would get two.
  if (given === undefined && single.endsWith("s")) {
    throw new Error(
      `"${single}" ends in "s", so its plural would be "${single}s". Name the feature in the singular (note, not notes). If "${single}" is the singular, as "status" is, say its plural too: npm run new:feature -- ${single} --plural <its plural>`,
    );
  }
  const plural = given ?? `${single}s`;
  oneWord(plural);
  if (single === plural) throw new Error("The plural must differ from the singular. Pass --plural.");
  const cap = (word) => word[0].toUpperCase() + word.slice(1);
  return { single, plural, Single: cap(single), Plural: cap(plural), PLURAL: plural.toUpperCase() };
}

/** Every file the feature adds: path → contents. */
export function files({ single, plural, Single, Plural, PLURAL }) {
  const out = {};

  out[`packages/backend/src/db/schema/${plural}.ts`] = `import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { auth_user } from "./auth";

/** A person's ${plural}. Deleting the account deletes them. */
export const ${plural} = sqliteTable(
  "${plural}",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => auth_user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    created_at: integer("created_at", { mode: "timestamp_ms" })
      .default(sql\`(cast(unixepoch('subsecond') * 1000 as integer))\`)
      .notNull(),
  },
  (table) => [index("${plural}_user_id_idx").on(table.user_id)],
);
`;

  out[`packages/shared/src/schemas/${plural}.ts`] = `import * as z from "zod";

/** The most ${plural} one account keeps. One more is refused until one is deleted. */
export const MOST_${PLURAL} = 200;

export const ${Single}Schema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.iso.datetime(),
});
export type ${Single} = z.infer<typeof ${Single}Schema>;
`;

  out[`packages/backend/src/features/${plural}.ts`] =
    `// ${Plural}: each belongs to one account, and every query here is scoped to that account.
import { MOST_${PLURAL} } from "@app/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { UserError } from "../core/errors";
import { getDb, schema } from "../db/client";
import type { Env } from "../env";

const table = schema.${plural};

const shown = (row: typeof table.$inferSelect) => ({
  id: row.id,
  title: row.title,
  createdAt: row.created_at.toISOString(),
});

/** The person's ${plural}, newest first. */
export async function list${Plural}(env: Env, userId: string) {
  const rows = await getDb(env)
    .select()
    .from(table)
    .where(eq(table.user_id, userId))
    .orderBy(desc(table.created_at))
    .limit(MOST_${PLURAL});
  return rows.map(shown);
}

/**
 * Adds one, unless the person keeps as many as they may already. The count and the insert
 * are one statement, so two requests cannot both take the last place.
 */
export async function create${Single}(env: Env, userId: string, title: string) {
  const db = getDb(env);
  const id = crypto.randomUUID();
  const kept = sql\`(select count(*) from \${table} where \${table.user_id} = \${userId})\`;
  const written = await db.all<{ id: string }>(sql\`
    insert into \${table} (id, user_id, title)
    select \${id}, \${userId}, \${title}
    where \${kept} < \${MOST_${PLURAL}}
    returning id\`);
  if (written.length === 0) {
    throw new UserError(409, "${plural}_full", \`You can keep \${MOST_${PLURAL}} ${plural}. Delete one to add another.\`);
  }
  const [row] = await db.select().from(table).where(eq(table.id, id));
  if (!row) throw new Error("The ${single} was not saved.");
  return shown(row);
}

/** Deletes one of the person's own ${plural}. An id that is not theirs changes nothing. */
export async function remove${Single}(env: Env, userId: string, id: string): Promise<void> {
  await getDb(env).delete(table).where(and(eq(table.id, id), eq(table.user_id, userId)));
}
`;

  out[`apps/web/tests/${plural}.workers.test.ts`] =
    `// ${Plural}, on the Workers runtime: a person works with their own, and nobody else's.
import { MOST_${PLURAL} } from "@app/shared";
import { beforeAll, describe, expect, it } from "vitest";
import { Browser, env, migrate, signIn } from "./harness";

beforeAll(migrate);

const list = async (browser: Browser) =>
  ((await (await browser.fetch("/api/${plural}")).json()) as { ${plural}: { id: string; title: string }[] }).${plural};

describe("${plural}", () => {
  it("need a signed-in person", async () => {
    expect((await new Browser().fetch("/api/${plural}")).status).toBe(401);
    expect((await new Browser().post("/api/${plural}", { title: "x" })).status).toBe(401);
    expect((await new Browser().post("/api/${plural}/remove", { id: "x" })).status).toBe(401);
  });

  it("are added, listed newest first, and removed", async () => {
    const { browser } = await signIn("${plural}-owner@example.com");
    expect(await list(browser)).toEqual([]);
    const first = (await (await browser.post("/api/${plural}", { title: "First" })).json()) as { id: string };
    await browser.post("/api/${plural}", { title: "  Second  " });
    expect((await list(browser)).map((item) => item.title)).toEqual(["Second", "First"]);
    expect((await browser.post("/api/${plural}/remove", { id: first.id })).status).toBe(200);
    expect((await list(browser)).map((item) => item.title)).toEqual(["Second"]);
  });

  it("refuse an empty or overlong title", async () => {
    const { browser } = await signIn("${plural}-careless@example.com");
    expect((await browser.post("/api/${plural}", { title: "   " })).status).toBe(400);
    expect((await browser.post("/api/${plural}", { title: "x".repeat(201) })).status).toBe(400);
    expect(await list(browser)).toEqual([]);
  });

  it("stop at the most one person may keep, and two requests cannot both take the last place", async () => {
    const { browser, userId } = await signIn("${plural}-full@example.com");
    // One short of the limit, written straight to the table.
    await env.DB.prepare(
      "with recursive n(i) as (select 1 union all select i + 1 from n where i < ?1) insert into ${plural} (id, user_id, title) select ?2 || '-' || i, ?2, 'Seeded ' || i from n",
    )
      .bind(MOST_${PLURAL} - 1, userId)
      .run();
    const answers = await Promise.all(["Last", "One too many"].map((title) => browser.post("/api/${plural}", { title })));
    expect(answers.map((answer) => answer.status).sort()).toEqual([200, 409]);
    const refused = answers.find((answer) => answer.status === 409);
    // The answer says what to do, and carries a code a client can act on.
    expect(await refused?.json()).toMatchObject({
      message: expect.stringContaining("Delete one"),
      data: { reason: "${plural}_full" },
    });
    expect(await list(browser)).toHaveLength(MOST_${PLURAL});
    // Deleting one makes room again.
    const [newest] = await list(browser);
    await browser.post("/api/${plural}/remove", { id: newest?.id });
    expect((await browser.post("/api/${plural}", { title: "Room again" })).status).toBe(200);
  });

  it("belong to one account: another person cannot see or remove them", async () => {
    const mine = await signIn("${plural}-mine@example.com");
    const theirs = await signIn("${plural}-theirs@example.com");
    const created = (await (await mine.browser.post("/api/${plural}", { title: "Private" })).json()) as { id: string };
    expect(await list(theirs.browser)).toEqual([]);
    expect((await theirs.browser.post("/api/${plural}/remove", { id: created.id })).status).toBe(200);
    expect((await list(mine.browser)).map((item) => item.title)).toEqual(["Private"]);
  });

  it("go when the account is deleted", async () => {
    const { browser, userId } = await signIn("${plural}-leaving@example.com");
    await browser.post("/api/${plural}", { title: "Gone soon" });
    expect((await browser.post("/api/account/delete", { confirm: "delete my account" })).status).toBe(200);
    const left = await env.DB.prepare("select count(*) as n from ${plural} where user_id = ?").bind(userId).first<{ n: number }>();
    expect(left?.n).toBe(0);
  });
});
`;

  out[`apps/web/app/(app)/app/${plural}/page.tsx`] =
    `// ${Plural} (Astryx template: blank). Scaffolded by \`npm run new:feature\`: keep the frame, and
// reshape what is inside it for the product.
import { Button } from "@astryxdesign/core/Button";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem } from "@astryxdesign/core/Layout";
import { Heading } from "@astryxdesign/core/Text";
import type { Metadata } from "next";
import { api, requireUser } from "@/lib/server";
import { ${Single}Rows } from "./${Single}Rows";

export const metadata: Metadata = { title: "${Plural}" };

export default async function ${Plural}Page() {
  await requireUser("/app/${plural}");
  const { ${plural} } = await api().${plural}.list();

  return (
    <Layout
      height="fill"
      contentWidth={720}
      header={
        <LayoutHeader hasDivider>
          <HStack vAlign="center">
            <StackItem size="fill">
              <Heading level={1}>${Plural}</Heading>
            </StackItem>
            <Button label="Home" href="/app" />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={4}>
          <${Single}Rows initial={${plural}} />
        </LayoutContent>
      }
    />
  );
}
`;

  out[`apps/web/app/(app)/app/${plural}/${Single}Rows.tsx`] = `"use client";

import type { ${Single} } from "@app/shared";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { useAnnounce } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useEffect, useRef, useState } from "react";
import { browserApi, errorMessage } from "@/lib/api-client";
import { useEarlyInput } from "@/lib/early-input";

// One locale and one time zone, so the server and the browser write the same date. A product sets its own.
const day = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

export function ${Single}Rows({ initial }: { initial: ${Single}[] }) {
  const [items, setItems] = useState(initial);
  const [title, setTitle] = useState("");
  const titleField = useEarlyInput(setTitle);
  const [error, setError] = useState<string | null>(null);
  // Deleting asks first. The one asked about stays set while the question closes, so its words do not change.
  const [asked, setAsked] = useState<${Single} | null>(null);
  const [asking, setAsking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const announce = useAnnounce();
  // A deleted row takes its button with it, and the keyboard's place. So the keyboard is sent
  // to the row that moved up, or to the field when no row is left.
  const deleteButtons = useRef(new Map<string, HTMLButtonElement>());
  const [focusAfter, setFocusAfter] = useState<string | null>(null);
  useEffect(() => {
    if (focusAfter === null || asking) return;
    (deleteButtons.current.get(focusAfter) ?? titleField.current)?.focus();
    setFocusAfter(null);
  }, [focusAfter, asking, titleField]);

  const add = async () => {
    if (!title.trim()) return;
    setError(null);
    try {
      const created = await browserApi().${plural}.create({ title });
      setItems((current) => [created, ...current]);
      setTitle("");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const remove = async () => {
    if (!asked) return;
    setDeleting(true);
    setError(null);
    try {
      await browserApi().${plural}.remove({ id: asked.id });
      const at = items.findIndex((item) => item.id === asked.id);
      setFocusAfter((items[at + 1] ?? items[at - 1])?.id ?? "");
      setItems((current) => current.filter((item) => item.id !== asked.id));
      announce(\`\${asked.title} was deleted.\`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setDeleting(false);
      setAsking(false);
    }
  };

  return (
    <VStack gap={6}>
      <VStack gap={4}>
        {error && <Banner status="error" title={error} />}
        <HStack gap={2} vAlign="end">
          <StackItem size="fill">
            <TextInput
              ref={titleField}
              label="New ${single}"
              value={title}
              onChange={setTitle}
              onEnter={() => void add()}
            />
          </StackItem>
          <Button label="Add" variant="primary" clickAction={add} />
        </HStack>
      </VStack>
      <VStack gap={2}>
        {/* A section under the page title: sized as a third-level heading, second in the outline (.claude/rules/web.md, "Headings"). */}
        <Heading level={3} accessibilityLevel={2}>
          Your ${plural}
        </Heading>
        {items.length === 0 ? (
          <EmptyState title="No ${plural}" description="Add one with the field above." />
        ) : (
          <List hasDividers>
            {items.map((item) => (
              <ListItem
                key={item.id}
                // A title wraps, and a word longer than the row breaks, so no title makes the page wider than a phone.
                label={<Text>{item.title}</Text>}
                description={day.format(new Date(item.createdAt))}
                endContent={
                  <Button
                    ref={(button) => {
                      if (button) deleteButtons.current.set(item.id, button);
                      else deleteButtons.current.delete(item.id);
                    }}
                    // Read out with the title, so each Delete says which row it is for.
                    label={\`Delete \${item.title}\`}
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAsked(item);
                      setAsking(true);
                    }}
                  >
                    Delete
                  </Button>
                }
              />
            ))}
          </List>
        )}
      </VStack>
      <AlertDialog
        isOpen={asking}
        onOpenChange={(open) => {
          if (!deleting) setAsking(open);
        }}
        title="Delete this ${single}?"
        description={\`"\${asked?.title ?? ""}" is deleted for good. This cannot be undone.\`}
        actionLabel="Delete ${single}"
        onAction={remove}
        isActionLoading={deleting}
      />
    </VStack>
  );
}
`;

  if (existsSync(join(ROOT, "apps/mobile/src/app/(app)"))) {
    out[`apps/mobile/src/app/(app)/${plural}.tsx`] =
      `// ${Plural}. Scaffolded by \`npm run new:feature\`: it lists what the API returns and shows
// every state the call can be in. Give the tab a title and an icon in ./_layout.tsx.
import type { ${Single} } from "@app/shared";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Row, Rows } from "@/components/Rows";
import { Screen } from "@/components/Screen";
import { api, errorMessage } from "@/lib/api";
import { useTheme } from "@/theme";

type State = { status: "loading" } | { status: "ready"; items: ${Single}[] } | { status: "failed"; message: string };

export default function ${Plural}() {
  const theme = useTheme();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "ready", items: (await api.${plural}.list()).${plural} });
    } catch (error) {
      setState({ status: "failed", message: errorMessage(error) });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      {state.status === "loading" ? <ActivityIndicator color={theme.color.accent} /> : null}
      {state.status === "ready" && state.items.length === 0 ? (
        <Text style={{ color: theme.color.textSecondary, fontSize: theme.bodySize }}>No ${plural} yet.</Text>
      ) : null}
      {state.status === "ready" && state.items.length > 0 ? (
        <Rows title="${Plural}">
          {state.items.map((item, index) => (
            <Row
              key={item.id}
              label={item.title}
              value={new Date(item.createdAt).toLocaleDateString()}
              last={index === state.items.length - 1}
            />
          ))}
        </Rows>
      ) : null}
      {state.status === "failed" ? (
        <View style={{ gap: theme.space(3) }}>
          <Text style={{ color: theme.color.danger, fontSize: theme.bodySize }}>{state.message}</Text>
          <Button label="Try again" variant="secondary" onPress={() => void load()} />
        </View>
      ) : null}
    </Screen>
  );
}
`;
  }
  return out;
}

/** Lines added to files that exist already: path → [text to find, what to put before it]. */
export function insertions({ single, plural, Single, Plural, PLURAL }) {
  const contract = `  ${plural}: {
    list: oc
      .meta(
        openapi({
          method: "GET",
          path: "/${plural}",
          operationId: "list${Plural}",
          summary: "List my ${plural}",
          description: "Returns this account's ${plural}, newest first.",
        }),
      )
      .output(z.object({ ${plural}: z.array(${Single}Schema) })),
    create: oc
      .meta(
        openapi({
          method: "POST",
          path: "/${plural}",
          operationId: "create${Single}",
          summary: "Add a ${single}",
          description: \`Adds a ${single} to this account and returns it. An account keeps at most \${MOST_${PLURAL}}: one more is refused until one is deleted.\`,
        }),
      )
      .input(z.object({ title: z.string().trim().min(1).max(200) }))
      .output(${Single}Schema),
    remove: oc
      .meta(
        openapi({
          method: "POST",
          path: "/${plural}/remove",
          operationId: "remove${Single}",
          summary: "Delete a ${single}",
          description: "Deletes one of this account's ${plural} by id. Cannot be undone.",
        }),
      )
      .input(z.object({ id: z.string().min(1).max(200) }))
      .output(OkSchema),
  },
`;
  const router = `  ${plural}: {
    list: os.${plural}.list.use(signedIn).handler(async ({ context }) => ({
      ${plural}: await list${Plural}(context.env, context.principal.userId),
    })),
    // userErrors turns a rule's refusal (a UserError) into the API error with its status and message.
    create: os.${plural}.create
      .use(signedIn)
      .handler(({ context, input }) =>
        userErrors(() => create${Single}(context.env, context.principal.userId, input.title)),
      ),
    remove: os.${plural}.remove.use(signedIn).handler(async ({ context, input }) => {
      await remove${Single}(context.env, context.principal.userId, input.id);
      return ok;
    }),
  },
`;
  // The page with no row, with one, and the way back: the row is added and deleted through the
  // page, so the list and the question before a delete are looked at too.
  const designCheck = `  await page.goto("/app/${plural}");
  await expect(page.getByRole("heading", { name: "${Plural}", exact: true })).toBeVisible();
  await expectClean(page, "${Plural}");
  // One row, added through the page. Its title is one long word: the row has to hold it at phone width.
  const ${single}Title = \`Design-check-\${"long".repeat(20)}\`;
  await page.getByLabel("New ${single}").fill(${single}Title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("button", { name: \`Delete \${${single}Title}\` })).toBeVisible();
  await expectClean(page, "${Plural}, with one");
  // Deleted through the page again: it asks first, and the keyboard is put somewhere afterwards.
  await page.getByRole("button", { name: \`Delete \${${single}Title}\` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete ${single}" }).click();
  await expect(page.getByText("No ${plural}", { exact: true })).toBeVisible();
  await expect(page.getByLabel("New ${single}")).toBeFocused();

`;
  return [
    // The design detector looks at the new page too (skipped when the product dropped that test).
    ["tests/e2e/design.spec.ts", `  ${ANCHOR}`, designCheck],
    ["packages/shared/src/contract/index.ts", `  ${ANCHOR}`, contract],
    [
      "packages/shared/src/contract/index.ts",
      'import * as z from "zod";',
      `import { MOST_${PLURAL}, ${Single}Schema } from "../schemas/${plural}";\n`,
    ],
    ["packages/backend/src/api/router.ts", `  ${ANCHOR}`, router],
    [
      "packages/backend/src/api/router.ts",
      'import { adminOnly, inPerson, os, signedIn, userErrors } from "./base";',
      `import { create${Single}, list${Plural}, remove${Single} } from "../features/${plural}";\n`,
    ],
  ];
}

/**
 * What the scaffold says last. The order matters: the migration it generated is for the table
 * as scaffolded, so the table is shaped first and the migration replaced after.
 */
export const nextSteps = ({ plural }) => [
  "Next, in this order:",
  `  1. Make it the product's own: the table first (packages/backend/src/db/schema/${plural}.ts), then the contract, the logic, the tests and the page.`,
  "  2. npm run db:redo   one migration for the table as you shaped it, in place of the scaffold's (the tests need it). It rebuilds the local database. Run it again whenever the table changes, until the migration is committed.",
  "  3. npm run check",
];

/** Lines added at the end of files that exist already. */
export const appended = ({ plural, Single, PLURAL }) => [
  ["packages/backend/src/db/schema/index.ts", `export * from "./${plural}";\n`],
  [
    "packages/shared/src/index.ts",
    `export { MOST_${PLURAL}, type ${Single}, ${Single}Schema } from "./schemas/${plural}";\n`,
  ],
];

function main(argv) {
  // `--plural <word>`: the word after the flag is the plural, never the name.
  const flag = argv.indexOf("--plural");
  const plural = flag === -1 ? undefined : argv[flag + 1];
  if (flag !== -1 && (!plural || plural.startsWith("--"))) throw new Error("Say the plural after --plural.");
  const single = argv.find((arg, index) => !arg.startsWith("--") && (flag === -1 || index !== flag + 1));
  if (!single) throw new Error("Name the feature in the singular: npm run new:feature -- note");
  const feature = names(single, plural);

  const created = files(feature);
  const taken = Object.keys(created).filter((file) => existsSync(join(ROOT, file)));
  if (taken.length) throw new Error(`These exist already, so nothing was written: ${taken.join(", ")}`);
  // A product may have dropped the design test; every other file must be there.
  const edits = insertions(feature).filter(
    ([file]) => file !== "tests/e2e/design.spec.ts" || existsSync(join(ROOT, file)),
  );
  for (const [file, find] of edits) {
    if (!readFileSync(join(ROOT, file), "utf8").includes(find))
      throw new Error(`${file} has lost the line new features are added at:\n  ${find.trim()}`);
  }

  for (const [file, text] of Object.entries(created)) {
    mkdirSync(dirname(join(ROOT, file)), { recursive: true });
    writeFileSync(join(ROOT, file), text);
    console.log(`  wrote   ${file}`);
  }
  for (const [file, find, text] of edits) {
    const full = join(ROOT, file);
    // A function, so a "$" in the text is not read as a replacement pattern.
    writeFileSync(
      full,
      readFileSync(full, "utf8").replace(find, () => `${text}${find}`),
    );
  }
  for (const [file, text] of appended(feature)) {
    const full = join(ROOT, file);
    writeFileSync(full, readFileSync(full, "utf8").replace(/\n*$/, "\n") + text);
  }
  const touched = [...new Set([...edits.map(([file]) => file), ...appended(feature).map(([file]) => file)])];
  for (const file of touched) console.log(`  edited  ${file}`);

  const run = (command, args) => execFileSync(command, args, { cwd: ROOT, stdio: "inherit" });
  run("npm", ["run", "db:generate"]);
  run("npx", ["biome", "check", "--write", "--no-errors-on-unmatched", ...Object.keys(created), ...touched]);
  console.log(
    `\nThe ${feature.plural} feature is in place: /app/${feature.plural} on the web, /api/${feature.plural} over HTTP.`,
  );
  // drizzle-kit exits with 0 even when it wrote nothing: it had a question about another table
  // (one reshaped since its migration was generated) and no terminal to ask it at.
  const migrations = join(ROOT, "packages/backend/migrations");
  const migrated = readdirSync(migrations).some(
    (file) =>
      file.endsWith(".sql") &&
      readFileSync(join(migrations, file), "utf8").includes(`CREATE TABLE \`${feature.plural}\``),
  );
  if (!migrated) {
    console.log(
      `But drizzle-kit wrote no migration for the ${feature.plural} table (what it said is above), so until step 2 the tests have no such table. \`npm run db:redo\` writes one migration for everything that is not committed.`,
    );
  }
  for (const line of nextSteps(feature)) console.log(line);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
