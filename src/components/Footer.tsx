import { Link } from "react-router-dom";
import { ArrowUpRight, Facebook, Instagram, Mail } from "lucide-react";

export const Footer = () => {
  const handleLinkClick = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="mt-12 border-t border-white/60 bg-primary text-primary-foreground">
      <div className="page-wrap py-14 sm:py-20">
        <div className="grid gap-12 border-b border-white/15 pb-14 lg:grid-cols-[1.4fr_.7fr_.7fr_.8fr]">
          <div className="max-w-md">
            <Link to="/" onClick={handleLinkClick} className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 font-display text-2xl italic ring-1 ring-white/20">J</span>
              <span className="text-xl font-semibold tracking-[0.24em]">JURAAB</span>
            </Link>
            <h2 className="mt-8 font-display text-3xl font-normal leading-tight sm:text-4xl">Quietly beautiful objects for everyday life.</h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/62">A considered collection of home, personal, and gifting pieces—selected for quality, character, and lasting appeal.</p>
            <div className="mt-7 flex gap-2">
              <a href="https://www.facebook.com/share/1EgybenFiL/" target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition-colors hover:bg-white hover:text-primary" aria-label="Juraab on Facebook"><Facebook className="h-4 w-4" /></a>
              <a href="https://www.instagram.com/juraab.official?igsh=MTMzbGd3ZXhvMHFvbA==" target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition-colors hover:bg-white hover:text-primary" aria-label="Juraab on Instagram"><Instagram className="h-4 w-4" /></a>
            </div>
          </div>

          <div>
            <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Explore</h3>
            <ul className="mt-6 space-y-4 text-sm text-white/72">
              <li><Link to="/shop" onClick={handleLinkClick} className="hover:text-white">Shop all</Link></li>
              <li><Link to="/shop?category=home-decor" onClick={handleLinkClick} className="hover:text-white">Home decor</Link></li>
              <li><Link to="/shop?category=furniture" onClick={handleLinkClick} className="hover:text-white">Furniture</Link></li>
              <li><Link to="/shop?category=accessories" onClick={handleLinkClick} className="hover:text-white">Accessories</Link></li>
              <li><Link to="/blog" onClick={handleLinkClick} className="hover:text-white">Journal</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Customer care</h3>
            <ul className="mt-6 space-y-4 text-sm text-white/72">
              <li><Link to="/orders" onClick={handleLinkClick} className="hover:text-white">Track your order</Link></li>
              <li><Link to="/contact" onClick={handleLinkClick} className="hover:text-white">Delivery & returns</Link></li>
              <li><Link to="/contact" onClick={handleLinkClick} className="hover:text-white">Contact us</Link></li>
              <li><Link to="/about" onClick={handleLinkClick} className="hover:text-white">Our story</Link></li>
            </ul>
          </div>

          <div className="rounded-[26px] border border-white/15 bg-white/[.06] p-6">
            <Mail className="h-5 w-5 text-accent" />
            <h3 className="mt-5 font-display text-2xl font-normal">Need a little help?</h3>
            <p className="mt-3 text-sm leading-6 text-white/62">Our team can help you choose, order, or track any item.</p>
            <Link to="/contact" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-primary transition-transform hover:-translate-y-0.5">Talk to us <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-7 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Juraab. All rights reserved.</p>
          <p>Secure checkout · Cash on delivery · Thoughtful service</p>
        </div>
      </div>
    </footer>
  );
};
