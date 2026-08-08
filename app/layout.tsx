import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const plusJakarta = localFont({
    src: [
        {
            path: "./fonts/plus-jakarta-sans-latin-300-normal.woff2",
            weight: "300",
            style: "normal",
        },
        {
            path: "./fonts/plus-jakarta-sans-latin-400-normal.woff2",
            weight: "400",
            style: "normal",
        },
        {
            path: "./fonts/plus-jakarta-sans-latin-500-normal.woff2",
            weight: "500",
            style: "normal",
        },
        {
            path: "./fonts/plus-jakarta-sans-latin-600-normal.woff2",
            weight: "600",
            style: "normal",
        },
        {
            path: "./fonts/plus-jakarta-sans-latin-700-normal.woff2",
            weight: "700",
            style: "normal",
        },
    ],
    variable: "--font-plus-jakarta-sans",
    display: "swap",
});

const inter = localFont({
    src: [
        {
            path: "./fonts/inter-latin-300-normal.woff2",
            weight: "300",
            style: "normal",
        },
        {
            path: "./fonts/inter-latin-400-normal.woff2",
            weight: "400",
            style: "normal",
        },
        {
            path: "./fonts/inter-latin-500-normal.woff2",
            weight: "500",
            style: "normal",
        },
        {
            path: "./fonts/inter-latin-600-normal.woff2",
            weight: "600",
            style: "normal",
        },
        {
            path: "./fonts/inter-latin-700-normal.woff2",
            weight: "700",
            style: "normal",
        },
    ],
    variable: "--font-inter",
    display: "swap",
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
                className={`${inter.variable} ${plusJakarta.variable} font-jakarta antialiased`}
            >
                {children}
            </body>
        </html>
    );
}
