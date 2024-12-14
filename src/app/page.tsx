"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PERMISSIONS } from "@/lib/constants";
import { useSession } from "next-auth/react";
import Header from "@/components/shared/Header";
import Hero from "@/components/home/Hero";
import Categories from "@/components/home/Categories";
import Books from "@/components/home/Books";
import Authors from "@/components/home/Authors";
import Newsletter from "@/components/home/Newsletter";
import Footer from "@/components/shared/Footer";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const isPublisher = session?.roles.some((pe) => {
    pe.name === PERMISSIONS.PUBLISHER;
  });

  useEffect(() => {
    console.log("session: ", session);

    if (status === "loading") {
      return;
    }

    if (!session) {
      // router.push("/login");
      router.push("/");
    } else {
      if (isPublisher) {
        router.push("/publisher");
      }

      router.push("/app");
    }
  }, [session, status, router, isPublisher]);

  return (
    <main>
      <Header />
      <Hero />
      <Categories />
      <Books />
      <Authors />
      <Newsletter />
      <Footer />
    </main>
  );
}
