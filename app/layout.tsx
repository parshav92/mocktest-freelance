import type { Metadata } from "next";
import { Funnel_Display } from "next/font/google";
import "./globals.css";

const funnelDisplay = Funnel_Display({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-funnel-display",
});

export const metadata: Metadata = {
    title: "MockTest",
    description: "A platform to create and take mock tests.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${funnelDisplay.className} antialiased bg-neutral-200/20`}
            >
                {children}
            </body>
        </html>
    );
}
