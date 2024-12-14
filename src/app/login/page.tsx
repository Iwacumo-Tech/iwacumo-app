import LoginForm from "@/components/login/login-form";
import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import Image from "next/image";

export default async function LoginPage () {
  return (
    <div className="w-screen h-screen">
      <SessionProvider>
        <Suspense>
          <div className={"  grid grid-cols-1 md:grid-cols-2 h-full"}>
            <div
              className={
                "bg-[url('/login-bg.svg')] bg-cover bg-no-repeat px-10 h-full flex-col justify-between hidden md:flex"
              }
            >
              <Image src={"/boy.svg"} alt={"boy"} width={560} height={525} />
            </div>
            <div
              className={
                "flex flex-col items-center justify-items-center justify-center h-full"
              }
            >
              <LoginForm />
            </div>
          </div>
        </Suspense>
      </SessionProvider>
    </div>
  );
}
