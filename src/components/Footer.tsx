import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter } from "lucide-react";
import logo from "@/assets/logo.jpg";

export const Footer = () => {
  return (
    <footer className="glass border-t py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <img src={logo} alt="The Shopping Cart" className="h-16 w-auto mb-4" />
            <p className="text-sm mb-4">Premium lifestyle products for the discerning customer.</p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-accent transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-accent transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-accent transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/shop" className="hover:text-accent transition-colors">Shop</Link></li>
              <li><Link to="/about" className="hover:text-accent transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Categories</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/shop?category=home-decor" className="hover:text-accent transition-colors">Home Décor</Link></li>
              <li><Link to="/shop?category=mens-wallets" className="hover:text-accent transition-colors">Men's Wallets</Link></li>
              <li><Link to="/shop?category=womens-wallets" className="hover:text-accent transition-colors">Women's Wallets</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/contact" className="hover:text-accent transition-colors">Contact Us</Link></li>
              <li><Link to="/contact" className="hover:text-accent transition-colors">Privacy Policy</Link></li>
              <li><Link to="/contact" className="hover:text-accent transition-colors">Terms of Service</Link></li>
              <li><Link to="/contact" className="hover:text-accent transition-colors">Returns & Exchanges</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-sm">
          <p>&copy; 2024 The Shopping Cart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};