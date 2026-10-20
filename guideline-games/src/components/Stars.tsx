export function Stars({ value, max = 3, size = "sm" }: { value: number; max?: number; size?: "sm" | "lg" }) {
  return (
    <span className={`stars stars-${size}`} role="img" aria-label={`${value} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? "star on" : "star"} style={{ animationDelay: `${i * 160}ms` }}>
          ★
        </span>
      ))}
    </span>
  );
}
