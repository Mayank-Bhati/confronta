import "./globals.css";

export const metadata = {
  title: "CareerCompass — find your world, then your path",
  description:
    "Personalized post-diploma guidance. A fresh survey every time, worlds of careers ranked for you, and real institutions compared through your lens.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
