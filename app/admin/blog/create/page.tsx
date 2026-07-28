import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import AdminBlogCreate from "./AdminBlogCreate";

export const dynamic = "force-dynamic";

export default async function AdminBlogCreatePage() {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value ?? null;
  if (!verifyAdminSessionToken(token)) {
    redirect("/admin");
  }

  return <AdminBlogCreate />;
}

