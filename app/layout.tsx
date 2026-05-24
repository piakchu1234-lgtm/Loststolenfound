import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://loststolenfound.vercel.app"),
  title: "LostStolenFound | Malvern East Community Map",
  description:
    "The real-time interactive map for tracking lost pets, found items, and neighborhood alerts in Malvern East.",
  openGraph: {
    type: "website",
    locale: "en_AU",
    title: "LostStolenFound | Malvern East Community Map",
    description:
      "The real-time interactive map for tracking lost pets, found items, and neighborhood alerts in Malvern East.",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "LostStolenFound | Malvern East Community Map",
    description:
      "The real-time interactive map for tracking lost pets, found items, and neighborhood alerts in Malvern East.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
