"use client";

import React, { BaseSyntheticEvent, ReactNode, useState } from "react";
import { FaChevronRight } from "react-icons/fa";
import { signOut, useSession } from "next-auth/react";
import { Sidebar } from "./sidebar"; 
import { SidebarMobile } from "./sidebar-mobile"; 

/**
 * Dashboard Shell
 * Location: src/components/dashboard/dashboard-shell.tsx
 * * Simplified Logic: Trusts the server-filtered links from layout.tsx.
 * * Handles the global layout structure and responsive state.
 */

export interface Link {
  name: string;
  url: string;
  icon: ReactNode;
  requiredPermission: string;
}

export default function DashboardShell({
  title,
  children,
  hideLogout,
  logoutRedirectTo = "/",
  links = [], // These come filtered from the server layout
}: {
  title?: string;
  links?: Link[];
  children: React.ReactNode;
  logoutRedirectTo?: string;
  hideLogout?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = async (e?: BaseSyntheticEvent) => {
    e?.preventDefault();
    await signOut({ callbackUrl: logoutRedirectTo ?? "/" });
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Mobile Drawer */}
      <SidebarMobile
        title={title}
        logout={logout}
        links={links}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Mobile Toggle Trigger */}
      {!sidebarOpen && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setSidebarOpen(true);
          }}
          className="fixed top-24 left-0 z-40 lg:hidden flex items-center justify-center w-6 h-10 bg-white border border-gray-200 border-l-0 rounded-r-xl shadow-md transition-all hover:w-8"
        >
          <FaChevronRight className="w-2.5 h-2.5 text-gray-600" />
        </a>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col shadow-sm">
        <Sidebar
          title={title}
          links={links}
          logout={logout}
          hideLogout={hideLogout}
        />
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72 transition-all">
        <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}