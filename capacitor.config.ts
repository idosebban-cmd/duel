import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.playduel',
  appName: 'Duel',
  webDir: 'dist',
  // Production: WebView loads the live SPA from playduel.app (same origin as the website).
  // For local-device dev, temporarily point this at your machine (e.g. http://192.168.x.x:5173).
  server: {
    url: 'https://playduel.app',
    cleartext: false,
    // WebView scheme must stay https with remote server.url — do not set to app.playduel.
    // Email/OAuth deep links use app.playduel:// via Android intent filters + @capacitor/app.
    androidScheme: 'https',
  },
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
