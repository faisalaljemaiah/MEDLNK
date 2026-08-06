import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <Nav />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
