const config = {
  appId: "com.rejisterjack.verk",
  appName: "Verk",
  webDir: "public",
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "https://verk.rejisterjack.com",
    cleartext: false,
  },
};

export default config;
