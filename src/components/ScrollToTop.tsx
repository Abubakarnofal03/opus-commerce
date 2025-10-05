import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Track TikTok Pixel PageView on route change
    if (typeof window !== 'undefined' && window.ttq) {
      window.ttq('track', 'PageView');
      console.log('TikTok Pixel: PageView tracked', { pathname });
    }
  }, [pathname]);

  return null;
}
