"use client";

import { useState } from "react";
import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { User, BookOpen, Building2, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

export function RegisterForm() {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [slugInput, setSlugInput] = useState("");
  
  const debouncedUsername = useDebounce(usernameInput, 500);
  const debouncedSlug = useDebounce(slugInput, 500);
  
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitePublisherId = searchParams.get("publisher_id");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") || "booka.africa";

  // Check Username Availability (For Everyone)
  const { data: userStatus, isFetching: isCheckingUser } = trpc.checkUsernameAvailability.useQuery(
    { username: debouncedUsername },
    { enabled: debouncedUsername.length > 2 }
  );

  // Check Slug Availability (For Publishers only)
  const { data: slugStatus, isFetching: isCheckingSlug } = trpc.checkSlugAvailability.useQuery(
    { slug: debouncedSlug },
    { enabled: selectedRole === "Publisher" && debouncedSlug.length > 2 }
  );

  const registerMutation = trpc.createUser.useMutation({
    onSuccess: () => {
      toast({ title: "Welcome to Booka.", description: "Your account is ready. Please sign in." });
      router.push("/login");
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Signup Failed", description: err.message });
    }
  });

  const roles = [
    { id: "Customer", title: "Reader", icon: User, desc: "Explore & Buy" },
    { id: "Author", title: "Author", icon: BookOpen, desc: "Publish & Earn" },
    { id: "Publisher", title: "Publisher", icon: Building2, desc: "Scale & Manage" },
  ] as const;

  const handleFinalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (userStatus?.available === false) {
      toast({ variant: "destructive", title: "Username Taken", description: "Choose another handle." });
      return;
    }
    if (selectedRole === "Publisher" && slugStatus?.available === false) {
      toast({ variant: "destructive", title: "Slug Taken", description: "This storefront URL is already reserved." });
      return;
    }

    const formData = new FormData(e.currentTarget);
    registerMutation.mutate({
      roleName: selectedRole!,
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      email: formData.get("email") as string,
      username: usernameInput,
      password: formData.get("password") as string,
      name: selectedRole === "Publisher" 
        ? (formData.get("tenant_name") as string) 
        : `${formData.get("first_name")} ${formData.get("last_name")}`,
      publisher_id: invitePublisherId || undefined,
      tenant_slug: selectedRole === "Publisher" ? slugInput : undefined,
    } as any);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {step === 1 && (
        <div className="space-y-10">
          <div className="text-center">
             <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/40 mb-4">Identity Selection</p>
             <h2 className="text-3xl font-black uppercase italic tracking-tighter">Who are you joining as?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => { setSelectedRole(r.id); setStep(2); }}
                className="p-10 border-4 border-primary bg-white hover:bg-accent group transition-all gumroad-shadow hover:translate-x-1 hover:translate-y-1 text-left flex flex-col h-full"
              >
                <r.icon className="w-12 h-12 mb-6 text-primary" />
                <div className="mt-auto">
                  <h3 className="text-2xl font-black uppercase italic text-primary">{r.title}</h3>
                  <p className="text-[10px] font-bold uppercase mt-2 text-primary/60 leading-relaxed">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-center">
             <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary underline mb-4">← Back</button>
             <h2 className="text-3xl font-black uppercase italic tracking-tighter">Setup your {selectedRole} Profile</h2>
          </div>

          <form className="max-w-md mx-auto space-y-4" onSubmit={handleFinalSubmit}>
            {/* PUBLISHER BRANDING SECTION */}
            {selectedRole === "Publisher" && (
              <div className="space-y-4 p-6 bg-accent border-4 border-black gumroad-shadow-sm mb-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest ml-1">Organization Name</label>
                  <Input name="tenant_name" placeholder="Empire Publishing" className="booka-input-minimal h-14 bg-white" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest ml-1">Storefront URL Slug</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-30 uppercase italic">{baseUrl}/</div>
                    <Input 
                      value={slugInput}
                      onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      placeholder="my-brand" 
                      className={cn("booka-input-minimal h-14 pl-28 bg-white", slugStatus?.available === false && "border-red-500 bg-red-50")} 
                      required 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isCheckingSlug ? <Loader2 className="animate-spin size-4 opacity-40" /> : 
                       slugInput.length > 2 && slugStatus?.available ? <CheckCircle2 className="text-green-600 size-4" /> :
                       slugInput.length > 2 && !slugStatus?.available ? <AlertCircle className="text-red-600 size-4" /> : null}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SHARED IDENTITY SECTION */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest ml-1">Username / Handle</label>
              <div className="relative">
                <Input 
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="TheRealKofi" 
                  className={cn("booka-input-minimal h-14", userStatus?.available === false && "border-red-500 bg-red-50")} 
                  required 
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isCheckingUser ? <Loader2 className="animate-spin size-4 opacity-40" /> : 
                   usernameInput.length > 2 && userStatus?.available ? <CheckCircle2 className="text-green-600 size-4" /> :
                   usernameInput.length > 2 && !userStatus?.available ? <AlertCircle className="text-red-600 size-4" /> : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1"><label className="text-[9px] font-black uppercase tracking-widest">First Name</label><Input name="first_name" className="booka-input-minimal h-14" required /></div>
               <div className="space-y-1"><label className="text-[9px] font-black uppercase tracking-widest">Last Name</label><Input name="last_name" className="booka-input-minimal h-14" required /></div>
            </div>

            <div className="space-y-1"><label className="text-[9px] font-black uppercase tracking-widest">Email Address</label><Input name="email" type="email" className="booka-input-minimal h-14" required /></div>
            <div className="space-y-1"><label className="text-[9px] font-black uppercase tracking-widest">Password</label><Input name="password" type="password" className="booka-input-minimal h-14" required /></div>
            
            <div className="pt-6">
              <Button 
                type="submit" 
                disabled={registerMutation.isPending || !userStatus?.available || (selectedRole === "Publisher" && !slugStatus?.available)} 
                className="w-full booka-button-primary h-20 text-xl"
              >
                {registerMutation.isPending ? "Finalizing..." : <>Complete Signup <ArrowRight size={20} /></>}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}