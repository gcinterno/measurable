import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Measurable",
  description: "Measurable frontend MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
