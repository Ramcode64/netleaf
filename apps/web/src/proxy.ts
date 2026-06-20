// Next.js 16 renamed the `middleware` file convention to `proxy`. Same Auth.js
// v5 edge guard — redirects unauthenticated requests away from /dashboard/*.
export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*"],
};
