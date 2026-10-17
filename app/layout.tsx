import type { Metadata, Viewport } from "next";
import "./arcade-base.css";
export const viewport: Viewport = {
  themeColor: "#18291f",
  viewportFit: "cover",
};
export const metadata: Metadata = {
  title: "Yaba Fight — Small game. Big wahala.",
  description:
    "Seven rivals. One Mainland. Read the hands, slip the punch, and fight through a Lagos arcade ladder. Free local play with adaptive rivals and no signup required.",
  icons: { icon: "/icon.svg" },
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
