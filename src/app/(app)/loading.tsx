import { FeedSkeleton } from "@/components/skeletons";

// Route-group fallback: the header and bottom nav live in the layout, so a
// navigation swaps only this region and the chrome stays put.
export default function Loading() {
  return <FeedSkeleton />;
}
