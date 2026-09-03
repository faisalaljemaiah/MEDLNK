"use client";

import { useRef, useState, useTransition } from "react";
import { sendMessageAction } from "@/app/actions/messages";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await sendMessageAction(conversationId, formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        formRef.current?.reset();
      }
    });
  }

  return (
    <div className="border-t border-line px-4 py-3">
      <form ref={formRef} action={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          name="body"
          placeholder="Message…"
          autoComplete="off"
          required
          className="flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          Send
        </button>
      </form>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
