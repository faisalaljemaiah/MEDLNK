import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function TextField({ label, id, ...props }: TextFieldProps) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="font-label text-xs uppercase tracking-wide text-muted"
      >
        {label}
      </label>
      <input
        id={inputId}
        className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        {...props}
      />
    </div>
  );
}
