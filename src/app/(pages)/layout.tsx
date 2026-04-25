import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { TawkChat } from "@/components/shared/tawk-chat";

export default function AppLayout ({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TawkChat />
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
