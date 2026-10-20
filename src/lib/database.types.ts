// Tipos do banco de dados, escritos à mão a partir das migrations em
// supabase/migrations/. Se o schema mudar, atualize este arquivo junto
// (ou gere via `supabase gen types typescript` quando houver projeto linkado).
//
// Importante: tudo aqui usa `type` (nunca `interface`). O supabase-js exige
// que cada Row/Insert/Update satisfaça `extends Record<string, unknown>`, e
// TypeScript não reconhece `interface` (por ser "aberta" a declaration
// merging) como satisfazendo essa checagem estrutural — só `type` fecha essa
// verificação corretamente.

export type UserRole = "client" | "professional" | "admin";

export type ServiceRequestStatus =
  | "draft"
  | "open"
  | "reviewing"
  | "accepted"
  | "scheduled"
  | "in_service"
  | "completed"
  | "cancelled"
  | "expired";

export type RequestMatchStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "proposed_new_time"
  | "expired";

export type AppointmentStatus =
  | "scheduled"
  | "in_service"
  | "completed"
  | "cancelled"
  | "no_show";

export type ReportStatus = "open" | "reviewed" | "dismissed" | "actioned";

export type ReportTargetType = "user" | "service_request" | "review" | "message";

type Timestamps = {
  created_at: string;
};

export type ProfileRow = Timestamps & {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  avatar_path: string | null;
  city: string | null;
  neighborhood: string | null;
  is_suspended: boolean;
  terms_version: string | null;
  terms_accepted_at: string | null;
  updated_at: string;
};

export type ProfessionalProfileRow = Timestamps & {
  id: string;
  bio: string;
  service_areas: string[];
  service_radius_km: number | null;
  is_active: boolean;
  is_verified: boolean;
  average_rating: number;
  review_count: number;
  response_rate: number;
  last_availability_update: string;
  updated_at: string;
};

export type CategoryRow = Timestamps & {
  id: string;
  slug: string;
  name: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
};

export type ProfessionalCategoryRow = Timestamps & {
  professional_id: string;
  category_id: string;
};

