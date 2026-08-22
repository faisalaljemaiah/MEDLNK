import { GlowBlobs } from "@/components/ui/glow-blobs";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-surface">
      <GlowBlobs />
      {children}
    </div>
  );
}
