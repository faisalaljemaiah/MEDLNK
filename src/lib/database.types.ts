// Hand-written types mirroring supabase/migrations. Keep in sync manually —
// regenerate later with `supabase gen types typescript` once the schema settles.
//
// NB: these must be `type` aliases, not `interface`s — only object-literal
// `type` aliases get TypeScript's implicit string index signature, which
// @supabase/supabase-js's GenericTable (Record<string, unknown>) requires.
// An `interface` here silently breaks insert()/update() typing (Row: never).

export type VerificationStatus = "pending" | "approved" | "rejected";
export type ReactionType = "like" | "repost" | "save";

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

export type Comment = {
  id: string;
  case_id: string;
  user_id: string;
  body: string;
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
    };
  };
};
