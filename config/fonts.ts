import {
  Inter as FontSans,
  JetBrains_Mono as FontMono,
  Inter as FontDisplay,
} from "next/font/google";

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const fontDisplay = FontDisplay({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});
