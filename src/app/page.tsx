"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PERMISSIONS } from "@/lib/constants";
import { useSession } from "next-auth/react";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import Banner from "@/components/home/Banner";
import Footer from "@/components/shared/Footer";
import Product from "@/components/home/FeaturedProduct";
import Header from "@/components/shared/Header";


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
      <Features />
      <Banner />
      <Product />
      <Footer />
    </main>
  );
}
