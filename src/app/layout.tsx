import type { Metadata } from "next";
import { cache } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { createAdminClient } from "@/lib/supabase/admin";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const getLayoutSettings = cache(async () => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("restaurant_settings")
    .select("primary_color, favicon_url")
    .limit(1)
    .maybeSingle();
  return data;
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getLayoutSettings();
  const faviconUrl = settings?.favicon_url ?? "/favicon.svg";
  return {
    title: {
      default: "QR Dining",
      template: "%s · QR Dining",
    },
    description: "Scan, browse, order — a modern restaurant QR dining system.",
    icons: {
      icon: faviconUrl,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getLayoutSettings();
  const primaryColor = settings?.primary_color ?? "#e23744";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--primary:${primaryColor};--app-primary:${primaryColor};--ring:${primaryColor};--sidebar-primary:${primaryColor};--sidebar-ring:${primaryColor};--chart-1:${primaryColor};--destructive:${primaryColor};--danger:${primaryColor};}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <QueryProvider>
          {children}
          <Toaster richColors position="top-center" />
        </QueryProvider>
      </body>
    </html>
  );
}
