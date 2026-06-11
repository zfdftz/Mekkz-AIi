import type { Metadata } from "next";
import { DownloadPageClient } from "@/components/download-page-client";

export const metadata: Metadata = {
  title: "Download app",
  description: "Install mekkz AI on iPhone, Android, Google Play, and the App Store."
};

export default function DownloadPage() {
  return <DownloadPageClient />;
}
