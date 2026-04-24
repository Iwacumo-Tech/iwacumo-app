"use client";

import { Building2, Globe, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function PublisherInfoModal({
  publisher,
  trigger,
}: {
  publisher: any;
  trigger: React.ReactNode;
}) {
  const authors = publisher.authors ?? [];
  const browserUrl = process.env.NEXT_PUBLIC_BROWSER_URL ?? "";
  const storefrontUrl = publisher.slug
    ? `${browserUrl.replace(/\/$/, "")}/${publisher.slug}`
    : browserUrl;

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden rounded-none border-4 border-black bg-white p-0 sm:max-w-3xl">
        <DialogHeader className="border-b-4 border-black bg-[#F9F6F0] px-6 py-5 text-left">
          <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-black">
            Publisher Info<span className="text-accent">.</span>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(90vh-88px)] space-y-8 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border-2 border-black bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                Organization
              </p>
              <p className="mt-2 text-lg font-black uppercase italic tracking-tight">
                {publisher.tenant?.name ?? "Unknown Organization"}
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase opacity-50">
                slug: {publisher.slug ?? "—"}
              </p>
            </div>

            <div className="border-2 border-black bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                Lead Publisher
              </p>
              <p className="mt-2 text-lg font-black uppercase italic tracking-tight">
                {[publisher.user?.first_name, publisher.user?.last_name].filter(Boolean).join(" ") || "—"}
              </p>
              <p className="mt-1 text-[11px] font-bold opacity-60">
                {publisher.user?.email || "No email available"}
              </p>
            </div>

            <div className="border-2 border-black bg-white p-4">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40">
                <Globe size={12} />
                Storefront
              </p>
              <p className="mt-2 break-all text-sm font-bold">
                {storefrontUrl || "Storefront unavailable"}
              </p>
            </div>

            <div className="border-2 border-black bg-white p-4">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40">
                <Building2 size={12} />
                White-Label
              </p>
              <p className="mt-2 text-sm font-black uppercase">
                {publisher.white_label ? "Enabled" : "Standard"}
              </p>
            </div>
          </div>

          <div className="border-2 border-black bg-[#FFFDF7] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40">
                  <Users size={12} />
                  Authors
                </p>
                <p className="mt-2 text-xl font-black italic">{authors.length}</p>
              </div>
            </div>

            {authors.length === 0 ? (
              <p className="text-sm font-bold opacity-50">No authors are attached to this publisher yet.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {authors.map((author: any) => (
                  <div key={author.id} className="border-2 border-black bg-white p-4">
                    <p className="font-black uppercase italic tracking-tight">
                      {[author.user?.first_name, author.user?.last_name].filter(Boolean).join(" ") || author.name || "Author"}
                    </p>
                    <p className="mt-1 text-[11px] font-bold opacity-60">
                      {author.user?.email || "No email available"}
                    </p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest opacity-40">
                      {(author.books ?? []).length} books
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {storefrontUrl && (
            <div className="flex justify-end">
              <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
                <Button className="booka-button-primary h-11 px-5 text-[11px]">
                  Visit Storefront
                </Button>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
