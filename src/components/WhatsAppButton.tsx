import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export const WhatsAppButton = () => {
  const phoneNumber = "+923241693025";
  const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\+/g, "")}`;
  const [shouldMoveUp, setShouldMoveUp] = useState(false);
  const location = useLocation();
  const isProductPage = location.pathname.startsWith('/product/');

  // Check if on product page and scrolled down to show sticky bar
  useEffect(() => {
    const handleScroll = () => {
      const hasScrolled = window.scrollY > 500;
      setShouldMoveUp(isProductPage && hasScrolled);
    };
    
    handleScroll(); // Check on mount
    window.addEventListener('scroll', handleScroll);
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed right-3 z-40 animate-fade-in transition-all duration-300 ${
        isProductPage ? 'hidden sm:block' : ''
      } ${
        shouldMoveUp ? 'bottom-36' : 'bottom-20 sm:bottom-24'
      }`}
    >
      <Button
        size="icon"
        className="h-12 w-12 rounded-full bg-[#25D366] shadow-lg transition-all hover:bg-[#20BA5A] hover:shadow-xl sm:h-14 sm:w-14"
      >
        <MessageCircle className="h-5 w-5 fill-white text-white sm:h-6 sm:w-6" />
      </Button>
    </a>
  );
};
