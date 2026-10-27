import {
  Figtree as FontSans,
  JetBrains_Mono as FontMono,
  Syne as FontDisplay,
} from "next/font/google";

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-figtree",
});

export const fontDisplay = FontDisplay({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["500", "600", "700", "800"],
});

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});
