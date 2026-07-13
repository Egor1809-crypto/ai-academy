import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Админ-панель",
  robots: { index: false, follow: false },
};

/**
 * Server-side admin gate. Non-admins never reach the panel — which is why the
 * panel itself no longer carries a browser-held password. Role is read live from
 * the DB via the httpOnly+Secure session cookie on every request.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");
  return <>{children}</>;
}
