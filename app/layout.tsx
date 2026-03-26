import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KiCad Web Client",
  description: "KiCad Bridge Enabled App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 🔥 EARLIEST POSSIBLE EXECUTION — DO NOT USE next/script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  // Ensure global buffers exist ASAP
  window.kicadMessages = window.kicadMessages || [];
  window.kicadSessionId = window.kicadSessionId || null;

  const existing = window.kiclient || {};
  const previousPost =
    typeof existing.postMessage === "function"
      ? existing.postMessage.bind(existing)
      : null;

  existing.postMessage = function(incoming) {
    console.log('KiClient Receive msg from KiCad:', incoming);

    // Buffer ALL messages immediately
    window.kicadMessages.push(incoming);

    // Parse and extract session ASAP
    try {
      const message = JSON.parse(incoming);

      if (
        message.command === 'NEW_SESSION' &&
        message.status === 'OK' &&
        message.session_id
      ) {
        console.log('KiClient: Storing session ID:', message.session_id);
        window.kicadSessionId = message.session_id;
      }
    } catch (e) {
      console.error('KiClient: Error parsing message:', e);
    }

    // Preserve original behavior if exists
    if (previousPost) {
      previousPost(incoming);
    }
  };

  window.kiclient = existing;
})();
            `,
          }}
        />
      </head>

      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}