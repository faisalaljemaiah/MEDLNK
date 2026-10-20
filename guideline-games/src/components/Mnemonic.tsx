import type { Lesson } from "../schema.ts";

export function Mnemonic({ mnemonic, open = true }: { mnemonic: Lesson["mnemonic"]; open?: boolean }) {
  if (!mnemonic) return null;
  return (
    <details className="mnemonic" open={open}>
      <summary>
        <span className="mnemonic-tag">Memory cue</span>
        <strong className="mnemonic-cue">{mnemonic.cue}</strong>
      </summary>
      {mnemonic.expansion.length > 0 && (
        <ul>
          {mnemonic.expansion.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </details>
  );
}
