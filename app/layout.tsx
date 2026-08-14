import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast"
import Script from "next/script";


const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  adjustFontFallback: false
});

export const metadata: Metadata = {
  title: "Dipemsa | Bienvenidos",
  description: "Somos DIPEMSA una empresa de construcción ligera distribuidora de materiales de construcción ligera, contamos con las mejores marcas y stock siempre en existencia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${jost.variable} h-full bg-white antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-jost">
        {children}
        <Toaster
          position="top-center"
        />
      </body>
    </html>
  );
}
