"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import ProfileDetails from "@/components/profile/ProfileDetails";
import ProfileEdit from "@/components/profile/ProfileEdit";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import InstallPrompt from "@/components/shared/InstallPrompt";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [editProfile, setEditProfile] = useState(false);
  
  const { data: user, isLoading } = trpc.getUserById.useQuery(
    { id: session?.user?.id as string },
    { enabled: !!session?.user?.id }
  );

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-10">
      {editProfile ? (
        <ProfileEdit user={user} setEditProfile={setEditProfile} />
      ) : (
        <ProfileDetails user={user} setEditProfile={setEditProfile} />
      )}
      
      {/* Install App Button */}
      <div className="border-2 border-black p-6 bg-white">
        <h3 className="font-black uppercase italic text-sm mb-4">Install App</h3>
        <InstallPrompt />
      </div>
    </div>
  );
}