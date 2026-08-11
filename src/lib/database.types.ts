// Hand-written types mirroring supabase/migrations. Keep in sync manually —
// regenerate later with `supabase gen types typescript` once the schema settles.
//
// NB: these must be `type` aliases, not `interface`s — only object-literal
// `type` aliases get TypeScript's implicit string index signature, which
// @supabase/supabase-js's GenericTable (Record<string, unknown>) requires.
// An `interface` here silently breaks insert()/update() typing (Row: never).

export type VerificationStatus = "pending" | "approved" | "rejected";
/**
 * The clinical-value reactions from 0010. These replaced the bare "like": on a
 * clinical network the useful question is *why* a case mattered, and these are
 * what profile stats and reputation read from.
 */
export type ClinicalReactionType =
  | "interesting"
  | "changed_thinking"
  | "patient_safety";

/** repost and save are distribution/bookmarking, not a judgement on the case. */
export type ReactionType = ClinicalReactionType | "repost" | "save";

/** Mirrors the case_type check constraint in 0008_interactive_cases.sql. */
export type CaseType =
  | "clinical_case"
  | "what_would_you_do"
  | "blind_case"
  | "case_evolution"
  | "near_miss"
  | "safety_alert"
  | "saw_this_today"
  | "clinical_pearl"
  | "things_i_wish_i_knew"
  | "case_vs_case"
  | "research_finding";

export type RevealMode = "none" | "staged";

export type ModerationStatus = "visible" | "removed";

/** Mirrors the reason check constraint in 0009_reports_moderation.sql. */
export type ReportReason =
  | "patient_privacy"
  | "incorrect_clinical_information"
  | "harassment"
  | "inappropriate_content"
  | "misleading_information"
  | "spam"
  | "other";

export type ReportStatus =
  | "pending"
  | "reviewed"
  | "approved"
  | "removed"
  | "escalated";

/** Shape of cases.near_miss (jsonb) — the five patient-safety prompts. */
export type NearMiss = {
  almost: string;
  caught_by: string;
  prevention: string;
  learned: string;
  system_change: string;
};

export type CaseBody = {
  presentation: string;
  tricky: string;
  actions: string[];
  lesson: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  handle: string | null;
  role: string | null;
  city: string | null;
  specialty: string | null;
  avatar_url: string | null;
  verified: boolean;
  verification_status: VerificationStatus;
  license_number: string | null;
  is_admin: boolean;
  /** Set by an admin. Makes is_verified() false, which blocks every write. */
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
};

export type Case = {
  id: string;
  author_id: string;
  title: string;
  short_caption: string;
  full_body: CaseBody;
  tags: string[];
  media_url: string | null;
  specialty: string | null;
  case_number: string | null;
  case_type: CaseType;
  near_miss: NearMiss | null;
  reveal_mode: RevealMode;
  moderation_status: ModerationStatus;
  created_at: string;
};

export type CaseQuestion = {
  id: string;
  case_id: string;
  prompt: string;
  explanation: string | null;
  reasoning: string | null;
  evidence: string | null;
  allow_change: boolean;
  created_at: string;
};

/**
 * NB: `is_correct` exists on the table but is deliberately NOT selectable by
 * the anon/authenticated roles (column grant in 0008), so it is absent from
 * anything the app reads. Correctness only ever comes back from the
 * submit_case_answer RPC.
 */
export type CaseOption = {
  id: string;
  question_id: string;
  body: string;
  position: number;
};

export type CaseAttempt = {
  id: string;
  question_id: string;
  user_id: string;
  option_id: string;
  is_correct: boolean;
  created_at: string;
  updated_at: string;
};

export type CaseUpdate = {
  id: string;
  case_id: string;
  author_id: string;
  stage: string;
  body: string;
  position: number;
  created_at: string;
};

