"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/app/_providers/trpc-provider";

export default function Banner() {
  const { data: banners, isLoading } = trpc.getAllBanners.useQuery();
  const [visibleBanners, setVisibleBanners] = useState<
    { id: string; image: string }[]
  >([]);

  useEffect(() => {
    if (banners) {
      const filteredBanners = banners.filter((banner) => banner.isShow);
      setVisibleBanners(filteredBanners);
    }
  }, [banners]);

  if (isLoading) {
    return <div className="text-center py-8">Loading banners...</div>;
  }

  if (!visibleBanners.length) {
    return <div className="text-center py-8">No banners to display.</div>;
  }

  return (
    <div className="max-w-[80%] mx-auto pb-8">
      <div
        className={`grid ${
          visibleBanners.length === 1
            ? "grid-cols-1"
            : "grid-cols-1 md:grid-cols-2 gap-6"
        }`}
      >
        {visibleBanners.map((banner) => (
          <div
            key={banner.id}
            className="relative bg-cover bg-center overflow-hidden h-[200px]"
            style={{ backgroundImage: `url(${banner.image})` }}
          />
        ))}
      </div>
    </div>
  );
}
