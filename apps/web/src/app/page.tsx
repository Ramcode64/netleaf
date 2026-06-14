import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { CompareTable } from "@/components/landing/CompareTable";
import { CodeDemo } from "@/components/landing/CodeDemo";
import { Pricing } from "@/components/landing/Pricing";
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
      </main>
      <Footer />
    </>
  );
}
