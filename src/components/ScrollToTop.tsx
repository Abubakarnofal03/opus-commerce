import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Track TikTok Pixel PageView on route change
    if (typeof window !== 'undefined' && window.ttq && typeof window.ttq.track === 'function') {
      try {
        window.ttq.track('PageView');
        console.log('TikTok Pixel: PageView tracked', { pathname });
      } catch (error) {
        console.error('TikTok Pixel error:', error);
      }
    }
  }, [pathname]);

  return null;
}
