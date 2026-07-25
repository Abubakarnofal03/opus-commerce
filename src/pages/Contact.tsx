import { ArrowUpRight, Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";

const contactOptions = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "Chat with our team",
    note: "Best for quick product and order questions",
    href: "https://wa.me/923241693025",
  },
  {
    icon: Phone,
    label: "Call",
    value: "+92 324 1693025",
    note: "For help choosing or placing an order",
    href: "tel:+923241693025",
  },
  {
    icon: Mail,
    label: "Email",
    value: "info.theshoppingcartt@gmail.com",
    note: "For detailed questions and follow-ups",
    href: "mailto:info.theshoppingcartt@gmail.com",
  },
];

const Contact = () => {
  return (
    <>
      <SEOHead title="Contact Juraab" description="Get help choosing a product, placing an order, or tracking a delivery. The Juraab team is here to help." canonicalUrl="https://juraab.shop/contact" />
      <div className="min-h-screen">
        <Navbar />
        <main>
          <section className="page-wrap pt-6 sm:pt-10">
            <div className="relative overflow-hidden rounded-[32px] bg-primary px-6 py-16 text-primary-foreground sm:px-12 sm:py-20 lg:px-16">
              <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative z-10 max-w-3xl">
                <p className="section-kicker !text-white/55">We are here to help</p>
                <h1 className="editorial-title text-5xl sm:text-6xl lg:text-7xl">A real person, whenever you need one.</h1>
                <p className="mt-5 max-w-xl text-base leading-8 text-white/65">Questions about a product, an order, or delivery? Choose the easiest way to reach us.</p>
              </div>
            </div>
          </section>

          <section className="section-pad page-wrap">
            <div className="grid gap-4 lg:grid-cols-3">
              {contactOptions.map(({ icon: Icon, label, value, note, href }) => (
                <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} className="liquid-glass glass-hover group rounded-[26px] p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Icon className="h-5 w-5" /></span>
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </div>
                  <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                  <h2 className="mt-2 break-words font-sans text-lg font-semibold">{value}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{note}</p>
                </a>
              ))}
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
              <div className="rounded-[28px] border bg-card/65 p-6 sm:p-8">
                <p className="section-kicker">What we can help with</p>
                <h2 className="editorial-title text-3xl sm:text-4xl">From “Which one?” to “Where is my order?”</h2>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {["Choosing the right product", "Placing an order", "Delivery and tracking", "Returns and aftercare"].map((item) => <div key={item} className="rounded-2xl bg-secondary/55 px-4 py-3 text-sm font-medium">{item}</div>)}
                </div>
              </div>
              <div className="liquid-dark rounded-[28px] p-6 sm:p-8">
                <Clock3 className="h-6 w-6 text-accent" />
                <h2 className="mt-6 font-display text-3xl font-normal">Thoughtful, human support.</h2>
                <p className="mt-4 text-sm leading-7 text-white/60">If we do not answer immediately, leave a message with your name and order number. We will get back to you as soon as possible.</p>
                <div className="mt-7 flex items-center gap-3 border-t border-white/12 pt-6 text-sm text-white/65"><MapPin className="h-4 w-4 text-accent" /> Based in Pakistan</div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Contact;
