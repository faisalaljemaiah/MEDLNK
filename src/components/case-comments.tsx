import Link from "next/link";
import { clsx } from "clsx";
import { Avatar } from "@/components/avatar";
import { CommentComposer } from "@/components/comment-composer";
import { deleteCommentAction } from "@/app/actions/comments";
import { ReportButton } from "@/components/report-button";
import { UnavailableNotice } from "@/components/unavailable-notice";
import { commentLabelMeta } from "@/lib/comment-labels";
import type { CommentView } from "@/lib/comments";

/**
 * The discussion under a case.
 *
 * A server component: the thread is read on the server like everything else
 * here, and only the composer needs to be interactive.
 */
export function CaseComments({
  caseId,
  path,
  comments,
  viewerId,
  canReply,
}: {
  caseId: string;
  path: string;
  /** Null means the read failed — distinct from a case nobody has replied to. */
  comments: CommentView[] | null;
  viewerId: string | null;
  canReply: boolean;
}) {
  return (
    <section id="comments" className="mt-6 border-t border-line pt-4">
      <p className="font-label text-xs uppercase tracking-wide text-muted">
        Discussion
        {comments && comments.length > 0 ? ` · ${comments.length}` : ""}
      </p>

      {comments === null ? (
        <UnavailableNotice feature="Discussion" />
      ) : comments.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No replies yet. Say what you&apos;d have done.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-4">
          {comments.map((c) => {
            const meta = commentLabelMeta(c.label);
            const isOwn = viewerId === c.user_id;

            return (
              <li key={c.id} className="flex gap-3">
                <Link
                  href={c.author?.handle ? `/u/${c.author.handle}` : "#"}
                  className="shrink-0"
                >
                  <Avatar
                    avatarUrl={c.author?.avatar_url}
                    name={c.author?.full_name}
                    size="sm"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={c.author?.handle ? `/u/${c.author.handle}` : "#"}
                      className="text-sm font-medium text-text hover:underline"
                    >
                      {c.author?.full_name ?? "Unknown clinician"}
                      {c.author?.verified && (
                        <span className="ml-1 text-positive">✓</span>
                      )}
                    </Link>
                    <span className="font-label text-xs text-muted">
                      {c.author?.role}
                    </span>
                    {meta && (
                      <span
                        className={clsx(
                          "rounded-full border px-2 py-0.5 font-label text-xs",
                          meta.badgeClass,
                        )}
                      >
                        {meta.label}
                      </span>
                    )}
                  </div>

                  {c.moderation_status === "removed" && (
                    <p className="mt-1 rounded-lg border border-danger/40 bg-danger/5 px-2.5 py-1.5 text-xs text-danger">
                      Removed by a moderator. Only you and the moderation team
                      can see this.
                    </p>
                  )}

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text">
                    {c.body}
                  </p>

                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="font-label text-xs text-muted">
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {viewerId && !isOwn && (
                      <ReportButton
                        target={{ kind: "comment", id: c.id }}
                        className="text-xs text-muted underline-offset-2 hover:text-danger hover:underline"
                      />
                    )}
                    {isOwn && (
                      <form action={deleteCommentAction.bind(null, c.id, path)}>
                        <button
                          type="submit"
                          className="text-xs text-muted underline-offset-2 hover:text-danger hover:underline"
                        >
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canReply ? (
        <CommentComposer caseId={caseId} path={path} />
      ) : (
        <p className="mt-4 text-sm text-muted">
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>{" "}
          to join the discussion.
        </p>
      )}
    </section>
  );
}
