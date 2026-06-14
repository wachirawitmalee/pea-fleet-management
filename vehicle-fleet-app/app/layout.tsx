import type { Metadata } from "next";
// นำเข้าฟอนต์ Prompt จาก Google Fonts
import { Prompt } from "next/font/google";
import "./globals.css";

// ตั้งค่าน้ำหนักฟอนต์และภาษา
const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'thai'], // รองรับภาษาไทยและอังกฤษ
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Fleet Management",
  description: "Enterprise Vehicle Reservation System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      {/* นำคลาสของฟอนต์มาใส่ที่ body */}
      <body className={`${prompt.className} antialiased bg-slate-50`}>
        {children}
      </body>
    </html>
  );
}