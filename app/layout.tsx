import type { Metadata } from "next";
import "@/styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { FilterProvider } from "@/context/FilterContext";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export const metadata: Metadata = {
  title: "Cheki Tracker & Database Platform",
  description: "Track, analyze, and manage photobooth cheki transactions with real-time analytics and spreadsheet data entry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <FilterProvider>
            <Header />
            <div className="layout-wrapper">
              <Sidebar />
              <main className="main-content">
                {children}
              </main>
            </div>
            <MobileNav />
          </FilterProvider>
        </AuthProvider>

        <style>{`
          .layout-wrapper {
            display: flex;
            min-height: calc(100vh - var(--header-height));
            width: 100%;
            max-width: 100%;
            margin-top: var(--header-height);
          }
          .main-content {
            flex: 1;
            margin-left: var(--sidebar-width);
            padding: 24px;
            padding-bottom: 80px;
            max-width: 1600px;
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }
          @media (max-width: 768px) {
            .main-content {
              margin-left: 0;
              padding: 12px 14px;
              padding-bottom: 80px;
              width: 100%;
              min-width: 0;
            }
          }
        `}</style>
      </body>
    </html>
  );
}
