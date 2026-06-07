import type { Metadata } from "next";
import { GoogleTagManager } from "@next/third-parties/google";
import { Poppins, Roboto } from "next/font/google";
import { Suspense } from "react";
import { AttributionTracker } from "@/components/providers/AttributionTracker";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-poppins",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Measurable",
  description: "Measurable frontend MVP",
};

const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${roboto.variable}`}>
      <body className="antialiased">
        {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
        <LanguageProvider>
          <Suspense fallback={null}>
            <AttributionTracker />
          </Suspense>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
