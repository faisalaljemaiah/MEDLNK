import type { CSSProperties, ReactNode } from "react";
import type { Content, FlowNode, Id } from "../schema.ts";

const TYPE_LABEL: Record<FlowNode["type"], string> = {
  start: "Start",
  question: "Question",
  action: "Step",
  danger: "Refer / danger",
  done: "End",
};

interface Props {
  node: FlowNode;
  renderSlot: (slotId: Id) => ReactNode;
}

/** Draws the algorithm top to bottom. Branches sit side by side on wide screens and stack on phones. */
export function Flowchart({ node, renderSlot }: Props) {
  return (
    <div className="fc">
      <Chain node={node} renderSlot={renderSlot} />
    </div>
  );
}

function Chain({ node, renderSlot }: Props) {
  const box = (
    <div className={`fc-node fc-${node.type}`} data-node={node.id}>
      <div className="fc-box">
        <span className="sr-only">{TYPE_LABEL[node.type]}: </span>
        {node.type === "danger" && <span className="fc-icon" aria-hidden="true">!</span>}
        {node.type === "action" && node.drug && <span className="fc-rx" aria-hidden="true">Rx</span>}
        <ContentView content={node.content} renderSlot={renderSlot} />
      </div>
    </div>
  );

  if (node.type === "question")
    return (
      <>
        {box}
        <div className="fc-branches" style={{ "--n": node.branches.length } as CSSProperties}>
          {node.branches.map((b) => (
            <div className="fc-branch" key={b.label} role="group" aria-label={`If ${b.label}`}>
              <div className="fc-label">{b.label}</div>
              <Chain node={b.node} renderSlot={renderSlot} />
            </div>
          ))}
        </div>
      </>
    );

  return (
    <>
      {box}
      {node.type !== "done" && node.next && (
        <>
          <div className="fc-arrow" aria-hidden="true" />
          <Chain node={node.next} renderSlot={renderSlot} />
        </>
      )}
    </>
  );
}

function ContentView({ content, renderSlot }: { content: Content; renderSlot: Props["renderSlot"] }) {
  if (typeof content === "string") return <span className="fc-text">{content}</span>;
  if ("text" in content) return <span className="fc-text">{content.text}</span>;
  if ("slot" in content) return <span className="fc-parts">{renderSlot(content.slot)}</span>;
  return (
    <span className="fc-parts">
      {content.mixed.map((p, i) =>
        typeof p === "string" ? (
          <span className="fc-text" key={i}>
            {p}
          </span>
        ) : (
          <span key={p.slot}>{renderSlot(p.slot)}</span>
        ),
      )}
    </span>
  );
}
