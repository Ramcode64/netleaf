import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { CodeDemo } from "@/components/landing/CodeDemo";
import { CompareTable } from "@/components/landing/CompareTable";
import { Pricing } from "@/components/landing/Pricing";
import { Cta } from "@/components/landing/Cta";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <CodeDemo />
        <CompareTable />
        <Pricing />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
