import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    const email = data.user?.email;

    if (email) {
      const { data: perfil } = await supabase
        .from("usuarios_permitidos")
        .select("senha_definida")
        .eq("email", email)
        .maybeSingle();

      if (!perfil?.senha_definida) {
        return NextResponse.redirect(`${origin}/definir-senha`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
