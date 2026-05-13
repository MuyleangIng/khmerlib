import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ADMIN_USER_ID = "user_3CguH3uLX1jGXbK71rIeoFecZkw";

const adminRoutes = ["/admin", "/api/admin", "/api/upload"];

function isAdminRoute(pathname: string) {
  return adminRoutes.some((r) => pathname.startsWith(r));
}

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;

  // If signed in but NOT the admin → sign out and send home
  if (userId && userId !== ADMIN_USER_ID) {
    const signOutUrl = new URL("/api/force-signout", req.url);
    return NextResponse.redirect(signOutUrl);
  }

  // Admin routes require admin login
  if (isAdminRoute(pathname)) {
    if (!userId) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
