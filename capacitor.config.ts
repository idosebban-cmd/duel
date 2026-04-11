import type { CapacitorConfig } from '@capacitor/cli';

const isAndroid = process.env.CAPACITOR_PLATFORM === 'android';

const config: CapacitorConfig = {
  appId: 'app.playduel',
  appName: 'Duel',
  webDir: 'dist',
  ...(isAndroid ? {
    server: {
      url: 'https://playduel.app',
      cleartext: false,
      androidScheme: 'https',
    }
  } : {}),
  plugins: {
    PushNotifications: {
      presentationOptions: [],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#12122A',
    },
  },
};

export default config;