export type CaseFollower = {
  case_id: string;
  user_id: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  body: string;
  case_id: string | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type Reaction = {
  id: string;
  case_id: string;
  user_id: string;
  type: ReactionType;
  created_at: string;
};

/** Mirrors the label check constraint in 0011_comment_labels.sql. */
export type CommentLabel =
  | "agree"
  | "differ"
  | "question"
  | "teaching"
  | "evidence";

export type Comment = {
  id: string;
  case_id: string;
  user_id: string;
  body: string;
  /** Null is allowed and normal — an unlabelled reply is still a reply. */
  label: CommentLabel | null;
  moderation_status: ModerationStatus;
  created_at: string;
};

/** Ask a Specialist (0012). */
/**
 * Two states by design — see 0012. "Has answers" is a fact about the answers
 * table, not a status the answering specialist could write (they don't own the
 * request row, so the update would no-op under RLS).
 */
export type SpecialistRequestStatus = "open" | "closed";

export type SpecialistRequest = {
  id: string;
  case_id: string;
  requester_id: string;
  /** Free text, matched case- and whitespace-insensitively against profiles.specialty. */
  specialty: string;
  question: string;
  status: SpecialistRequestStatus;
  created_at: string;
};

export type SpecialistAnswer = {
  id: string;
  request_id: string;
  responder_id: string;
  body: string;
  moderation_status: ModerationStatus;
  created_at: string;
};

export type Report = {
  id: string;
  reporter_id: string;
  case_id: string | null;
  comment_id: string | null;
  reported_profile_id: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_note: string | null;
  created_at: string;
};

export type ModerationEvent = {
  id: string;
  actor_id: string | null;
  action: string;
  target_kind: "case" | "comment" | "profile" | "report";
  target_id: string;
  note: string | null;
  created_at: string;
};

export type Follow = {
  follower_id: string;
  followee_id: string;
  created_at: string;
};

export type AiRecap = {
  case_id: string;
  summary: string | null;
  similar_case_ids: string[];
  generated_at: string;
};

export type Conversation = {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      cases: {
        Row: Case;
        Insert: Partial<Case> & {
          author_id: string;
          title: string;
          short_caption: string;
        };
        Update: Partial<Case>;
        Relationships: [];
      };
      reactions: {
        Row: Reaction;
        Insert: Partial<Reaction> & {
          case_id: string;
          user_id: string;
          type: ReactionType;
        };
        Update: Partial<Reaction>;
        Relationships: [];
      };
      comments: {
        Row: Comment;
        Insert: Partial<Comment> & {
          case_id: string;
          user_id: string;
          body: string;
        };
        Update: Partial<Comment>;
        Relationships: [];
      };
      follows: {
        Row: Follow;
        Insert: Partial<Follow> & { follower_id: string; followee_id: string };
        Update: Partial<Follow>;
        Relationships: [];
      };
      ai_recaps: {
        Row: AiRecap;
        Insert: Partial<AiRecap> & { case_id: string };
        Update: Partial<AiRecap>;
        Relationships: [];
      };
      conversations: {
        Row: Conversation;
        Insert: Partial<Conversation> & { user_a: string; user_b: string };
        Update: Partial<Conversation>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Partial<Message> & {
          conversation_id: string;
          sender_id: string;
          body: string;
        };
        Update: Partial<Message>;
        Relationships: [];
      };
      case_questions: {
        Row: CaseQuestion;
        Insert: Partial<CaseQuestion> & { case_id: string; prompt: string };
        Update: Partial<CaseQuestion>;
        Relationships: [];
      };
      case_options: {
        Row: CaseOption;
        // is_correct is write-only from the app's perspective: authors set it
        // when creating the question, nobody can read it back.
        Insert: Partial<CaseOption> & {
          question_id: string;
          body: string;
          position: number;
          is_correct?: boolean;
        };
        Update: Partial<CaseOption>;
        Relationships: [];
      };
      case_attempts: {
        Row: CaseAttempt;
        Insert: Partial<CaseAttempt> & {
          question_id: string;
          user_id: string;
          option_id: string;
          is_correct: boolean;
        };
        Update: Partial<CaseAttempt>;
        Relationships: [];
      };
      case_updates: {
        Row: CaseUpdate;
        Insert: Partial<CaseUpdate> & {
          case_id: string;
          author_id: string;
          stage: string;
          body: string;
        };
        Update: Partial<CaseUpdate>;
        Relationships: [];
      };
      case_followers: {
        Row: CaseFollower;
        Insert: Partial<CaseFollower> & { case_id: string; user_id: string };
        Update: Partial<CaseFollower>;
        Relationships: [];
      };
      reports: {
        Row: Report;
        Insert: Partial<Report> & { reporter_id: string; reason: ReportReason };
        Update: Partial<Report>;
        Relationships: [];
      };
      specialist_requests: {
        Row: SpecialistRequest;
        Insert: Partial<SpecialistRequest> & {
          case_id: string;
          requester_id: string;
          specialty: string;
          question: string;
        };
        Update: Partial<SpecialistRequest>;
        Relationships: [];
      };
      specialist_answers: {
        Row: SpecialistAnswer;
        Insert: Partial<SpecialistAnswer> & {
          request_id: string;
          responder_id: string;
          body: string;
        };
        Update: Partial<SpecialistAnswer>;
        Relationships: [];
      };
      moderation_events: {
        Row: ModerationEvent;
        Insert: Partial<ModerationEvent> & {
          action: string;
          target_kind: ModerationEvent["target_kind"];
          target_id: string;
        };
        Update: Partial<ModerationEvent>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & {
          user_id: string;
          type: string;
          body: string;
        };
        Update: Partial<Notification>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      /** Grades and records an answer. The only path that reveals correctness. */
      submit_case_answer: {
        Args: { p_question_id: string; p_option_id: string };
        Returns: boolean;
      };
      /** Per-option vote counts; aggregate only, never who answered what. */
      case_answer_distribution: {
        Args: { p_question_id: string };
        Returns: { option_id: string; votes: number }[];
      };
      /** Notifies a case's followers. Security definer — clients can't insert. */
      fan_out_case_update: {
        Args: { p_case_id: string; p_type: string; p_body: string };
        Returns: undefined;
      };
      /** True when the caller is a verified, unsuspended member of that specialty. */
      is_specialist_in: {
        Args: { p_specialty: string };
        Returns: boolean;
      };
      /** Notifies that specialty a question is waiting. Security definer. */
      fan_out_specialist_request: {
        Args: { p_request_id: string };
        Returns: undefined;
      };
      /** Notifies the requester and the case's followers. Security definer. */
      fan_out_specialist_answer: {
        Args: { p_request_id: string };
        Returns: undefined;
      };
    };
  };
};