export type AvailabilityRuleRow = Timestamps & {
  id: string;
  professional_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export type AvailabilityExceptionRow = Timestamps & {
  id: string;
  professional_id: string;
  exception_date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
};

export type ServiceRequestRow = Timestamps & {
  id: string;
  client_id: string;
  category_id: string;
  description: string;
  neighborhood: string;
  city: string;
  desired_date: string;
  time_window_start: string;
  time_window_end: string;
  is_urgent: boolean;
  photo_paths: string[];
  status: ServiceRequestStatus;
  accepted_match_id: string | null;
  updated_at: string;
};

export type RequestMatchRow = Timestamps & {
  id: string;
  request_id: string;
  professional_id: string;
  status: RequestMatchStatus;
  proposed_date: string | null;
  proposed_time_window_start: string | null;
  proposed_time_window_end: string | null;
  decline_reason: string | null;
  notified_at: string;
  responded_at: string | null;
};

export type AppointmentRow = Timestamps & {
  id: string;
  request_id: string;
  request_match_id: string;
  client_id: string;
  professional_id: string;
  scheduled_date: string;
  time_window_start: string;
  time_window_end: string;
  status: AppointmentStatus;
  contact_released_at: string;
  service_address: string;
  updated_at: string;
  completed_at: string | null;
};

export type PortfolioItemRow = Timestamps & {
  id: string;
  professional_id: string;
  title: string;
  description: string;
  photo_path: string;
  sort_order: number;
};

export type ReviewRow = Timestamps & {
  id: string;
  appointment_id: string;
  client_id: string;
  professional_id: string;
  rating: number;
  comment: string;
};

export type ConversationRow = Timestamps & {
  id: string;
  request_id: string;
  client_id: string;
  professional_id: string;
};

export type MessageRow = Timestamps & {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
};

export type ReportRow = Timestamps & {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
};

export type AdminActionLogRow = Timestamps & {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
};

export type ProductEventRow = Timestamps & {
  id: number;
  event_name: string;
  user_id: string | null;
  anonymous_id: string | null;
  request_id: string | null;
  metadata: Record<string, unknown>;
};

export type BetaReadinessItemRow = {
  id: string;
  category: string;
  title: string;
  status: "not_started" | "in_progress" | "blocked" | "done";
  notes: string;
  sort_order: number;
  updated_at: string;
  updated_by: string | null;
};

export type PublicProfessionalProfileRow = {
  id: string;
  full_name: string;
  avatar_path: string | null;
  city: string | null;
  neighborhood: string | null;
  bio: string;
  service_areas: string[];
  is_active: boolean;
  is_verified: boolean;
  average_rating: number;
  review_count: number;
  response_rate: number;
};

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<
        ProfileRow,
        Pick<ProfileRow, "id"> & Partial<Omit<ProfileRow, "id" | "created_at" | "updated_at">>,
        Partial<Omit<ProfileRow, "id" | "created_at">>
      >;
      professional_profiles: TableDef<
        ProfessionalProfileRow,
        Pick<ProfessionalProfileRow, "id"> &
          Partial<Omit<ProfessionalProfileRow, "id" | "created_at" | "updated_at">>,
        Partial<Omit<ProfessionalProfileRow, "id" | "created_at">>
      >;
      categories: TableDef<
        CategoryRow,
        Pick<CategoryRow, "slug" | "name"> & Partial<Omit<CategoryRow, "id" | "created_at">>,
        Partial<Omit<CategoryRow, "id" | "created_at">>
      >;
      professional_categories: TableDef<
        ProfessionalCategoryRow,
        Pick<ProfessionalCategoryRow, "professional_id" | "category_id">,
        Partial<ProfessionalCategoryRow>
      >;
      availability_rules: TableDef<
        AvailabilityRuleRow,
        Omit<AvailabilityRuleRow, "id" | "created_at">,
        Partial<Omit<AvailabilityRuleRow, "id" | "created_at">>
      >;
      availability_exceptions: TableDef<
        AvailabilityExceptionRow,
        Omit<AvailabilityExceptionRow, "id" | "created_at">,
        Partial<Omit<AvailabilityExceptionRow, "id" | "created_at">>
      >;
      service_requests: TableDef<
        ServiceRequestRow,
        Omit<
          ServiceRequestRow,
          "id" | "created_at" | "updated_at" | "accepted_match_id" | "status" | "photo_paths"
        > &
          Partial<Pick<ServiceRequestRow, "status" | "accepted_match_id" | "photo_paths">>,
        Partial<Omit<ServiceRequestRow, "id" | "created_at">>
      >;
      request_matches: TableDef<
        RequestMatchRow,
        Pick<RequestMatchRow, "request_id" | "professional_id"> &
          Partial<Omit<RequestMatchRow, "id" | "created_at" | "request_id" | "professional_id">>,
        Partial<Omit<RequestMatchRow, "id" | "created_at">>
      >;
      appointments: TableDef<
        AppointmentRow,
        Omit<
          AppointmentRow,
          "id" | "created_at" | "updated_at" | "completed_at" | "status" | "contact_released_at"
        > &
          Partial<Pick<AppointmentRow, "status" | "completed_at" | "contact_released_at">>,
        Partial<Omit<AppointmentRow, "id" | "created_at">>
      >;
      portfolio_items: TableDef<
        PortfolioItemRow,
        Omit<PortfolioItemRow, "id" | "created_at" | "sort_order"> &
          Partial<Pick<PortfolioItemRow, "sort_order">>,
        Partial<Omit<PortfolioItemRow, "id" | "created_at">>
      >;
      reviews: TableDef<
        ReviewRow,
        Omit<ReviewRow, "id" | "created_at">,
        Partial<Omit<ReviewRow, "id" | "created_at">>
      >;
      conversations: TableDef<
        ConversationRow,
        Omit<ConversationRow, "id" | "created_at">,
        Partial<Omit<ConversationRow, "id" | "created_at">>
      >;
      messages: TableDef<
        MessageRow,
        Omit<MessageRow, "id" | "created_at" | "read_at"> & Partial<Pick<MessageRow, "read_at">>,
        Partial<Omit<MessageRow, "id" | "created_at">>
      >;
      reports: TableDef<
        ReportRow,
        Omit<ReportRow, "id" | "created_at" | "status" | "resolved_by" | "resolved_at"> &
          Partial<Pick<ReportRow, "status">>,
        Partial<Omit<ReportRow, "id" | "created_at">>
      >;
      admin_action_logs: TableDef<
        AdminActionLogRow,
        Omit<AdminActionLogRow, "id" | "created_at" | "metadata"> &
          Partial<Pick<AdminActionLogRow, "metadata">>,
        Partial<Omit<AdminActionLogRow, "id" | "created_at">>
      >;
      beta_readiness_items: TableDef<
        BetaReadinessItemRow,
        Pick<BetaReadinessItemRow, "category" | "title"> & Partial<Omit<BetaReadinessItemRow, "id" | "category" | "title">>,
        Partial<Pick<BetaReadinessItemRow, "status" | "notes" | "sort_order" | "title">>
      >;
      product_events: TableDef<
        ProductEventRow,
        Pick<ProductEventRow, "event_name"> & Partial<Omit<ProductEventRow, "id" | "created_at" | "event_name">>,
        Record<string, never>
      >;
    };
    Views: {
      public_professional_profiles: {
        Row: PublicProfessionalProfileRow;
        Relationships: [];
      };
    };
    Functions: {
      get_request_client_name: {
        Args: { p_request_id: string };
        Returns: { full_name: string; avatar_path: string | null }[];
      };
      get_appointment_contact: {
        Args: { p_appointment_id: string };
        Returns: { full_name: string; phone: string | null; email: string | null }[];
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_own_professional_profile: {
        Args: { target_professional_id: string };
        Returns: boolean;
      };
      admin_beta_metrics: {
        Args: Record<string, never>;
        Returns: {
          clients_registered: number;
          professionals_registered: number;
          professionals_verified: number;
          requests_open: number;
          requests_with_match: number;
          appointments_total: number;
          services_completed: number;
          reviews_total: number;
        }[];
      };
      admin_product_funnel: {
        Args: { p_since: string };
        Returns: { event_name: string; actors: number; events: number }[];
      };
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: { allowed: boolean; remaining: number; retry_after_seconds: number }[];
      };
    };
    Enums: {
      user_role: UserRole;
      service_request_status: ServiceRequestStatus;
      request_match_status: RequestMatchStatus;
      appointment_status: AppointmentStatus;
      report_status: ReportStatus;
      report_target_type: ReportTargetType;
    };
    CompositeTypes: Record<string, never>;
  };
};
