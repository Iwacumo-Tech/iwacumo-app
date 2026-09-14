import type { Metadata } from "next";
import OfflineContent from "./OfflineContent";

export const metadata: Metadata = {
  title: "You're offline — Iwacumo",
  description: "Reconnect to the internet to visit this page.",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] py-12 px-4">
      <OfflineContent />
    </div>
  );
}
