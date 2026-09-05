// Same card as opengraph-image.tsx — X/Twitter's crawler looks for its own
// file convention rather than falling back to og:image reliably, so this
// re-exports the identical generator instead of maintaining two copies.
export { default, alt, size, contentType } from "./opengraph-image";
