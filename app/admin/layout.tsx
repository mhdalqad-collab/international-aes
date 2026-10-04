import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content Administration | Automated Engineering Systems",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
