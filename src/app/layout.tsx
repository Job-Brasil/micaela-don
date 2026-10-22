import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Um Gesto de Apoio — A história da Micaela",
  description:
    "Campanha de solidariedade. Cada contribuição é um gesto concreto de cuidado. Dados de pagamento verificados administrativamente; cada donativo é confirmado manualmente.",
  keywords: ["solidariedade", "donativo", "Micaela", "campanha", "apoio"],
  authors: [{ name: "Um Gesto de Apoio" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Um Gesto de Apoio — A história da Micaela",
    description: "Campanha de solidariedade. Apoie com transparência.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
