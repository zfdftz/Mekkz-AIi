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

  let response = NextResponse.next({ request });

  const supabase = createServerClient(normalizeSupabaseUrl(rawUrl), anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  const isProtected =
    pathname.startsWith("/chat") ||
    pathname.startsWith("/hub") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/tools") ||
    pathname.startsWith("/community");

  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const isRegisteredUser = Boolean(user && !user.is_anonymous);

  if (isRegisteredUser && (pathname === "/" || isAuthRoute)) {
    if (
      pathname.startsWith("/auth/callback") ||
      pathname.startsWith("/auth/verify")
    ) {
      return response;
    }
    if (
      pathname.startsWith("/auth/register") ||
      pathname.startsWith("/auth/login")
    ) {
      const layoutCookie = request.cookies.get("mekkz_layout")?.value;
      const target = layoutCookie === "classic" ? "/chat" : "/hub";
      return NextResponse.redirect(new URL(target, request.url));
    }
    if (pathname === "/") {
      const layoutCookie = request.cookies.get("mekkz_layout")?.value;
      const target = layoutCookie === "classic" ? "/chat" : "/hub";
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  if (user && isAuthRoute) {
    if (pathname.startsWith("/auth/callback") || pathname.startsWith("/auth/verify")) {
      return response;
    }
    if (
      user.is_anonymous &&
      (pathname.startsWith("/auth/register") || pathname.startsWith("/auth/login"))
    ) {
      return response;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/chat/:path*",
    "/hub/:path*",
    "/settings/:path*",
    "/tools/:path*",
    "/community/:path*",
    "/auth/:path*"
  ]
};
