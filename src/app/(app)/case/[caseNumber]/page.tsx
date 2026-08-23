import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getViewer, getViewerProfile } from "@/lib/auth";
import { getCaseDetailByCaseNumber } from "@/lib/cases";
import { getCaseComments } from "@/lib/comments";
import { getCaseComparison } from "@/lib/comparisons";
import { getCaseSpecialistThreads } from "@/lib/specialists";
import { getInteractiveState } from "@/lib/interactive";
import { getReasoningTree } from "@/lib/reasoning-trees";
import { countryName } from "@/lib/countries";
import { getDiveDeepDataAction } from "@/app/actions/recap";
import { getRevealIfAnswered } from "@/app/actions/interactive";
import { caseTypeMeta, NEAR_MISS_PROMPTS } from "@/lib/case-types";
import { isVideoUrl } from "@/lib/media";
import { Avatar } from "@/components/avatar";
import { ReactionBar } from "@/components/reaction-bar";
import { CaseQuestion } from "@/components/case-question";
import { CaseFollowButton } from "@/components/case-follow-button";
import { CaseTimeline } from "@/components/case-timeline";
import { RevealSection } from "@/components/reveal-section";
import { ReportButton } from "@/components/report-button";
import { CaseComments } from "@/components/case-comments";
import { ReasoningTree } from "@/components/reasoning-tree";
import { CaseComparison } from "@/components/case-comparison";
import { SpecialistThreads } from "@/components/specialist-threads";

