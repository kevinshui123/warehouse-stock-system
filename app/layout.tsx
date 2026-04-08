/**
 * Root layout: fonts, metadata (SEO), and providers (Query, Auth, Theme, Toaster).
 * Wraps all pages; force-dynamic so useSearchParams and server session work correctly.
 */
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeyboardShortcutsProvider } from "@/components/providers/KeyboardShortcutsProvider";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";
import React from "react";
import { AuthProvider } from "@/contexts";
import { QueryProvider } from "@/lib/react-query";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { SuppressApiErrorOverlay } from "@/components/shared/SuppressApiErrorOverlay";
import { LanguageProvider } from "@/contexts/language-context";
import { APP_DISPLAY_NAME } from "@/lib/brand";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

/** Force dynamic rendering for all routes so useSearchParams etc. work without Suspense and pages render instantly. */
export const dynamic = "force-dynamic";

const siteUrl =
  (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "") ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

export const metadata = {
  title: {
    default: `${APP_DISPLAY_NAME} — Warehouse & Inventory`,
    template: `%s | ${APP_DISPLAY_NAME}`,
  },
  description:
    `${APP_DISPLAY_NAME}: warehouse and inventory management. Manage products, categories, suppliers, orders, invoices, and warehouses with role-based access.`,
  authors: [
    {
      name: "Arnob Mahmud",
      url: "https://www.arnobmahmud.com",
      email: "contact@arnobmahmud.com",
    },
  ],
  creator: "Arnob Mahmud",
  publisher: "Arnob Mahmud",
  applicationName: APP_DISPLAY_NAME,
  keywords: [
    "stock inventory",
    "inventory management",
    "warehouse management",
    "stock management system",
    "Next.js",
    "React",
    "Prisma",
    "product catalog",
    "orders",
    "invoices",
    "suppliers",
    "categories",
    "JWT authentication",
    "responsive web app",
    "business dashboard",
    "Arnob Mahmud",
  ],
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
    other: [{ rel: "icon", url: "/favicon.ico" }],
  },
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    title: `${APP_DISPLAY_NAME} — Warehouse & Inventory`,
    description:
      `Manage products, orders, invoices, and warehouses with ${APP_DISPLAY_NAME}.`,
    url: siteUrl,
    siteName: APP_DISPLAY_NAME,
    images: [
      {
        url: "/favicon.ico",
        width: 32,
        height: 32,
        alt: `${APP_DISPLAY_NAME}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_DISPLAY_NAME} — Warehouse & Inventory`,
    description:
      `Manage products, orders, invoices, and warehouses with ${APP_DISPLAY_NAME}.`,
    images: ["/favicon.ico"],
  },
  robots: {
    index: true,
    follow: true,
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
      suppressHydrationWarning
      style={{ overscrollBehavior: "none" }}
      data-scroll-behavior="smooth"
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`}
        suppressHydrationWarning
        style={{ overscrollBehavior: "none" }}
      >
        <ErrorBoundary>
          <QueryProvider>
            <LanguageProvider>
              <AuthProvider>
                <SuppressApiErrorOverlay />
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                  disableTransitionOnChange
                >
                  <TooltipProvider delayDuration={200}>
                    <KeyboardShortcutsProvider>
                      {children}
                    </KeyboardShortcutsProvider>
                  </TooltipProvider>
                </ThemeProvider>
                <Toaster />
              </AuthProvider>
            </LanguageProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
