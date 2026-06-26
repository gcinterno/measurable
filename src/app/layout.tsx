import type { Metadata } from "next";
import { GoogleTagManager } from "@next/third-parties/google";
import { Poppins, Roboto } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { AttributionTracker } from "@/components/providers/AttributionTracker";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { MetaPixelProvider } from "@/components/providers/MetaPixelProvider";
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
const metaPixelEnabled =
  process.env.NEXT_PUBLIC_META_PIXEL_ENABLED === "true" &&
  Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${roboto.variable}`}>
      <body className="antialiased">
        {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
        {metaPixelEnabled ? (
          <Script
            id="meta-pixel-base"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');`,
            }}
          />
        ) : null}
        <LanguageProvider>
          <Suspense fallback={null}>
            <AttributionTracker />
          </Suspense>
          <Suspense fallback={null}>
            <MetaPixelProvider />
          </Suspense>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
