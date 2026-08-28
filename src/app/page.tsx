import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AUTH_DESLIGADA_TEMPORARIAMENTE } from "@/lib/auth-config";
import Dashboard from "@/components/Dashboard";
import type { User } from "@supabase/supabase-js";

const USUARIO_TEMPORARIO = {
  email: "acesso-temporario@lube.com.br",
} as User;

export default async function Home() {
  if (AUTH_DESLIGADA_TEMPORARIAMENTE) {
    return <Dashboard user={USUARIO_TEMPORARIO} />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <Dashboard user={user} />;
}
