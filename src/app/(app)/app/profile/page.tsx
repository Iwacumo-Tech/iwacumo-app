"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import ProfileDetails from "@/components/profile/ProfileDetails";
import ProfileEdit from "@/components/profile/ProfileEdit";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function Page () {
  const session = useSession();
  const [editProfile, setEditProfile] = useState(false);
  const { data: user } = trpc.getUserById.useQuery({ id: session.data?.user.id as string });

  return (
    <>
      {
        editProfile ? <ProfileEdit user={user} setEditProfile={setEditProfile} />
          :
          <ProfileDetails user={user} setEditProfile={setEditProfile} />}
    </>
  );
}
