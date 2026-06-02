import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import AuthProvider from "@/components/auth-provider";
import { ProjectProvider } from "@/components/project-context";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "مدیریت بدهی و سررسید خرید مصالح | ساخت‌یار",
  description: "سیستم مدیریت بدهی خرید مصالح پروژه‌های ساختمانی، کنترل سررسید پرداخت و هشدار هوشمند",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${vazirmatn.variable} font-sans antialiased bg-background text-foreground`}
        suppressHydrationWarning  
      >
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange={false}
          >
            <ProjectProvider>
              {children}
            </ProjectProvider>
            <Toaster
              position="top-center"
              dir="rtl"
              toastOptions={{
                className: "font-sans",
              }}
            />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
