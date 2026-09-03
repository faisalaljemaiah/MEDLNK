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
      {/* An underline, not a bordered box with a glowing focus ring — that
          box-plus-ring recipe is the single most recognizable "generic
          web-app form" tell there is. A plain rule under the text reads
          more like filling out a paper form, which fits the app's
          stamped-document identity (src/components/brand.tsx) better than
          another rounded rectangle would. */}
      <input
        id={inputId}
        className="border-0 border-b-2 border-line bg-transparent px-0.5 py-2 text-text transition-colors duration-150 ease-out placeholder:text-muted focus:border-accent focus:outline-none"
        {...props}
      />
    </div>
  );
}
