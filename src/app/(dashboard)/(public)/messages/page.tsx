// app/messages/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MessagingPage } from "./_components/MessagingPage";


async function MainMessagePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <MessagingPage
      currentUserId={session.user.id}
      currentUserName={session.user.name ?? ""}
      currentUserImage={session.user.image ?? undefined}
    />
  );
}
export default MainMessagePage