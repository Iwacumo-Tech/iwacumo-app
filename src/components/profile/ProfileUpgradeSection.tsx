"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Building2, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { trpc } from "@/app/_providers/trpc-provider";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ProfileUpgradeSection({ user }: { user: any }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [isAuthorDialogOpen, setIsAuthorDialogOpen] = useState(false);
  const [isPublisherDialogOpen, setIsPublisherDialogOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");

  const debouncedSlug = useDebounce(tenantSlug, 400);
  const normalizedSlug = debouncedSlug.toLowerCase().trim().replace(/\s+/g, "-");

  const hasReaderProfile = (user?.customers?.length || 0) > 0;
  const hasAuthorProfile = !!user?.author;
  const hasPublisherProfile = !!user?.publisher;
  const emailVerified = !!user?.email_verified_at;

  const authorUpgrade = trpc.upgradeToAuthor.useMutation({
    onSuccess: async (result) => {
      toast.success(
        result.requiresVerification
          ? "Author profile created. Verify your email to activate creator access."
          : "Author profile activated."
      );
      await utils.getUserById.invalidate({ id: user.id });
      setIsAuthorDialogOpen(false);
      window.location.reload();
    },
    onError: (error) => toast.error(error.message || "Could not create author profile."),
  });

  const publisherUpgrade = trpc.upgradeToPublisher.useMutation({
    onSuccess: async (result) => {
      toast.success(
        result.requiresVerification
          ? "Publisher profile created. Verify your email to activate publisher access."
          : "Publisher profile activated."
      );
      await utils.getUserById.invalidate({ id: user.id });
      setIsPublisherDialogOpen(false);
      window.location.reload();
    },
    onError: (error) => toast.error(error.message || "Could not create publisher profile."),
  });

  const { data: slugStatus, isFetching: isCheckingSlug } = trpc.checkSlugAvailability.useQuery(
    { slug: normalizedSlug },
    {
      enabled: isPublisherDialogOpen && normalizedSlug.length > 2,
    }
  );

  const profileCards = useMemo(() => {
    return [
      {
        key: "reader",
        title: "Reader Profile",
        description: hasReaderProfile
          ? "Your reading dashboard and purchased library."
          : "Unlocks automatically when you complete a purchase.",
        icon: UserRound,
        state: hasReaderProfile ? "available" : "locked",
      },
      {
        key: "author",
        title: "Author Profile",
        description: hasAuthorProfile
          ? emailVerified
            ? "Create books and manage your author dashboard."
            : "Profile created. Verify your email to activate author access."
          : "Start publishing from this same account.",
        icon: BookOpen,
        state: hasAuthorProfile ? (emailVerified ? "available" : "pending") : "upgrade",
      },
      {
        key: "publisher",
        title: "Publisher Profile",
        description: hasPublisherProfile
          ? emailVerified
            ? "Run your publishing house and storefront."
            : "Profile created. Verify your email to activate publisher access."
          : "Launch and manage a branded publishing storefront.",
        icon: Building2,
        state: hasPublisherProfile ? (emailVerified ? "available" : "pending") : "upgrade",
      },
    ];
  }, [emailVerified, hasAuthorProfile, hasPublisherProfile, hasReaderProfile]);

  return (
    <div className="space-y-8">
      <div className="border-b-4 border-black pb-4">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter">
          Profile Access<span className="text-accent">.</span>
        </h2>
        <p className="mt-2 text-[10px] font-black uppercase tracking-widest opacity-40">
          Switch between available dashboards from the top bar once a profile is active.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {profileCards.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.key} className="border-4 border-black bg-white p-6 gumroad-shadow space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center border-2 border-black bg-accent">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-tight">{card.title}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-35">
                    {card.state === "available"
                      ? "Active"
                      : card.state === "pending"
                      ? "Pending Verification"
                      : card.state === "upgrade"
                      ? "Available Upgrade"
                      : "Not Active Yet"}
                  </p>
                </div>
              </div>

              <p className="text-xs font-bold leading-relaxed text-black/70">{card.description}</p>

              {card.key === "reader" && hasReaderProfile && (
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-green-700">
                  <ShieldCheck size={14} />
                  Reader access ready
                </div>
              )}

              {card.key === "author" && !hasAuthorProfile && (
                <Dialog open={isAuthorDialogOpen} onOpenChange={setIsAuthorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full booka-button-secondary h-12">Become an Author</Button>
                  </DialogTrigger>
                  <DialogContent className="border-4 border-black rounded-none">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                        Become an Author
                      </DialogTitle>
                      <DialogDescription className="font-bold text-black/60">
                        This will add an author profile to your existing account. If your email is not verified yet, you’ll need to verify it before author access becomes active.
                      </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                      <Button
                        onClick={() => authorUpgrade.mutate({})}
                        disabled={authorUpgrade.isPending}
                        className="booka-button-primary"
                      >
                        {authorUpgrade.isPending ? <Loader2 className="animate-spin" /> : "Create Author Profile"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {card.key === "publisher" && !hasPublisherProfile && (
                <Dialog open={isPublisherDialogOpen} onOpenChange={setIsPublisherDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full booka-button-primary h-12">Become a Publisher</Button>
                  </DialogTrigger>
                  <DialogContent className="border-4 border-black rounded-none">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                        Become a Publisher
                      </DialogTitle>
                      <DialogDescription className="font-bold text-black/60">
                        Create a publishing organization on this same account. Publisher access stays locked until your email is verified.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest">Organization Name</label>
                        <Input
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          className="booka-input-minimal"
                          placeholder="Empire Publishing"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest">Storefront Slug</label>
                        <Input
                          value={tenantSlug}
                          onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                          className="booka-input-minimal"
                          placeholder="empire-publishing"
                        />
                        {normalizedSlug.length > 2 && (
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                            {isCheckingSlug
                              ? "Checking availability..."
                              : slugStatus?.available
                              ? "Slug available"
                              : "Slug already taken"}
                          </p>
                        )}
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        onClick={() => publisherUpgrade.mutate({
                          organization_name: organizationName,
                          tenant_slug: tenantSlug,
                        })}
                        disabled={
                          publisherUpgrade.isPending
                          || !organizationName.trim()
                          || normalizedSlug.length < 3
                          || slugStatus?.available === false
                        }
                        className="booka-button-primary"
                      >
                        {publisherUpgrade.isPending ? <Loader2 className="animate-spin" /> : "Create Publisher Profile"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
