import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, WifiOff, Zap } from "lucide-react";
import AppInstallManager from "@/components/shared/AppInstallManager";

export const metadata: Metadata = {
  title: "Install the Iwacumo App",
  description: "Install Iwacumo on your device for quick access and offline reading.",
};

const FEATURES = [
  {
    icon: WifiOff,
    title: "Reads offline",
    text: "Download books and keep reading with no signal.",
  },
  {
    icon: Zap,
    title: "Fast launch",
    text: "Opens instantly from your home screen.",
  },
  {
    icon: BookOpen,
    title: "Syncs progress",
    text: "Pick up where you left off on any device.",
  },
];

export default function InstallPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] py-12 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="text-center">
          <Link
            href="/"
            className="text-[11px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity underline underline-offset-4"
          >
            ← Back to Iwacumo
          </Link>
        </div>

        <div className="bg-white border-4 border-black gumroad-shadow p-8 sm:p-10 text-center">
          <div className="relative w-24 h-24 mx-auto mb-6 border-2 border-black rounded-2xl overflow-hidden">
            <Image
              src="/icons/v2/icon-192x192.png"
              alt="Iwacumo app icon"
              fill
              className="object-cover"
              priority
            />
          </div>

          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            Get the App<span className="text-accent">.</span>
          </h1>
          <p className="mt-3 text-sm font-medium text-gray-500">
            Install Iwacumo for quick access and offline reading.
          </p>

          <div className="mt-8">
            <AppInstallManager />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white border-2 border-black p-4 text-center"
            >
              <feature.icon size={20} className="mx-auto mb-2" />
              <p className="text-xs font-black uppercase tracking-widest">{feature.title}</p>
              <p className="mt-1 text-[11px] font-medium text-gray-500">{feature.text}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] font-medium text-gray-400">
          Already installed but seeing the old logo? Open the installed app once so it picks up
          the update — or remove and reinstall it.
        </p>
      </div>
    </div>
  );
}
