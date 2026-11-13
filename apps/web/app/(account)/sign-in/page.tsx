import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safePath } from "@/lib/request";
import { pagePrincipal } from "@/lib/server";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safePath((await searchParams).next, "/app");
  if (await pagePrincipal()) redirect(next);
  return <SignInForm next={next} />;
}
