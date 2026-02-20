import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { SecurityModel } from "@/components/landing/security-model";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-16">
        <Hero />
        <Features />
        <SecurityModel />
      </main>
      <Footer />
    </div>
  );
}
