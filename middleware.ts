import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

function normalizeSupabaseUrl(raw: string) {
  const url = raw.trim().replace(/^["']|["']$/g, "");
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url.replace(/^\/+/, "")}`;
  }
  return url;
}

export async function middleware(request: NextRequest) {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!rawUrl || !anonKey || !rawUrl.includes(".supabase.co")) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    normalizeSupabaseUrl(rawUrl),
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  const { data } = await supabase.auth.getUser();
  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
  const isProtected = request.nextUrl.pathname.startsWith("/chat");
  const authPath = request.nextUrl.pathname;

  if (!data.user && isProtected) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (data.user && isAuthRoute) {
    if (authPath.startsWith("/auth/callback") || authPath.startsWith("/auth/verify")) {
      return response;
    }
    if (
      data.user.is_anonymous &&
      (authPath.startsWith("/auth/register") || authPath.startsWith("/auth/login"))
    ) {
      return response;
    }
    if (!data.user.is_anonymous) {
      return NextResponse.redirect(new URL("/chat", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/chat/:path*", "/auth/:path*"]
};
