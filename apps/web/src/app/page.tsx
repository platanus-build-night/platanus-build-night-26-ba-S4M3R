import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/landing/hero";
import { Summon } from "@/components/landing/summon";
import { Features } from "@/components/landing/features";
import { SecurityModel } from "@/components/landing/security-model";
import { Faq } from "@/components/landing/faq";
import { Cta } from "@/components/landing/cta";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-16">
        <Hero />
        <Summon />
        <Features />
        <SecurityModel />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
