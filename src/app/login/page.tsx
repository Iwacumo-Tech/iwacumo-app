import LoginForm from "@/components/login/login-form";
import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";

export default async function LoginPage() {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <SessionProvider>
        <Suspense>
          <div className="flex flex-col items-center justify-center w-full h-full">
            <LoginForm />
          </div>
        </Suspense>
      </SessionProvider>
    </div>
  );
}
