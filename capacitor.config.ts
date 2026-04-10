import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.playduel',
  appName: 'Duel',
  webDir: 'dist',
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
