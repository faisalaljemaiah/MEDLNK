export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-accent-soft/60 via-accent-soft/15 to-transparent">
      {children}
    </div>
  );
}
