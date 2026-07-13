import { Backdrop } from "@/components/landing/backdrop";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { CallToAction } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";


export default async function HomePage() {

  return (
    <main className="relative min-h-screen">
      <Backdrop />
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <CallToAction />
      <Footer />
    </main>
  );
}

