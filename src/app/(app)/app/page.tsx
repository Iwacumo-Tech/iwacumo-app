import { auth } from "@/auth";

export default async function AppPage () {
  const session = await auth();

  console.error("App auth session: ", session);

  return (
    <div>
      Hello  {session?.user?.first_name}
    </div>
  );
}
