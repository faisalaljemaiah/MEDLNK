import { clsx } from "clsx";
import { GlowBlobs } from "@/components/ui/glow-blobs";
import { stampFont } from "@/lib/fonts";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={clsx(stampFont.variable, "relative isolate min-h-dvh overflow-hidden bg-surface")}>
      <GlowBlobs />
      {children}
    </div>
  );
}
