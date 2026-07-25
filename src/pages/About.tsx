import { Link } from "react-router-dom";
import { ArrowRight, Gem, HandHeart, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";

const About = () => {
  return (
    <>
      <SEOHead title="Our Story — Juraab" description="Discover Juraab's point of view: considered objects, lasting quality, and a simpler way to shop for everyday beauty." canonicalUrl="https://juraab.shop/about" />
      <div className="min-h-screen">
        <Navbar />
        <main>
          <section className="page-wrap pt-6 sm:pt-10">
            <div className="liquid-dark relative overflow-hidden rounded-[32px] px-6 py-16 sm:px-12 sm:py-20 lg:px-16 lg:py-24">
              <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative z-10 grid items-end gap-10 lg:grid-cols-[1.15fr_.7fr]">
                <div>
                  <p className="section-kicker !text-white/55">Our point of view</p>
                  <h1 className="editorial-title max-w-4xl text-5xl sm:text-6xl lg:text-7xl">A beautiful life is built one considered detail at a time.</h1>
                </div>
                <p className="max-w-md text-base leading-8 text-white/65">Juraab brings together distinctive home and personal pieces that feel special, work beautifully, and remain easy to live with.</p>
              </div>
            </div>
          </section>

          <section className="section-pad page-wrap">
            <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
              <div><p className="section-kicker">The story</p><h2 className="editorial-title text-4xl sm:text-5xl">Curated with care, presented with clarity.</h2></div>
              <div className="space-y-6 text-base leading-8 text-muted-foreground sm:text-lg">
                <p>Juraab began with a simple belief: premium shopping should feel warm and straightforward. You should be able to understand a product, trust what you see, and place an order without navigating a maze.</p>
                <p>Our collection spans decor, furniture, accessories, and gifting pieces. Each item is considered for its material, finish, usefulness, and the character it can bring to everyday life.</p>
              </div>
            </div>
          </section>

          <section className="bg-secondary/45 py-16 sm:py-20">
            <div className="page-wrap">
              <div className="mb-10 max-w-2xl"><p className="section-kicker">What guides us</p><h2 className="editorial-title text-4xl sm:text-5xl">Quiet standards. Meaningful service.</h2></div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { icon: Gem, title: "Considered quality", text: "Material, finish, and everyday durability matter more to us than passing trends." },
                  { icon: Sparkles, title: "Timeless character", text: "We look for pieces that feel distinctive now and continue to feel right over time." },
                  { icon: HandHeart, title: "Genuinely helpful", text: "Clear information and human support keep every step—from choosing to ordering—simple." },
                ].map(({ icon: Icon, title, text }) => (
                  <article key={title} className="liquid-glass rounded-[26px] p-6 sm:p-7">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Icon className="h-5 w-5" /></span>
                    <h3 className="mt-6 font-sans text-lg font-semibold">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="section-pad page-wrap">
            <div className="rounded-[30px] border bg-card/65 px-6 py-12 text-center sm:px-10 sm:py-16">
              <p className="section-kicker">Explore Juraab</p>
              <h2 className="editorial-title mx-auto max-w-3xl text-4xl sm:text-5xl">Objects chosen to make the everyday feel more considered.</h2>
              <Button asChild size="lg" className="mt-8 h-14 rounded-full px-7"><Link to="/shop">Explore the collection <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default About;
