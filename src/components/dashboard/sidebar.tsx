"use client";

import { IoLogOutOutline } from "react-icons/io5";
import { SidebarItem } from "./sidebar-item";
import { type Link } from "./dashboard-shell";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";
import { ExternalLink } from "lucide-react";

/**
 * Sidebar Component
 * Location: src/components/dashboard/sidebar.tsx
 * * Augmented for White-Label Branding: Fetches Tenant colors and logos.
 */

interface SidebarProps {
  title?: string;
  links: Link[];
  logout: () => void;
  hideLogout?: boolean;
}

export function Sidebar({ logout, links, title, hideLogout }: SidebarProps) {
  const session = useSession();
  
  // Fetch tenant branding info if available
  const { data: tenantData } = trpc.getTenantBySlug.useQuery(
    { slug: (session.data as any)?.tenantSlug || "" }, 
    { enabled: !!(session.data as any)?.tenantSlug }
  );
  // Dynamic branding variables
  const brandColor = tenantData?.brand_color || "#3b82f6"; // Default primary blue
  const logoUrl = tenantData?.logo_url;

  return (
    <div className="flex grow flex-col justify-between bg-white relative px-3 py-6 border-r">
      <div className="space-y-6">
        {/* Branding Section */}
        <div className="px-4 flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden">
            {/* <Image 
              src={logoUrl} 
              alt="Logo" 
              fill 
              className="object-contain" 
              // onError={(e) => (e.currentTarget.src = "/logo.png")}
            /> */}
          </div>
          {title ? (
            <h2 className="text-lg font-bold tracking-tight text-gray-900">{title}</h2>
          ) : (
            <span className="font-bold text-lg">{tenantData?.name || "Booka"}</span>
          )}
        </div>

        {/* Navigation Links */}
        <div className="space-y-1">
          {links.map((item, i) => (
            <SidebarItem
              key={`${item.name}-${i}`}
              href={item.url}
              name={item.name}
              icon={item.icon}
              // Optional: You could pass brandColor to SidebarItem to style active state
            />
          ))}
        </div>
      </div>

      {/* Footer Section */}
      <div className="space-y-1 pt-4 border-t border-gray-100">
        <SidebarItem
          name="Visit Store"
          href="/"
          icon={<ExternalLink className="w-5 h-5 text-blue-600" />}
          className="text-blue-600 hover:bg-blue-50 transition-colors mb-2"
        />

        {!hideLogout && (
          <SidebarItem
            name="Logout"
            icon={<IoLogOutOutline className="w-5 h-5 text-red-500" />}
            onClick={logout}
            className="text-red-600 hover:bg-red-50 transition-colors"
          />
        )}
        
        {/* Tenant Indicator */}
        <div className="px-4 py-3 mt-2 rounded-xl bg-gray-50 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Managed Tenant</span>
          <span className="text-xs font-semibold text-gray-700 truncate">
            {tenantData?.slug || "Default Platform"}
          </span>
        </div>
      </div>
    </div>
  );
}