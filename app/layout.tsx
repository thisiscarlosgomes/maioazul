import "./globals.css";

export const metadata = {
  title: "MaioAzul",
  description: "Discover Maio, at its own pace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">

        {children}

      </body>
    </html>
  );
}
