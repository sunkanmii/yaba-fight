import type { Metadata, Viewport } from "next";
import "./arcade-base.css";
export const viewport: Viewport = {
  themeColor: "#18291f",
  viewportFit: "cover",
};
export const metadata: Metadata = {
  metadataBase: new URL("https://yaba-fight.sunkanmifafowora.workers.dev"),
  title: "Yaba Fight — Small game. Big wahala.",
  description:
    "Seven rivals. One Mainland. Read the hands, slip the punch, and fight through a Lagos arcade ladder. Free local play with adaptive rivals and no signup required.",
  icons: { icon: "/icon.svg" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Yaba Fight",
    title: "Yaba Fight — Small game. Big wahala.",
    description:
      "Seven rivals. One Mainland crown. Play a free Lagos arcade fighter in your browser. No download or sign-up needed.",
    images: [
      {
        url: "/og/yaba-fight-v1.png",
        width: 1200,
        height: 630,
        alt: "Yaba Fight. Seven rivals. One Mainland. Play free in your browser.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yaba Fight — Small game. Big wahala.",
    description:
      "Seven rivals. One Mainland crown. No download. No sign-up. Enter the yard.",
    images: ["/og/yaba-fight-v1.png"],
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
