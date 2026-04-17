import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GrongMarki",
  description: "Grond helder in beeld. Beheer landmeting aanvragen in Suriname.",
  manifest: "/manifest.json",
  icons: {
    icon: "/brand/grongmarki-icon.svg",
    apple: "/brand/grongmarki-icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GrongMarki",
  },
};

export const viewport: Viewport = {
  themeColor: "#1F6A43",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className={`${inter.variable} ${manrope.variable} font-sans`}>
        <Providers>{children}</Providers>
        <script
          src="/sw-init.js"
          data-is-prod={process.env.NODE_ENV === "production"}
        />
      </body>
    </html>
  );
}
