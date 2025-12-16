import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Check if running in Capacitor native environment
const isNative = () => {
  return typeof (window as any).Capacitor !== 'undefined';
};

export const usePushNotifications = (userId: string | null) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');

  useEffect(() => {
    if (!userId || !isNative()) return;

    const registerPushNotifications = async () => {
      try {
        // Dynamically import Capacitor push notifications plugin
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        setPermissionStatus(permResult.receive);

        if (permResult.receive !== 'granted') {
          console.log('Push notification permission not granted');
          return;
        }

        // Register with FCM
        await PushNotifications.register();

        // Listen for registration success
        PushNotifications.addListener('registration', async (token) => {
          console.log('FCM Token:', token.value);
          
          // Save token to database
          const { error } = await supabase
            .from('device_tokens')
            .upsert({
              user_id: userId,
              fcm_token: token.value,
              device_info: {
                platform: 'android',
                registered_at: new Date().toISOString(),
              },
            }, {
              onConflict: 'user_id,fcm_token',
            });

          if (error) {
            console.error('Error saving FCM token:', error);
          } else {
            setIsRegistered(true);
            console.log('FCM token saved successfully');
          }
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });

        // Handle received notifications when app is in foreground
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
        });

        // Handle notification tap
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed:', notification);
          const data = notification.notification.data;
          
          // Navigate to orders tab or specific order
          if (data?.type === 'new_order' && data?.orderId) {
            // Dispatch custom event for navigation
            window.dispatchEvent(new CustomEvent('openOrder', { 
              detail: { orderId: data.orderId } 
            }));
          }
        });

      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    };

    registerPushNotifications();
  }, [userId]);

  return { isRegistered, permissionStatus };
};
