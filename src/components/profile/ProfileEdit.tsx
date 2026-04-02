"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { editProfileSchema, TEditProfileSchema } from "@/server/dtos";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button }   from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ProfileEdit = ({ user, setEditProfile }: any) => {
  const { toast } = useToast();
  const utils       = trpc.useUtils();
  const isPublisher = !!user?.publisher;
  const isAuthor    = !!user?.author;

  const form = useForm<TEditProfileSchema>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      first_name:        user?.first_name        || "",
      last_name:         user?.last_name         || "",
      username:          user?.username          || "",
      bio:               user?.publisher?.bio || user?.author?.bio || "",
      phone_number:      user?.phone_number      || "",
      organization_name: user?.publisher?.tenant?.name || "",
    },
  });

  const watchUsername   = form.watch("username");
  const debouncedValue  = useDebounce(watchUsername, 500);
  const normalizedSlug  = debouncedValue?.toLowerCase().trim().replace(/\s+/g, "-");

  // Slug check (Publishers)
  const { data: slugStatus, isFetching: isCheckingSlug } =
    trpc.checkSlugAvailability.useQuery(
      { slug: normalizedSlug },
      {
        enabled:
          isPublisher &&
          !!normalizedSlug &&
          normalizedSlug !== user?.username?.toLowerCase(),
      }
    );

  // Username check (Readers / Authors)
  const { data: userStatus, isFetching: isCheckingUser } =
    trpc.checkUsernameAvailability.useQuery(
      { username: debouncedValue },
      {
        enabled:
          !isPublisher &&
          !!debouncedValue &&
          debouncedValue !== user?.username,
      }
    );

  const updateProfile = trpc.updateUserProfile.useMutation({
    onSuccess: () => {
      toast({ title: "Profile Updated", description: "Changes saved successfully." });
      utils.getUserById.invalidate();
      setEditProfile(false);
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const onSubmit = (values: TEditProfileSchema) => {
    if (
      isPublisher &&
      normalizedSlug !== user?.username?.toLowerCase() &&
      slugStatus?.available === false
    ) {
      toast({ variant: "destructive", title: "Slug Taken", description: "This storefront URL is reserved." });
      return;
    }
    if (
      !isPublisher &&
      debouncedValue !== user?.username &&
      userStatus?.available === false
    ) {
      toast({ variant: "destructive", title: "Username Taken", description: "This handle is already in use." });
      return;
    }
    updateProfile.mutate({ ...values, id: user?.id });
  };

  const isChecking  = isCheckingSlug || isCheckingUser;
  const isAvailable = isPublisher ? slugStatus?.available : userStatus?.available;

  return (
    <div className="max-w-2xl space-y-10 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b-4 border-black pb-6">
        <h2 className="text-4xl font-black uppercase italic tracking-tighter">
          Edit Profile<span className="text-accent">.</span>
        </h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          {/* Publisher storefront name */}
          {isPublisher && (
            <div className="bg-accent border-4 border-black p-8 gumroad-shadow space-y-4">
              <FormField control={form.control} name="organization_name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                    Storefront Name
                  </FormLabel>
                  <FormControl>
                    <Input className="booka-input-minimal bg-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          )}

          {/* Main identity card */}
          <div className="bg-white border-4 border-black p-8 gumroad-shadow space-y-6">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-6">
              <FormField control={form.control} name="first_name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                    First Name
                  </FormLabel>
                  <FormControl>
                    <Input className="booka-input-minimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="last_name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                    Last Name
                  </FormLabel>
                  <FormControl>
                    <Input className="booka-input-minimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Username / Slug */}
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                  {isPublisher ? "Storefront Slug" : "Username"}
                </FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      className={cn(
                        "booka-input-minimal",
                        isAvailable === false && "border-red-500 bg-red-50"
                      )}
                      {...field}
                    />
                  </FormControl>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {isChecking ? (
                      <Loader2 className="animate-spin size-4 opacity-40" />
                    ) : isAvailable ? (
                      <CheckCircle2 className="text-green-600 size-5" />
                    ) : isAvailable === false ? (
                      <AlertCircle className="text-red-600 size-5" />
                    ) : null}
                  </div>
                </div>
                <FormMessage />
                {isPublisher && (
                  <p className="text-[9px] font-bold opacity-40 uppercase mt-1 italic">
                    Public URL: iwacumo.com/{normalizedSlug || "..."}
                  </p>
                )}
              </FormItem>
            )} />

            {/* ── Phone Number — visible for all users ────────── */}
            <FormField control={form.control} name="phone_number" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                  Phone Number
                </FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+234 800 000 0000"
                    className="booka-input-minimal"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Biography — Publishers and Authors only */}
            {(isPublisher || isAuthor) && (
              <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                    Biography
                  </FormLabel>
                  <FormControl>
                    <Textarea className="booka-input-minimal h-32" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              type="submit"
              disabled={updateProfile.isPending || isAvailable === false}
              className="booka-button-primary h-16 text-lg flex-1"
            >
              {updateProfile.isPending
                ? <Loader2 className="animate-spin" />
                : "Save Changes"}
            </Button>
            <Button
              type="button"
              onClick={() => setEditProfile(false)}
              variant="outline"
              className="h-16 border-4 border-black font-black uppercase italic px-10"
            >
              Discard
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ProfileEdit;