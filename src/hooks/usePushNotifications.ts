import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isCapacitor } from '@/lib/capacitor';

export const usePushNotifications = (userId: string | null) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isCapacitor() || !userId) return;

    const setupPush = async () => {
      // 1. Create Android notification channel (REQUIRED for Android 8+)
      // Without this, all notifications are silently dropped on Android
      await PushNotifications.createChannel({
        id: 'new_orders',
        name: 'New Orders',
        description: 'Push notifications for new customer orders',
        importance: 5, // IMPORTANCE_HIGH
        visibility: 1, // VISIBILITY_PUBLIC
        sound: 'default',
        lights: true,
        lightColor: '#C9A227',
        vibration: true,
      });

      // 2. Request permission
      let permStatus = await PushNotifications.checkPermissions();
      console.log('[PushNotifications] Permission status:', permStatus.receive);

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[PushNotifications] Permission not granted:', permStatus.receive);
        return;
      }

      // 3. Register with FCM
      console.log('[PushNotifications] Registering with FCM...');
      await PushNotifications.register();
    };

    setupPush();

    // 3. Token received — save to Supabase
    const tokenListener = PushNotifications.addListener('registration', async (token) => {
      console.log('[PushNotifications] FCM token:', token.value);
      // Type cast needed until admin_devices is added to generated Supabase types
      await (supabase as any).from('admin_devices').upsert(
        { user_id: userId, fcm_token: token.value, platform: 'android', updated_at: new Date().toISOString() },
        { onConflict: 'user_id,fcm_token' }
      );
    });

    // 4. Registration error
    const errorListener = PushNotifications.addListener('registrationError', (err) => {
      console.error('[PushNotifications] Registration error:', err);
    });

    // 5. Foreground notification — show toast
    const foregroundListener = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      toast({
        title: notification.title ?? 'New Notification',
        description: notification.body,
      });
    });

    // 6. Notification tap — navigate to admin
    const tapListener = PushNotifications.addListener('pushNotificationActionPerformed', () => {
      navigate('/admin');
    });

    return () => {
      tokenListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      foregroundListener.then(l => l.remove());
      tapListener.then(l => l.remove());
    };
  }, [userId, navigate, toast]);
};
