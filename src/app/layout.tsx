import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/PageTransition";
import { PricingSection } from "@/components/PricingSection";
import { ContactFooter } from "@/components/ContactFooter";
import { ThemeProvider } from "@/components/ThemeProvider";

// Runs before hydration, straight from a <head> <script> — reads the saved
// choice and flips the class synchronously, so there's no flash of the
// light theme while React boots up when a visitor has dark mode saved.
const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem("theme")==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();`;

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
    <html
      lang="en"
      className={`${jakarta.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <PageTransition>
            <Navbar />
            {children}
            <PricingSection />
            <ContactFooter />
          </PageTransition>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
