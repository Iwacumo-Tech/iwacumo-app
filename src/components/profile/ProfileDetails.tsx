import { Globe, Mail, Phone, User as UserIcon, Building2, ExternalLink, BookOpen } from "lucide-react";
import Image from "next/image";

const ProfileDetails = ({ user, setEditProfile }: any) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") || "booka.africa";
  
  // Logic: Storefront only exists for Publishers (Tenant owners)
  const isPublisher = !!user?.publisher;
  const storefrontUrl = isPublisher ? `https://${user?.username?.toLowerCase()}.${baseUrl}` : null;

  return (
    <div className="space-y-12">
      {/* Neo-brutalist Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 border-4 border-black bg-accent gumroad-shadow flex items-center justify-center overflow-hidden">
            {(user?.publisher?.profile_picture || user?.author?.profile_picture) ? (
              <Image 
                src={user?.publisher?.profile_picture || user?.author?.profile_picture} 
                alt="Profile" 
                className="w-full h-full object-cover" 
                width={100} height={100} 
              />
            ) : (
              <UserIcon size={40} className="text-black" />
            )}
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">
              {user?.first_name} {user?.last_name}<span className="text-accent">.</span>
            </h1>
            <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-1 flex items-center gap-2">
              @{user?.username} — <span className="text-primary opacity-100">{user?.claims[0]?.role_name}</span>
            </p>
          </div>
        </div>
        <button 
          onClick={() => setEditProfile(true)} 
          className="booka-button-primary px-8 h-12 text-xs"
        >
          Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card 1: Identity Information (Universal) */}
        <div className="bg-white border-4 border-black p-8 gumroad-shadow space-y-6">
          <h3 className="font-black uppercase italic text-sm flex items-center gap-2 border-b-2 border-black pb-2">
            <UserIcon size={16} /> Identity Information
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase opacity-40">Display Name</p>
              <p className="font-bold">{user?.first_name} {user?.last_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase opacity-40">Primary Email</p>
              <p className="font-bold truncate">{user?.email}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase opacity-40">Phone Number</p>
              <p className="font-bold">{user?.phone_number || "Not provided"}</p>
            </div>
          </div>
        </div>

        {/* Card 2: Brand or Biography (Role-Specific) */}
        <div className={cn(
          "border-4 border-black p-8 gumroad-shadow space-y-6",
          isPublisher ? "bg-accent" : "bg-white"
        )}>
          <h3 className="font-black uppercase italic text-sm flex items-center gap-2 border-b-2 border-black pb-2 text-black">
            {isPublisher ? <Building2 size={16} /> : <BookOpen size={16} />} 
            {isPublisher ? "Publisher Brand" : "About Me"}
          </h3>
          
          <div className="space-y-4">
            {isPublisher ? (
              <>
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40">Organization</p>
                  <p className="font-black uppercase italic">{user?.publisher?.tenant?.name || "Unnamed Org"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40">Public Storefront</p>
                  <a 
                    href={storefrontUrl!} 
                    target="_blank" 
                    className="font-bold underline flex items-center gap-1 hover:text-white transition-colors"
                  >
                    {user?.username?.toLowerCase()}.{baseUrl} <ExternalLink size={12} />
                  </a>
                </div>
              </>
            ) : (
              <div>
                <p className="text-[10px] font-black uppercase opacity-40">Account Level</p>
                <p className="font-black uppercase italic">{user?.claims[0]?.role_name} Access</p>
              </div>
            )}

            <div>
              <p className="text-[10px] font-black uppercase opacity-40">Biography</p>
              <p className="text-xs font-bold leading-relaxed line-clamp-4">
                {user?.publisher?.bio || user?.author?.bio || "No biography provided. Add one to help people get to know you!"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper for conditional classes
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

export default ProfileDetails;