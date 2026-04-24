import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { PublicTranslationProvider } from "@/components/shared/translation-provider";

export default function AppLayout ({ children }: { children: React.ReactNode }) {
  return (
    <PublicTranslationProvider>
      <>
        <Header />
        <main>{children}</main>
        <Footer />
      </>
    </PublicTranslationProvider>
  );
}
