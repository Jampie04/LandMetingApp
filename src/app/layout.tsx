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
  title: "LandMeting App",
  description: "Beheer landmeting aanvragen in Suriname",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LandMeting",
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
          dangerouslySetInnerHTML={{
            __html: `
              if ("serviceWorker" in navigator) {
                window.addEventListener("load", function() {
                  const isProd = ${JSON.stringify(process.env.NODE_ENV === "production")};

                  if (isProd) {
                    navigator.serviceWorker.register("/sw.js");
                  } else {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      registrations.forEach(function(registration) {
                        registration.unregister();
                      });
                    });

                    if ("caches" in window) {
                      caches.keys().then(function(keys) {
                        keys.forEach(function(key) {
                          caches.delete(key);
                        });
                      });
                    }
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
