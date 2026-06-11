import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = (
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://mekkzai.com"
).replace(/\/$/, "");

const config: CapacitorConfig = {
  appId: "com.mekkzai.app",
  appName: "mekkz AI",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: "https"
  },
  android: {
    allowMixedContent: false
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#050810",
      showSpinner: false
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#050810"
    }
  }
};

export default config;
