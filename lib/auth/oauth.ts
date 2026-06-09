export function getOAuthRedirectUrl() {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) {
    return `${configured}/auth/callback`;
  }

  return "http://127.0.0.1:3000/auth/callback";
}
