// The guard hook (.claude/hooks/guard.mjs) refuses a few actions before an agent takes them.
// These tests hold it to its list: what it must stop, and what it must leave alone.
import { describe, expect, it } from "vitest";

// A variable, so TypeScript does not look for types of the plain .mjs file.
const hook = "../.claude/hooks/guard.mjs";
const { refuseCommand, refuseWrite } = (await import(hook)) as {
  refuseCommand(command: string, originUrl?: string): string | null;
  refuseWrite(file: string): string | null;
};
const ORIGIN = "https://github.com/acme/product.git";

describe("writing files", () => {
  it("refuses secret files, wherever they are", () => {
    for (const file of ["apps/web/.dev.vars", ".env", "apps/mobile/.env.local", "apps/web/.dev.vars.staging"]) {
      expect(refuseWrite(file), file).toContain("Secret files");
    }
  });

  it("allows the example files that document them", () => {
    expect(refuseWrite("apps/web/.dev.vars.example")).toBeNull();
    expect(refuseWrite(".env.example")).toBeNull();
  });

  it("refuses generated files and says how to regenerate each", () => {
    expect(refuseWrite("packages/backend/migrations/0001_new.sql")).toContain("db:generate");
    expect(refuseWrite("packages/backend/migrations/meta/_journal.json")).toContain("db:generate");
    expect(refuseWrite("packages/backend/src/db/schema/auth.ts")).toContain("auth:generate");
    expect(refuseWrite("packages/theme/src/generated/tokens.ts")).toContain("npm run theme");
    expect(refuseWrite("apps/web/src/themes/brand/brand.css")).toContain("npm run theme");
  });

  it("allows the files those are generated from, and ordinary source", () => {
    for (const file of [
      "packages/backend/src/db/schema/notes.ts",
      "packages/theme/src/brand.ts",
      "apps/web/src/themes/brand/brandTheme.ts",
      "apps/web/app/(app)/app/page.tsx",
      "docs/environment.md",
    ]) {
      expect(refuseWrite(file), file).toBeNull();
    }
  });
});

describe("running commands", () => {
  it("refuses deploys that skip the deploy script", () => {
    for (const command of [
      "npx wrangler deploy",
      "cd apps/web && npx vinext-cloudflare deploy --env staging",
      "npm run build && wrangler deploy --config dist/server/wrangler.json",
      "wrangler versions upload",
    ]) {
      expect(refuseCommand(command, ORIGIN), command).toContain("npm run deploy");
    }
    expect(refuseCommand("npm run deploy -- staging", ORIGIN)).toBeNull();
    // A dry run uploads nothing: it is how the bundle is checked.
    expect(refuseCommand("npx wrangler deploy --dry-run --outdir dist/check", ORIGIN)).toBeNull();
  });

  it("refuses changing a remote database by hand, and allows the local one", () => {
    expect(refuseCommand('npx wrangler d1 execute DB --remote --command "delete from auth_user"', ORIGIN)).toContain(
      "deploy script",
    );
    expect(refuseCommand("npx wrangler d1 migrations apply DB --remote", ORIGIN)).toContain("deploy script");
    expect(refuseCommand("npx wrangler d1 migrations apply DB --local", ORIGIN)).toBeNull();
    expect(refuseCommand('npx wrangler d1 execute DB --local --command "select 1"', ORIGIN)).toBeNull();
  });

  it("refuses a forced audit fix", () => {
    expect(refuseCommand("npm audit fix --force", ORIGIN)).toContain("pinned versions");
    expect(refuseCommand("npm audit", ORIGIN)).toBeNull();
  });

  it("refuses a push to anywhere but origin", () => {
    expect(refuseCommand("git push https://github.com/someone/else.git main", ORIGIN)).toContain("origin");
    expect(refuseCommand("git push git@github.com:someone/else.git main", ORIGIN)).toContain("origin");
    expect(refuseCommand("git push -u origin feature/notes", ORIGIN)).toBeNull();
    expect(refuseCommand("git push", ORIGIN)).toBeNull();
  });

  it("refuses a pull request against someone else's repository", () => {
    expect(refuseCommand('gh pr create --repo upstream/product --title "x"', ORIGIN)).toContain("pull request");
    expect(refuseCommand('gh pr create --repo acme/product --title "x"', ORIGIN)).toBeNull();
    expect(refuseCommand('gh pr create --title "x"', ORIGIN)).toBeNull();
  });

  it("judges each part of a compound command", () => {
    expect(refuseCommand("npm run check && npx wrangler deploy", ORIGIN)).toContain("npm run deploy");
    expect(refuseCommand("npm run check && npm run build", ORIGIN)).toBeNull();
  });

  it("leaves everyday commands alone", () => {
    for (const command of [
      "npm run check",
      "npm run dev",
      "npx wrangler dev --port 8787",
      "npm run db:generate",
      "git status",
      "git commit -m 'Add notes'",
      "npx astryx component Button",
      "grep -rn deploy docs/",
    ]) {
      expect(refuseCommand(command, ORIGIN), command).toBeNull();
    }
  });
});
