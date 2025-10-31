import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export const WhatsAppButton = () => {
  const phoneNumber = "+923241693025";
  const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\+/g, "")}`;
  const [shouldMoveUp, setShouldMoveUp] = useState(false);
  const location = useLocation();

  // Check if on product page and scrolled down to show sticky bar
  useEffect(() => {
    const handleScroll = () => {
      const isProductPage = location.pathname.startsWith('/product/');
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
      className={`fixed right-4 z-40 animate-fade-in transition-all duration-300 ${
        shouldMoveUp ? 'bottom-44' : 'bottom-24'
      }`}
    >
      <Button
        size="icon"
        className="h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#20BA5A] shadow-lg hover:shadow-xl transition-all"
      >
        <MessageCircle className="h-6 w-6 text-white fill-white" />
      </Button>
    </a>
  );
};
