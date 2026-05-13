import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (userId) {
    const client = await clerkClient();
    // Revoke all sessions for this user
    await client.users.getUserOauthAccessToken(userId, "oauth_google").catch(() => {});
    const sessions = await client.sessions.getSessionList({ userId });
    await Promise.all(
      sessions.data.map((s) => client.sessions.revokeSession(s.id).catch(() => {}))
    );
  }
  // Redirect to Clerk sign-out then home
  return NextResponse.redirect(
    `https://legible-gnu-86.clerk.accounts.dev/v1/client/sign_out?redirect_url=${encodeURIComponent("http://localhost:3000")}`
  );
}
