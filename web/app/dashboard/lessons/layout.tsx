import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { currentAccount } from "@/lib/supabase/access";
export const dynamic = 'force-dynamic';
export default async function LessonLayout({ children }: { children: ReactNode }) {
  const { account } = await currentAccount();
  if (!account || account.status !== "active" || account.role === "pending") redirect("/dashboard");
  return children;
}
