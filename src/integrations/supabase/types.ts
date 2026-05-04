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
      friendships: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          abilities: Json
          achievements: Json
          avatar_url: string | null
          claimed_rewards: Json
          created_at: string
          current_boss: Json | null
          daily_stats: Json
          discord_id: string | null
          energy: number
          equipment: Json
          equipped_title: string | null
          gates: Json
          gold: number
          grand_quest: Json | null
          hp: number
          id: string
          inventory: Json
          is_admin: boolean
          is_onboarded: boolean
          last_active_date: string | null
          last_boss_attack_time: string | null
          levels: Json
          max_energy: number
          max_hp: number
          missed_quests_count: number
          player_id: string
          player_job: string
          player_name: string
          player_title: string
          prayer_quests: Json
          punishment: Json
          punishment_end_time: string | null
          quests: Json
          selected_reciter: string
          shadow_points: number
          shadow_soldiers: Json
          sound_enabled: boolean
          stats: Json
          streak_days: number
          total_level: number
          total_quests_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          abilities?: Json
          achievements?: Json
          avatar_url?: string | null
          claimed_rewards?: Json
          created_at?: string
          current_boss?: Json | null
          daily_stats?: Json
          discord_id?: string | null
          energy?: number
          equipment?: Json
          equipped_title?: string | null
          gates?: Json
          gold?: number
          grand_quest?: Json | null
          hp?: number
          id?: string
          inventory?: Json
          is_admin?: boolean
          is_onboarded?: boolean
          last_active_date?: string | null
          last_boss_attack_time?: string | null
          levels?: Json
          max_energy?: number
          max_hp?: number
          missed_quests_count?: number
          player_id?: string
          player_job?: string
          player_name?: string
          player_title?: string
          prayer_quests?: Json
          punishment?: Json
          punishment_end_time?: string | null
          quests?: Json
          selected_reciter?: string
          shadow_points?: number
          shadow_soldiers?: Json
          sound_enabled?: boolean
          stats?: Json
          streak_days?: number
          total_level?: number
          total_quests_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          abilities?: Json
          achievements?: Json
          avatar_url?: string | null
          claimed_rewards?: Json
          created_at?: string
          current_boss?: Json | null
          daily_stats?: Json
          discord_id?: string | null
          energy?: number
          equipment?: Json
          equipped_title?: string | null
          gates?: Json
          gold?: number
          grand_quest?: Json | null
          hp?: number
          id?: string
          inventory?: Json
          is_admin?: boolean
          is_onboarded?: boolean
          last_active_date?: string | null
          last_boss_attack_time?: string | null
          levels?: Json
          max_energy?: number
          max_hp?: number
          missed_quests_count?: number
          player_id?: string
          player_job?: string
          player_name?: string
          player_title?: string
          prayer_quests?: Json
          punishment?: Json
          punishment_end_time?: string | null
          quests?: Json
          selected_reciter?: string
          shadow_points?: number
          shadow_soldiers?: Json
          sound_enabled?: boolean
          stats?: Json
          streak_days?: number
          total_level?: number
          total_quests_completed?: number
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
      [_ in never]: never
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
