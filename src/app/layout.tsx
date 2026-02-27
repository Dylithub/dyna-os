import type { Metadata, Viewport } from "next";
import SessionProvider from "@/components/SessionProvider";
import { auth } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "DYNA OPTICS",
  description: "Lifestyle OS",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DYNA OPTICS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0f0a",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="font-mono">
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
