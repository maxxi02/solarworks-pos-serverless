// app/messages/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import MessagesPage from "./_components/MessagingPage";

export default async function MainMessagePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <MessagesPage
      currentUserId={session.user.id}
      currentUserName={session.user.name ?? ""}
      currentUserImage={session.user.image ?? undefined}
    />
  );
}