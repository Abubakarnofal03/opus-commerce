import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.530b8833de7241d6b52c31eaefb91fe7',
  appName: 'opus-commerce',
  webDir: 'dist',
  server: {
    url: 'https://530b8833-de72-41d6-b52c-31eaefb91fe7.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
