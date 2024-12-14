export default function RootLayout ({ children }: Readonly<{
  children: React.ReactNode;
}>) {
  return <main className="main-section overflow-hidden">{children}</main>;
}
