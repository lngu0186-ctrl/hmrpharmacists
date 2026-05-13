export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          consent_text: string
          consent_type: string
          enquiry_id: string | null
          given_at: string
          id: string
          ip_address: string | null
        }
        Insert: {
          consent_text: string
          consent_type: string
          enquiry_id?: string | null
          given_at?: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          consent_text?: string
          consent_type?: string
          enquiry_id?: string | null
          given_at?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      content_pages: {
        Row: {
          body: Json | null
          created_at: string
          id: string
          is_published: boolean
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: Json | null
          created_at?: string
          id?: string
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: Json | null
          created_at?: string
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          consent_given: boolean
          created_at: string
          id: string
          message: string
          organisation: string | null
          patient_postcode: string | null
          patient_suburb: string | null
          pharmacist_id: string
          sender_email: string
          sender_name: string
          sender_phone: string | null
          sender_type: Database["public"]["Enums"]["enquiry_sender_type"]
          status: Database["public"]["Enums"]["enquiry_status"]
          updated_at: string
        }
        Insert: {
          consent_given?: boolean
          created_at?: string
          id?: string
          message: string
          organisation?: string | null
          patient_postcode?: string | null
          patient_suburb?: string | null
          pharmacist_id: string
          sender_email: string
          sender_name: string
          sender_phone?: string | null
          sender_type: Database["public"]["Enums"]["enquiry_sender_type"]
          status?: Database["public"]["Enums"]["enquiry_status"]
          updated_at?: string
        }
        Update: {
          consent_given?: boolean
          created_at?: string
          id?: string
          message?: string
          organisation?: string | null
          patient_postcode?: string | null
          patient_suburb?: string | null
          pharmacist_id?: string
          sender_email?: string
          sender_name?: string
          sender_phone?: string | null
          sender_type?: Database["public"]["Enums"]["enquiry_sender_type"]
          status?: Database["public"]["Enums"]["enquiry_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_pharmacist_id_fkey"
            columns: ["pharmacist_id"]
            isOneToOne: false
            referencedRelation: "pharmacists"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_audit_events: {
        Row: {
          actor_id: string | null
          created_at: string
          enquiry_id: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          enquiry_id: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          enquiry_id?: string
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_audit_events_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacist_affiliations: {
        Row: {
          created_at: string
          id: string
          organisation: string
          pharmacist_id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organisation: string
          pharmacist_id: string
          role?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organisation?: string
          pharmacist_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacist_affiliations_pharmacist_id_fkey"
            columns: ["pharmacist_id"]
            isOneToOne: false
            referencedRelation: "pharmacists"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacist_languages: {
        Row: {
          created_at: string
          id: string
          language: string
          pharmacist_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language: string
          pharmacist_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          pharmacist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacist_languages_pharmacist_id_fkey"
            columns: ["pharmacist_id"]
            isOneToOne: false
            referencedRelation: "pharmacists"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacist_service_areas: {
        Row: {
          created_at: string
          id: string
          pharmacist_id: string
          postcode: string | null
          radius_km: number | null
          state: string | null
          suburb: string
        }
        Insert: {
          created_at?: string
          id?: string
          pharmacist_id: string
          postcode?: string | null
          radius_km?: number | null
          state?: string | null
          suburb: string
        }
        Update: {
          created_at?: string
          id?: string
          pharmacist_id?: string
          postcode?: string | null
          radius_km?: number | null
          state?: string | null
          suburb?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacist_service_areas_pharmacist_id_fkey"
            columns: ["pharmacist_id"]
            isOneToOne: false
            referencedRelation: "pharmacists"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacist_specialties: {
        Row: {
          created_at: string
          id: string
          pharmacist_id: string
          specialty: string
        }
        Insert: {
          created_at?: string
          id?: string
          pharmacist_id: string
          specialty: string
        }
        Update: {
          created_at?: string
          id?: string
          pharmacist_id?: string
          specialty?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacist_specialties_pharmacist_id_fkey"
            columns: ["pharmacist_id"]
            isOneToOne: false
            referencedRelation: "pharmacists"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacists: {
        Row: {
          accepting_referrals: boolean
          ahpra_number: string | null
          bio: string | null
          contact_preference: string | null
          created_at: string
          credentialing_body: string | null
          full_name: string
          home_visits: boolean
          id: string
          is_published: boolean
          latitude: number | null
          longitude: number | null
          photo_url: string | null
          postcode: string | null
          slug: string
          state: string | null
          suburb: string | null
          telehealth: boolean
          title: string | null
          turnaround_days: number | null
          updated_at: string
          user_id: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          years_experience: number | null
        }
        Insert: {
          accepting_referrals?: boolean
          ahpra_number?: string | null
          bio?: string | null
          contact_preference?: string | null
          created_at?: string
          credentialing_body?: string | null
          full_name: string
          home_visits?: boolean
          id?: string
          is_published?: boolean
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          postcode?: string | null
          slug: string
          state?: string | null
          suburb?: string | null
          telehealth?: boolean
          title?: string | null
          turnaround_days?: number | null
          updated_at?: string
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          years_experience?: number | null
        }
        Update: {
          accepting_referrals?: boolean
          ahpra_number?: string | null
          bio?: string | null
          contact_preference?: string | null
          created_at?: string
          credentialing_body?: string | null
          full_name?: string
          home_visits?: boolean
          id?: string
          is_published?: boolean
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          postcode?: string | null
          slug?: string
          state?: string | null
          suburb?: string | null
          telehealth?: boolean
          title?: string | null
          turnaround_days?: number | null
          updated_at?: string
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          years_experience?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_records: {
        Row: {
          created_at: string
          evidence_url: string | null
          id: string
          notes: string | null
          pharmacist_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          created_at?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          pharmacist_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          created_at?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          pharmacist_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "verification_records_pharmacist_id_fkey"
            columns: ["pharmacist_id"]
            isOneToOne: false
            referencedRelation: "pharmacists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_pharmacist_owner: {
        Args: { _pharmacist_id: string; _user_id: string }
        Returns: boolean
      }
      pharmacist_is_public: {
        Args: { _pharmacist_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "pharmacist" | "user"
      enquiry_sender_type: "patient" | "gp" | "clinic" | "pharmacy"
      enquiry_status: "new" | "acknowledged" | "responded" | "closed"
      verification_status:
        | "pending"
        | "verified"
        | "needs_review"
        | "rejected"
        | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "pharmacist", "user"],
      enquiry_sender_type: ["patient", "gp", "clinic", "pharmacy"],
      enquiry_status: ["new", "acknowledged", "responded", "closed"],
      verification_status: [
        "pending",
        "verified",
        "needs_review",
        "rejected",
        "expired",
      ],
    },
  },
} as const
