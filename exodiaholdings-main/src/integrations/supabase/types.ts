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
      beneficiaries: {
        Row: {
          created_at: string
          dob: string | null
          full_name: string
          gender: Database["public"]["Enums"]["beneficiary_gender"]
          id: string
          notes: string | null
          relationship: string | null
          share_percent: number
          sort_order: number
          updated_at: string
          user_id: string
          visible_to_heir: boolean
        }
        Insert: {
          created_at?: string
          dob?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["beneficiary_gender"]
          id?: string
          notes?: string | null
          relationship?: string | null
          share_percent?: number
          sort_order?: number
          updated_at?: string
          user_id: string
          visible_to_heir?: boolean
        }
        Update: {
          created_at?: string
          dob?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["beneficiary_gender"]
          id?: string
          notes?: string | null
          relationship?: string | null
          share_percent?: number
          sort_order?: number
          updated_at?: string
          user_id?: string
          visible_to_heir?: boolean
        }
        Relationships: []
      }
      co_owners: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          property_id: string
          relationship: string | null
          share_percent: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          property_id: string
          relationship?: string | null
          share_percent?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          property_id?: string
          relationship?: string | null
          share_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "co_owners_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      heir_messages: {
        Row: {
          body: string
          created_at: string
          guardian_id: string
          heir_id: string
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          guardian_id: string
          heir_id: string
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          guardian_id?: string
          heir_id?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      heir_relationships: {
        Row: {
          created_at: string
          display_name: string | null
          guardian_id: string
          heir_id: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          guardian_id: string
          heir_id: string
          id?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          guardian_id?: string
          heir_id?: string
          id?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          invited_role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      payment_sources: {
        Row: {
          brand: string | null
          color: string | null
          created_at: string
          encrypted_details: string | null
          id: string
          kind: Database["public"]["Enums"]["payment_source_kind"]
          label: string
          last4: string | null
          notes: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          color?: string | null
          created_at?: string
          encrypted_details?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["payment_source_kind"]
          label: string
          last4?: string | null
          notes?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          color?: string | null
          created_at?: string
          encrypted_details?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["payment_source_kind"]
          label?: string
          last4?: string | null
          notes?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          note: string | null
          paid_on: string
          payment_source_id: string | null
          property_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          paid_on?: string
          payment_source_id?: string | null
          property_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          paid_on?: string
          payment_source_id?: string | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_payment_source_id_fkey"
            columns: ["payment_source_id"]
            isOneToOne: false
            referencedRelation: "payment_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          letter_of_intent: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          letter_of_intent?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          letter_of_intent?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address_line1: string
          asset_class: Database["public"]["Enums"]["asset_class"]
          city: string
          created_at: string
          id: string
          interest_rate: number | null
          monthly_payment: number
          nickname: string | null
          notes: string | null
          owner_id: string
          payment_day_of_month: number | null
          payment_frequency: Database["public"]["Enums"]["payment_frequency"]
          payment_interval_months: number | null
          payment_source_id: string | null
          payment_start_date: string | null
          property_type: Database["public"]["Enums"]["property_type"]
          purchase_price: number | null
          state: string
          status: Database["public"]["Enums"]["property_status"]
          total_owed: number
          updated_at: string
          visible_to_heir: boolean
          zip: string
        }
        Insert: {
          address_line1: string
          asset_class?: Database["public"]["Enums"]["asset_class"]
          city: string
          created_at?: string
          id?: string
          interest_rate?: number | null
          monthly_payment?: number
          nickname?: string | null
          notes?: string | null
          owner_id: string
          payment_day_of_month?: number | null
          payment_frequency?: Database["public"]["Enums"]["payment_frequency"]
          payment_interval_months?: number | null
          payment_source_id?: string | null
          payment_start_date?: string | null
          property_type?: Database["public"]["Enums"]["property_type"]
          purchase_price?: number | null
          state: string
          status?: Database["public"]["Enums"]["property_status"]
          total_owed?: number
          updated_at?: string
          visible_to_heir?: boolean
          zip: string
        }
        Update: {
          address_line1?: string
          asset_class?: Database["public"]["Enums"]["asset_class"]
          city?: string
          created_at?: string
          id?: string
          interest_rate?: number | null
          monthly_payment?: number
          nickname?: string | null
          notes?: string | null
          owner_id?: string
          payment_day_of_month?: number | null
          payment_frequency?: Database["public"]["Enums"]["payment_frequency"]
          payment_interval_months?: number | null
          payment_source_id?: string | null
          payment_start_date?: string | null
          property_type?: Database["public"]["Enums"]["property_type"]
          purchase_price?: number | null
          state?: string
          status?: Database["public"]["Enums"]["property_status"]
          total_owed?: number
          updated_at?: string
          visible_to_heir?: boolean
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_payment_source_id_fkey"
            columns: ["payment_source_id"]
            isOneToOne: false
            referencedRelation: "payment_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      property_documents: {
        Row: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          file_name: string
          id: string
          property_id: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          doc_type?: Database["public"]["Enums"]["doc_type"]
          file_name: string
          id?: string
          property_id: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          doc_type?: Database["public"]["Enums"]["doc_type"]
          file_name?: string
          id?: string
          property_id?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          property_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          property_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          property_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_records: {
        Row: {
          buyer_name: string
          created_at: string
          id: string
          notes: string | null
          property_id: string
          sale_date: string
          sale_price: number
        }
        Insert: {
          buyer_name: string
          created_at?: string
          id?: string
          notes?: string | null
          property_id: string
          sale_date: string
          sale_price: number
        }
        Update: {
          buyer_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          property_id?: string
          sale_date?: string
          sale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          area: string | null
          body: string
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolution_note: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          body: string
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          body?: string
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trust_relationships: {
        Row: {
          created_at: string
          grantor_id: string
          id: string
          trustee_id: string
        }
        Insert: {
          created_at?: string
          grantor_id: string
          id?: string
          trustee_id: string
        }
        Update: {
          created_at?: string
          grantor_id?: string
          id?: string
          trustee_id?: string
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
      vault_items: {
        Row: {
          cabinet: string
          category: string
          created_at: string
          id: string
          label: string
          location: string | null
          notes: string | null
          password_ciphertext: string | null
          serial_number: string | null
          tags: string[]
          updated_at: string
          url: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          cabinet?: string
          category?: string
          created_at?: string
          id?: string
          label: string
          location?: string | null
          notes?: string | null
          password_ciphertext?: string | null
          serial_number?: string | null
          tags?: string[]
          updated_at?: string
          url?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          cabinet?: string
          category?: string
          created_at?: string
          id?: string
          label?: string
          location?: string | null
          notes?: string | null
          password_ciphertext?: string | null
          serial_number?: string | null
          tags?: string[]
          updated_at?: string
          url?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      vault_recovery: {
        Row: {
          created_at: string
          id_path: string
          selfie_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id_path: string
          selfie_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id_path?: string
          selfie_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_grant_role: {
        Args: {
          _inviter: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_heir_of: {
        Args: { _guardian: string; _heir: string }
        Returns: boolean
      }
      is_trustee_of: {
        Args: { _grantor_id: string; _trustee_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "trustee"
        | "member"
        | "vice_president"
        | "admin"
        | "heir"
      asset_class:
        | "real_estate"
        | "digital"
        | "business"
        | "vehicle"
        | "financial"
        | "collectible"
        | "other"
      beneficiary_gender: "female" | "male" | "other" | "unspecified"
      doc_type: "deed" | "contract" | "receipt" | "insurance" | "tax" | "other"
      payment_frequency:
        | "one_time"
        | "monthly"
        | "quarterly"
        | "semi_annual"
        | "annual"
        | "biennial"
        | "triennial"
        | "every_5_years"
        | "custom"
      payment_source_kind:
        | "card"
        | "bank"
        | "gig"
        | "employer"
        | "company"
        | "cash"
        | "other"
      property_status: "owned_outright" | "financing" | "sold"
      property_type:
        | "house"
        | "land"
        | "commercial"
        | "other"
        | "condo"
        | "vehicle"
        | "website"
        | "domain"
        | "business"
        | "equipment"
        | "intellectual_property"
        | "financial_account"
        | "collectible"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "waiting" | "resolved" | "closed"
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
      app_role: [
        "owner",
        "trustee",
        "member",
        "vice_president",
        "admin",
        "heir",
      ],
      asset_class: [
        "real_estate",
        "digital",
        "business",
        "vehicle",
        "financial",
        "collectible",
        "other",
      ],
      beneficiary_gender: ["female", "male", "other", "unspecified"],
      doc_type: ["deed", "contract", "receipt", "insurance", "tax", "other"],
      payment_frequency: [
        "one_time",
        "monthly",
        "quarterly",
        "semi_annual",
        "annual",
        "biennial",
        "triennial",
        "every_5_years",
        "custom",
      ],
      payment_source_kind: [
        "card",
        "bank",
        "gig",
        "employer",
        "company",
        "cash",
        "other",
      ],
      property_status: ["owned_outright", "financing", "sold"],
      property_type: [
        "house",
        "land",
        "commercial",
        "other",
        "condo",
        "vehicle",
        "website",
        "domain",
        "business",
        "equipment",
        "intellectual_property",
        "financial_account",
        "collectible",
      ],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: ["open", "in_progress", "waiting", "resolved", "closed"],
    },
  },
} as const
