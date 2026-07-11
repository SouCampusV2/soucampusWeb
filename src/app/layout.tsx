import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/PageTransition";
import { PricingSection } from "@/components/PricingSection";
import { ContactFooter } from "@/components/ContactFooter";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SouCampus builds — Minecraft builds on order",
  description: "Custom Minecraft builds on order: castles, spawns, cities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <PageTransition>
          <Navbar />
          {children}
          <PricingSection />
          <ContactFooter />
        </PageTransition>
      </body>
    </html>
  );
}
