import "./globals.css";

export const metadata = {
  title: "SignalR Chat | Resilient realtime client",
  description: "A production-minded SignalR and Next.js realtime chat client.",
};

export const viewport = { themeColor: "#102a43" };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
