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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          admin_id: string
          created_at: string | null
          due_date: string | null
          id: string
          inspection_id: string
          inspector_id: string
          notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          inspection_id: string
          inspector_id: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          inspection_id?: string
          inspector_id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "assignments_with_inspections"
            referencedColumns: ["inspection_id_actual"]
          },
          {
            foreignKeyName: "assignments_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_images: {
        Row: {
          ai_confidence: number | null
          ai_description: string | null
          ai_detected_category: string | null
          ai_detected_objects: Json | null
          ai_suggested_fields: Json | null
          category: string
          created_at: string | null
          exif_data: Json | null
          file_name: string
          file_size: number | null
          id: string
          image_url: string
          inspection_id: string | null
          metadata: Json | null
          mime_type: string | null
          updated_at: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_description?: string | null
          ai_detected_category?: string | null
          ai_detected_objects?: Json | null
          ai_suggested_fields?: Json | null
          category: string
          created_at?: string | null
          exif_data?: Json | null
          file_name: string
          file_size?: number | null
          id?: string
          image_url: string
          inspection_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_description?: string | null
          ai_detected_category?: string | null
          ai_detected_objects?: Json | null
          ai_suggested_fields?: Json | null
          category?: string
          created_at?: string | null
          exif_data?: Json | null
          file_name?: string
          file_size?: number | null
          id?: string
          image_url?: string
          inspection_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_images_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "assignments_with_inspections"
            referencedColumns: ["inspection_id_actual"]
          },
          {
            foreignKeyName: "inspection_images_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          address: string
          admin_id: string | null
          categories: Json
          created_at: string | null
          date: string
          id: string
          inspection_complete: boolean | null
          inspector_id: string | null
          measurements: Json | null
          property_api_data: Json | null
          property_id: string | null
          property_outline: Json | null
          status: string
          sync_status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address: string
          admin_id?: string | null
          categories?: Json
          created_at?: string | null
          date?: string
          id?: string
          inspection_complete?: boolean | null
          inspector_id?: string | null
          measurements?: Json | null
          property_api_data?: Json | null
          property_id?: string | null
          property_outline?: Json | null
          status?: string
          sync_status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string
          admin_id?: string | null
          categories?: Json
          created_at?: string | null
          date?: string
          id?: string
          inspection_complete?: boolean | null
          inspector_id?: string | null
          measurements?: Json | null
          property_api_data?: Json | null
          property_id?: string | null
          property_outline?: Json | null
          status?: string
          sync_status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_invitations: {
        Row: {
          accepted_at: string | null
          admin_id: string
          created_at: string | null
          email: string
          id: string
          invitation_token: string | null
          invited_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          admin_id: string
          created_at?: string | null
          email: string
          id?: string
          invitation_token?: string | null
          invited_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          admin_id?: string
          created_at?: string | null
          email?: string
          id?: string
          invitation_token?: string | null
          invited_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspector_invitations_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          admin_id: string
          created_at: string | null
          id: string
          property_data: Json | null
          property_number: string
          updated_at: string | null
        }
        Insert: {
          address: string
          admin_id: string
          created_at?: string | null
          id?: string
          property_data?: Json | null
          property_number: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          property_data?: Json | null
          property_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      property_outlines: {
        Row: {
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          property_id: string
          satellite_image_url: string | null
          structures: Json
          updated_at: string | null
          zoom_level: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          property_id: string
          satellite_image_url?: string | null
          structures?: Json
          updated_at?: string | null
          zoom_level?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          property_id?: string
          satellite_image_url?: string | null
          structures?: Json
          updated_at?: string | null
          zoom_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_outlines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          admin_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          organization_name: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          organization_name?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          organization_name?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      assignments_with_inspections: {
        Row: {
          address: string | null
          assignment_id: string | null
          assignment_status: string | null
          inspection_id: string | null
          inspection_id_actual: string | null
          inspection_status: string | null
          inspector_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "assignments_with_inspections"
            referencedColumns: ["inspection_id_actual"]
          },
          {
            foreignKeyName: "assignments_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      debug_assignments_inspections: {
        Args: Record<PropertyKey, never>
        Returns: {
          assignment_id: string
          inspection_exists: boolean
          inspection_id: string
        }[]
      }
      get_next_property_number: {
        Args: { p_admin_id: string; p_year: number }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
