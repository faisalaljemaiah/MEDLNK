// Hand-written types mirroring supabase/migrations. Keep in sync manually —
// regenerate later with `supabase gen types typescript` once the schema settles.
//
// NB: these must be `type` aliases, not `interface`s — only object-literal
// `type` aliases get TypeScript's implicit string index signature, which
// @supabase/supabase-js's GenericTable (Record<string, unknown>) requires.
// An `interface` here silently breaks insert()/update() typing (Row: never).

export type VerificationStatus = "pending" | "approved" | "rejected";
export type ReactionType = "like" | "repost" | "save";

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
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
};
