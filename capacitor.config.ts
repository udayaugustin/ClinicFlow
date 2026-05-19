import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wisright.clinikflow',
  appName: 'Clinik',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Geolocation: {
      requestPermissions: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
