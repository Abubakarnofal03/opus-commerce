import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Track an analytics event
export const trackEvent = async (
  eventType: 'page_view' | 'add_to_cart' | 'purchase' | 'checkout_start',
  metadata: Record<string, any> = {}
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const sessionId = getSessionId();

    await supabase.from('analytics_events').insert({
      event_type: eventType,
      page_path: window.location.pathname + window.location.search,
      user_id: user?.id || null,
      session_id: sessionId,
      metadata,
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};

// Hook to track page views automatically
export const usePageViewTracking = () => {
  const location = useLocation();

  useEffect(() => {
    trackEvent('page_view');
  }, [location.pathname, location.search]);
};