export default async function CasePage({
  params,
}: {
  params: Promise<{ caseNumber: string }>;
}) {
  const { caseNumber } = await params;
  const supabase = await createClient();
  const user = await getViewer();

  const detail = await getCaseDetailByCaseNumber(
    supabase,
    caseNumber,
    user?.id ?? null,
  );
  if (!detail) notFound();

  const { feedCase, question } = detail;
  const path = `/case/${caseNumber}`;
  const typeMeta = caseTypeMeta(feedCase.case_type);
  const isAuthor = user?.id === feedCase.author_id;

  const [
    { recapSummary, similar },
    interactive,
    reveal,
    comments,
    specialistThreads,
    viewerProfile,
    comparison,
    reasoningTree,
  ] = await Promise.all([
    getDiveDeepDataAction(feedCase.id),
    getInteractiveState(supabase, feedCase.id, question?.id ?? null, user?.id ?? null),
    // Null unless this reader has already answered, so a page render can never
    // be what leaks the author's write-up.
    question ? getRevealIfAnswered(question.id, user?.id ?? null) : Promise.resolve(null),
    getCaseComments(supabase, feedCase.id),
    getCaseSpecialistThreads(supabase, feedCase.id),
    getViewerProfile(),
    getCaseComparison(supabase, feedCase.id),
    getReasoningTree(supabase, feedCase.id),
  ]);

  const staged = feedCase.reveal_mode === "staged";

  // Null (every case posted before 0025) means the same thing "top" does —
  // media above the write-up, exactly where it's always rendered.
  const mediaPlacement = feedCase.media_placement ?? "top";
  const mediaBlock = feedCase.media_url ? (
    isVideoUrl(feedCase.media_url) ? (
      <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-black">
        <video
          src={feedCase.media_url}
          controls
          playsInline
          className="h-full w-full object-contain"
        />
      </div>
    ) : (
      // Empty alt: the caption above carries the meaning, and a clinical
      // image has no useful text equivalent a poster could be relied on to
      // write.
      <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-surface-2">
        <Image
          src={feedCase.media_url}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 640px"
          className="object-contain"
        />
      </div>
    )
  ) : null;

  return (
    <div className="px-4 py-6">
      <p className="font-label text-xs uppercase tracking-wide text-muted">
        {feedCase.case_number ?? "CASE"}
        {feedCase.specialty ? ` · ${feedCase.specialty}` : ""}
        {countryName(feedCase.country_code) ? ` · ${countryName(feedCase.country_code)}` : ""}
      </p>

      {typeMeta.badge && (
        <span
          className={clsx(
            "mt-2 inline-block rounded-full border px-2.5 py-0.5 font-label text-xs",
            typeMeta.badgeClass,
          )}
        >
          {typeMeta.badge}
        </span>
      )}

      <h1 className="mt-1 font-headline text-2xl text-text">{feedCase.title}</h1>

      {feedCase.moderation_status === "removed" && (
        <p className="mt-3 rounded-lg border border-danger/40 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
          This case has been removed by a moderator. Only you and the
          moderation team can see it.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={feedCase.author?.handle ? `/u/${feedCase.author.handle}` : "#"}
          className="flex items-center gap-2 hover:opacity-80"
        >
          <Avatar
            avatarUrl={feedCase.author?.avatar_url}
            name={feedCase.author?.full_name}
          />
          <span className="text-sm text-text">
            {feedCase.author?.full_name ?? "Unknown clinician"}
            {feedCase.author?.verified && (
              <span className="ml-1 text-positive">✓ verified</span>
            )}
          </span>
        </Link>

        <CaseFollowButton
          caseId={feedCase.id}
          initialFollowing={interactive.isFollowing}
          initialCount={interactive.followerCount}
          followedFollowers={interactive.followedFollowers}
          signedIn={Boolean(user)}
          path={path}
        />
      </div>

      {typeMeta.isQuote ? (
        <p className="mt-4 border-l-2 border-accent-2/40 pl-4 font-headline text-xl italic leading-snug text-text">
          {feedCase.short_caption}
        </p>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-text">
          {feedCase.short_caption}
        </p>
      )}

      {mediaPlacement === "top" && mediaBlock}

      <CaseComparison comparison={comparison} />

      {question && (
        <CaseQuestion
          question={question}
          initialAttempt={interactive.attempt}
          initialDistribution={interactive.distribution}
          initialReveal={reveal}
          path={path}
          signedIn={Boolean(user)}
        />
      )}

      {feedCase.near_miss ? (
        <section className="mt-5 rounded-xl border border-warning/40 bg-warning/5 p-4">
          <p className="font-label text-xs uppercase tracking-wide text-warning">
            Patient safety
          </p>
          <div className="mt-2 flex flex-col gap-4">
            {NEAR_MISS_PROMPTS.map((prompt) => {
              const value = feedCase.near_miss?.[prompt.name];
              if (!value) return null;
              return <CaseBlock key={prompt.name} label={prompt.label} text={value} />;
            })}
          </div>
        </section>
      ) : (
        <>
          <section className="mt-5 rounded-xl border border-accent-2/30 bg-accent-2/10 p-4">
            <p className="font-label text-xs uppercase tracking-wide text-accent-2">
              AI recap
            </p>
            <p className="mt-1 text-sm text-text">
              {recapSummary ?? "No AI recap yet for this case."}
            </p>
          </section>

          <div className="mt-5 flex flex-col gap-5">
            <CaseBlock
              label="Presentation"
              text={feedCase.full_body.presentation}
              media={mediaPlacement === "presentation" ? mediaBlock : null}
            />
            <CaseBlock
              label="What was tricky"
              text={feedCase.full_body.tricky}
              media={mediaPlacement === "tricky" ? mediaBlock : null}
            />
            {feedCase.full_body.actions.length > 0 && (
              <div>
                <p className="font-label text-xs uppercase tracking-wide text-muted">
                  What we did
                </p>
                <ul className="mt-1.5 flex list-disc flex-col gap-1.5 pl-5 text-sm text-text">
                  {feedCase.full_body.actions.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
                {mediaPlacement === "actions" && mediaBlock}
              </div>
            )}

            {feedCase.full_body.lesson &&
              (staged ? (
                <RevealSection
                  label="The lesson"
                  prompt="Reveal the lesson"
                  hint="Reason it through first — what would you take away from this case?"
                >
                  <p className="text-sm leading-relaxed text-text">
                    {feedCase.full_body.lesson}
                  </p>
                  {mediaPlacement === "lesson" && mediaBlock}
                </RevealSection>
              ) : (
                <CaseBlock
                  label="The lesson"
                  text={feedCase.full_body.lesson}
                  media={mediaPlacement === "lesson" ? mediaBlock : null}
                />
              ))}
          </div>
        </>
      )}

      <CaseTimeline
        caseId={feedCase.id}
        updates={interactive.updates}
        isAuthor={isAuthor}
        path={path}
      />

      {reasoningTree && (
        <ReasoningTree
          caseId={feedCase.id}
          tree={reasoningTree}
          isAuthor={isAuthor}
          path={path}
        />
      )}

      {feedCase.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {feedCase.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-line px-2.5 py-1 font-label text-xs text-muted"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6">
        <ReactionBar
          caseId={feedCase.id}
          counts={feedCase.counts}
          viewerReactions={feedCase.viewerReactions}
          path={path}
          variant="full"
          commentsHref="#comments"
        />
      </div>

      <SpecialistThreads
        caseId={feedCase.id}
        caseSpecialty={feedCase.specialty}
        path={path}
        threads={specialistThreads}
        viewerId={user?.id ?? null}
        viewerSpecialty={viewerProfile?.specialty ?? null}
        canAsk={Boolean(viewerProfile?.verified)}
      />

      <CaseComments
        caseId={feedCase.id}
        path={path}
        comments={comments}
        viewerId={user?.id ?? null}
        canReply={Boolean(user)}
      />

      {user && !isAuthor && (
        <div className="mt-6 border-t border-line pt-4">
          <ReportButton target={{ kind: "case", id: feedCase.id }} />
        </div>
      )}

      <section className="mt-6 border-t border-line pt-4">
        <p className="font-label text-xs uppercase tracking-wide text-muted">
          Similar cases
        </p>
        {similar.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Nothing similar yet — check back as more cases are posted.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {similar.map((s) => (
              <li key={s.id}>
                <Link
                  href={s.case_number ? `/case/${s.case_number}` : "#"}
                  className="text-sm text-accent hover:underline"
                >
                  {s.case_number ? `${s.case_number} · ` : ""}
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CaseBlock({
  label,
  text,
  media,
}: {
  label: string;
  text: string;
  /** The author's chosen video/photo, when they placed it under this
   *  section instead of the top of the case (0025). */
  media?: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-label text-xs uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-text">
        {text}
      </p>
      {media}
    </div>
  );
}
