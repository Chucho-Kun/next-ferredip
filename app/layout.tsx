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
  metadataBase: new URL("https://ferredip.com.mx"),
  title: {
    default: "Ferredip | Bienvenidos",
    template: "%s",
  },
  description: "Somos Ferredip una empresa de venta de Herramientas",
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
