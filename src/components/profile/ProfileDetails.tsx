"use client";

import { useState, useRef } from "react";
import { 
  Globe, Mail, Phone, User as UserIcon, Building2, 
  ExternalLink, BookOpen, Camera, Loader2, ArrowRight
} from "lucide-react";
import Image from "next/image";
import { trpc } from "@/app/_providers/trpc-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ProfileUpgradeSection from "./ProfileUpgradeSection";

const ProfileDetails = ({ user, setEditProfile }: any) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") || "booka.africa";
  
  const isPublisher = !!user?.publisher;
  const isAuthor = !!user?.author;
  const hasReaderProfile = (user?.customers?.length || 0) > 0;
  const canUpdateAvatar = isPublisher || isAuthor;

  const storefrontUrl = isPublisher ? `https://${user?.username?.toLowerCase()}.${baseUrl}` : null;

  // Specific mutation for just the image
  const updateImage = trpc.updateProfileImage.useMutation({
    onSuccess: () => {
      toast.success("Profile picture updated!");
      utils.getUserById.invalidate({ id: user.id });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile picture");
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large (max 5MB)");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/avatar/upload?filename=${file.name}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const blob = await response.json();
      
      await updateImage.mutateAsync({
        id: user.id,
        profilePicture: blob.url,
      });

    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const currentProfilePic = user?.publisher?.profile_picture || user?.author?.profile_picture;

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div className="flex items-center gap-6">
          {/* Enhanced Avatar Section */}
          <div className="relative">
            <div 
              className={cn(
                "group relative w-24 h-24 border-4 border-black bg-accent gumroad-shadow flex items-center justify-center overflow-hidden transition-all",
                canUpdateAvatar && !isUploading ? "cursor-pointer hover:translate-y-[-2px] hover:gumroad-shadow-lg" : "cursor-default"
              )}
              onClick={() => canUpdateAvatar && !isUploading && fileInputRef.current?.click()}
            >
              {currentProfilePic ? (
                <Image 
                  src={currentProfilePic} 
                  alt="Profile" 
                  className={cn("w-full h-full object-cover", isUploading && "opacity-40")} 
                  width={100} height={100} 
                />
              ) : (
                <UserIcon size={40} className={cn("text-black", isUploading && "opacity-20")} />
              )}

              {/* Uploading Spinner */}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <Loader2 className="text-black animate-spin" size={24} />
                </div>
              )}

              {/* Hover Overlay */}
              {canUpdateAvatar && !isUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={24} />
                </div>
              )}
            </div>

            {/* Permanent Camera Badge for Intuition */}
            {canUpdateAvatar && !isUploading && (
              <div 
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-black border-2 border-white flex items-center justify-center rounded-none cursor-pointer hover:bg-accent group transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={14} className="text-white group-hover:text-black" />
              </div>
            )}

            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
            />
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
        {/* Identity Card */}
        <div className="bg-white border-4 border-black p-8 gumroad-shadow space-y-6">
          <h3 className="font-black uppercase italic text-sm flex items-center gap-2 border-b-2 border-black pb-2">
            <UserIcon size={16} /> Identity Information
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Display Name</p>
              <p className="font-bold">{user?.first_name} {user?.last_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Primary Email</p>
              <p className="font-bold truncate">{user?.email}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Phone Number</p>
              <p className="font-bold">{user?.phone_number || "Not provided"}</p>
            </div>
          </div>
        </div>

        {/* Brand Card */}
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
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Organization</p>
                  <p className="font-black uppercase italic">{user?.publisher?.tenant?.name || "Unnamed Org"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Public Storefront</p>
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
                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Account Level</p>
                <p className="font-black uppercase italic">
                  {hasReaderProfile ? "Reader Access" : user?.claims[0]?.role_name} Access
                </p>
              </div>
            )}

            <div>
              <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Biography</p>
              <p className="text-xs font-bold leading-relaxed line-clamp-4">
                {user?.publisher?.bio || user?.author?.bio || "No biography provided."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ProfileUpgradeSection user={user} />
    </div>
  );
};

export default ProfileDetails;
