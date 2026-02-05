import { RegisterForm } from "@/components/register/register-form";
import Link from "next/link";
import { Metadata } from "next";
import { Suspense } from "react"; 

export const metadata: Metadata = {
  title: "Join Booka | Create Your Account",
  description: "Start your journey as a reader, author, or publisher.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-4xl">
        <div className="flex flex-col items-center mb-12">
          <Link href="/" className="text-4xl font-black uppercase italic tracking-tighter mb-4">
            Booka<span className="text-accent">.</span>
          </Link>
          <h1 className="text-2xl font-black uppercase italic text-primary">Create an account</h1>
          <p className="text-sm font-medium text-muted-foreground mt-2">
            Select your path and join the African literary revolution.
          </p>
        </div>
        
       
        <Suspense fallback={
          <div className="h-96 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-black border-t-accent animate-spin" />
            <p className="font-black uppercase italic text-xs tracking-widest animate-pulse">Initializing Register...</p>
          </div>
        }>
          <RegisterForm />
        </Suspense>

        <p className="mt-12 text-center text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary underline underline-offset-4 hover:text-accent transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}