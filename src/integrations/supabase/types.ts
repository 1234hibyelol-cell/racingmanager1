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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string
          id: string
          league_id: string | null
          message: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id?: string | null
          message: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string | null
          message?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      leagues: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          next_race_at: string
          round: number
          season: number
          tier: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          next_race_at?: string
          round?: number
          season?: number
          tier?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          next_race_at?: string
          round?: number
          season?: number
          tier?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          rating: number
          username: string
          xp: number
        }
        Insert: {
          created_at?: string
          id: string
          rating?: number
          username: string
          xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          username?: string
          xp?: number
        }
        Relationships: []
      }
      race_entries: {
        Row: {
          color: string
          created_at: string
          dnf: boolean
          driver_name: string
          gap_ms: number
          grid: number
          id: string
          laps_done: number
          last_lap_ms: number
          mode: string
          pending_order: string | null
          pit_count: number
          points: number
          position: number
          race_id: string
          team_id: string
          team_name: string
          total_ms: number
          tyre: number
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          dnf?: boolean
          driver_name: string
          gap_ms?: number
          grid?: number
          id?: string
          laps_done?: number
          last_lap_ms?: number
          mode?: string
          pending_order?: string | null
          pit_count?: number
          points?: number
          position?: number
          race_id: string
          team_id: string
          team_name: string
          total_ms?: number
          tyre?: number
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          dnf?: boolean
          driver_name?: string
          gap_ms?: number
          grid?: number
          id?: string
          laps_done?: number
          last_lap_ms?: number
          mode?: string
          pending_order?: string | null
          pit_count?: number
          points?: number
          position?: number
          race_id?: string
          team_id?: string
          team_name?: string
          total_ms?: number
          tyre?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "race_entries_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      race_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          lap: number
          message: string
          race_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          lap?: number
          message: string
          race_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          lap?: number
          message?: string
          race_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "race_events_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      races: {
        Row: {
          created_at: string
          current_lap: number
          finished_at: string | null
          id: string
          laps: number
          league_id: string
          round: number
          safety_car: boolean
          scheduled_at: string
          season: number
          started_at: string | null
          status: string
          temperature: number
          track_id: string
          track_name: string
          weather: string
        }
        Insert: {
          created_at?: string
          current_lap?: number
          finished_at?: string | null
          id?: string
          laps?: number
          league_id: string
          round: number
          safety_car?: boolean
          scheduled_at: string
          season?: number
          started_at?: string | null
          status?: string
          temperature?: number
          track_id: string
          track_name: string
          weather?: string
        }
        Update: {
          created_at?: string
          current_lap?: number
          finished_at?: string | null
          id?: string
          laps?: number
          league_id?: string
          round?: number
          safety_car?: boolean
          scheduled_at?: string
          season?: number
          started_at?: string | null
          status?: string
          temperature?: number
          track_id?: string
          track_name?: string
          weather?: string
        }
        Relationships: [
          {
            foreignKeyName: "races_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      season_results: {
        Row: {
          created_at: string
          id: string
          league_id: string
          points: number
          position: number
          season: number
          team_id: string | null
          team_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          points: number
          position: number
          season: number
          team_id?: string | null
          team_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          points?: number
          position?: number
          season?: number
          team_id?: string | null
          team_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "season_results_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          budget: number
          color: string
          created_at: string
          drivers: Json
          hq: Json
          id: string
          is_bot: boolean
          league_id: string
          name: string
          points: number
          research: Json
          sponsor: Json
          staff: Json
          strategy: string
          user_id: string | null
          wins: number
        }
        Insert: {
          budget?: number
          color?: string
          created_at?: string
          drivers?: Json
          hq?: Json
          id?: string
          is_bot?: boolean
          league_id: string
          name: string
          points?: number
          research?: Json
          sponsor?: Json
          staff?: Json
          strategy?: string
          user_id?: string | null
          wins?: number
        }
        Update: {
          budget?: number
          color?: string
          created_at?: string
          drivers?: Json
          hq?: Json
          id?: string
          is_bot?: boolean
          league_id?: string
          name?: string
          points?: number
          research?: Json
          sponsor?: Json
          staff?: Json
          strategy?: string
          user_id?: string | null
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
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
