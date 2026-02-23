import { auth } from "@/lib/auth";

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  const isPublicAsset =
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname === "/manifest.json" ||
    req.nextUrl.pathname.startsWith("/icons") ||
    req.nextUrl.pathname === "/sw.js";

  if (isAuthRoute || isPublicAsset) return;

  if (!isLoggedIn && !isLoginPage) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)",
  ],
};
