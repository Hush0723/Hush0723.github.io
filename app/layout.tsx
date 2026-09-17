import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HushTree",
  description: "以 Markdown 文件夹为结构的个人知识库。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
