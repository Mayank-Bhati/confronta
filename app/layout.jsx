import "./globals.css";

export const metadata = {
  title: "Confronta — same data, your lens",
  description:
    "Personalized post-diploma path comparison. Pick two paths; the comparison re-scores against your profile.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
