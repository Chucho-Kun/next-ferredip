import Footer from "@/src/shared/components/footer/Footer";
import GoogleTagManager from "@/src/shared/components/GoogleTagManager";
import Header from "@/src/shared/components/header/Header";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
        <GoogleTagManager />
        <Header />
        {children}
        <Footer />
    </>
  );
}
