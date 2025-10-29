import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SaleTimer = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  const { data: promotionalBars } = useQuery({
    queryKey: ['promotional-bars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotional_bars')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Auto-rotate promotional bars
  useEffect(() => {
    if (!promotionalBars || promotionalBars.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promotionalBars.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [promotionalBars]);

  // Calculate countdown for current bar if needed
  useEffect(() => {
    if (!promotionalBars || promotionalBars.length === 0) {
      setTimeLeft(null);
      return;
    }

    const currentBar = promotionalBars[currentIndex];
    if (!currentBar?.show_countdown || !currentBar?.end_date) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const difference = new Date(currentBar.end_date).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [promotionalBars, currentIndex]);

  if (!promotionalBars || promotionalBars.length === 0) return null;

  const currentBar = promotionalBars[currentIndex];

  const barContent = (
    <div 
      className="py-2 px-4 text-center transition-colors"
      style={{
        backgroundColor: currentBar.background_color,
        color: currentBar.text_color,
      }}
    >
      <p className="text-sm font-semibold">
        {currentBar.icon && <span className="mr-2">{currentBar.icon}</span>}
        {currentBar.title}
        {timeLeft && currentBar.show_countdown && (
          <span className="ml-2">
            - Ending in: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </span>
        )}
      </p>
    </div>
  );

  if (currentBar.link_url) {
    return (
      <a href={currentBar.link_url} className="block hover:opacity-90 transition-opacity">
        {barContent}
      </a>
    );
  }

  return barContent;
};
