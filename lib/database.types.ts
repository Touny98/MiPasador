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
      analytics_eventos: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: number
          merchant_id: string | null
          metadata: Json | null
          producto_id: string | null
          tipo: string
          wa_user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: number
          merchant_id?: string | null
          metadata?: Json | null
          producto_id?: string | null
          tipo: string
          wa_user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: number
          merchant_id?: string | null
          metadata?: Json | null
          producto_id?: string | null
          tipo?: string
          wa_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_eventos_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_eventos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      comisiones: {
        Row: {
          created_at: string | null
          fecha: string | null
          id: number
          link_pago: string | null
          monto_comision: number | null
          pagado: boolean | null
          pasador_id: number | null
          total_viajes: number | null
        }
        Insert: {
          created_at?: string | null
          fecha?: string | null
          id?: number
          link_pago?: string | null
          monto_comision?: number | null
          pagado?: boolean | null
          pasador_id?: number | null
          total_viajes?: number | null
        }
        Update: {
          created_at?: string | null
          fecha?: string | null
          id?: number
          link_pago?: string | null
          monto_comision?: number | null
          pagado?: boolean | null
          pasador_id?: number | null
          total_viajes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comisiones_pasador_id_fkey"
            columns: ["pasador_id"]
            isOneToOne: false
            referencedRelation: "pasadores"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          context: Json | null
          created_at: string | null
          follow_up_last_at: string | null
          follow_up_pendiente: boolean
          follow_up_sent_count: number
          id: string
          is_active: boolean | null
          last_interaction_at: string | null
          merchant_id: string | null
          updated_at: string | null
          user_name: string | null
          user_whatsapp_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          follow_up_last_at?: string | null
          follow_up_pendiente?: boolean
          follow_up_sent_count?: number
          id?: string
          is_active?: boolean | null
          last_interaction_at?: string | null
          merchant_id?: string | null
          updated_at?: string | null
          user_name?: string | null
          user_whatsapp_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          follow_up_last_at?: string | null
          follow_up_pendiente?: boolean
          follow_up_sent_count?: number
          id?: string
          is_active?: boolean | null
          last_interaction_at?: string | null
          merchant_id?: string | null
          updated_at?: string | null
          user_name?: string | null
          user_whatsapp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string | null
          event_type: string | null
          id: string
          is_active: boolean | null
          merchant_id: string | null
          metadata: Json | null
          start_time: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string
          is_active?: boolean | null
          merchant_id?: string | null
          metadata?: Json | null
          start_time?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string
          is_active?: boolean | null
          merchant_id?: string | null
          metadata?: Json | null
          start_time?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          id: string
          rate: number
          target_currency: string
          timestamp: string | null
        }
        Insert: {
          base_currency: string
          id?: string
          rate: number
          target_currency: string
          timestamp?: string | null
        }
        Update: {
          base_currency?: string
          id?: string
          rate?: number
          target_currency?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          follow_up_day: number
          id: string
          product_id: string | null
          product_name: string
          scheduled_at: string
          sent_at: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          follow_up_day: number
          id?: string
          product_id?: string | null
          product_name: string
          scheduled_at: string
          sent_at?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          follow_up_day?: number
          id?: string
          product_id?: string | null
          product_name?: string
          scheduled_at?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          phone_number: string | null
          updated_at: string | null
          whatsapp_business_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone_number?: string | null
          updated_at?: string | null
          whatsapp_business_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone_number?: string | null
          updated_at?: string | null
          whatsapp_business_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          direction: string | null
          id: string
          message_type: string | null
          metadata: Json | null
          whatsapp_message_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          whatsapp_message_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      pasadores: {
        Row: {
          activo: boolean | null
          cantidad_viajes_completados: number | null
          created_at: string | null
          dni: string | null
          estado: string | null
          id: number
          nombre_completo: string | null
          reputacion_promedio: number | null
          ultima_conexion: string | null
          wa_user_id: string
        }
        Insert: {
          activo?: boolean | null
          cantidad_viajes_completados?: number | null
          created_at?: string | null
          dni?: string | null
          estado?: string | null
          id?: number
          nombre_completo?: string | null
          reputacion_promedio?: number | null
          ultima_conexion?: string | null
          wa_user_id: string
        }
        Update: {
          activo?: boolean | null
          cantidad_viajes_completados?: number | null
          created_at?: string | null
          dni?: string | null
          estado?: string | null
          id?: number
          nombre_completo?: string | null
          reputacion_promedio?: number | null
          ultima_conexion?: string | null
          wa_user_id?: string
        }
        Relationships: []
      }
      plantillas_seguimiento: {
        Row: {
          activa: boolean
          condicion: string
          created_at: string
          dias_delay: number
          id: number
          merchant_id: string | null
          texto: string
        }
        Insert: {
          activa?: boolean
          condicion: string
          created_at?: string
          dias_delay: number
          id?: number
          merchant_id?: string | null
          texto: string
        }
        Update: {
          activa?: boolean
          condicion?: string
          created_at?: string
          dias_delay?: number
          id?: number
          merchant_id?: string | null
          texto?: string
        }
        Relationships: []
      }
      postulaciones: {
        Row: {
          correcciones: Json | null
          created_at: string | null
          dni: string | null
          estado: string | null
          id: number
          imagen_dorso_url: string | null
          imagen_frente_url: string | null
          nombre_completo: string | null
          pdf_url: string | null
          wa_user_id: string | null
        }
        Insert: {
          correcciones?: Json | null
          created_at?: string | null
          dni?: string | null
          estado?: string | null
          id?: number
          imagen_dorso_url?: string | null
          imagen_frente_url?: string | null
          nombre_completo?: string | null
          pdf_url?: string | null
          wa_user_id?: string | null
        }
        Update: {
          correcciones?: Json | null
          created_at?: string | null
          dni?: string | null
          estado?: string | null
          id?: number
          imagen_dorso_url?: string | null
          imagen_frente_url?: string | null
          nombre_completo?: string | null
          pdf_url?: string | null
          wa_user_id?: string | null
        }
        Relationships: []
      }
      postulaciones_comercio: {
        Row: {
          categoria_productos: string | null
          correcciones: string | null
          created_at: string | null
          direccion: string | null
          dni: string | null
          estado: string | null
          foto_local_url: string | null
          id: string
          nombre_completo: string | null
          nombre_negocio: string | null
          wa_user_id: string
        }
        Insert: {
          categoria_productos?: string | null
          correcciones?: string | null
          created_at?: string | null
          direccion?: string | null
          dni?: string | null
          estado?: string | null
          foto_local_url?: string | null
          id?: string
          nombre_completo?: string | null
          nombre_negocio?: string | null
          wa_user_id: string
        }
        Update: {
          categoria_productos?: string | null
          correcciones?: string | null
          created_at?: string | null
          direccion?: string | null
          dni?: string | null
          estado?: string | null
          foto_local_url?: string | null
          id?: string
          nombre_completo?: string | null
          nombre_negocio?: string | null
          wa_user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          merchant_id: string | null
          name: string
          normalized_name: string | null
          price: number | null
          sku: string | null
          stock: number | null
          total_reservations: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          merchant_id?: string | null
          name: string
          normalized_name?: string | null
          price?: number | null
          sku?: string | null
          stock?: number | null
          total_reservations?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          merchant_id?: string | null
          name?: string
          normalized_name?: string | null
          price?: number | null
          sku?: string | null
          stock?: number | null
          total_reservations?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      queries: {
        Row: {
          clicked_product_id: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          normalized_search_term: string | null
          resolved_bool: boolean
          results_count: number | null
          search_term: string
        }
        Insert: {
          clicked_product_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          normalized_search_term?: string | null
          resolved_bool?: boolean
          results_count?: number | null
          search_term: string
        }
        Update: {
          clicked_product_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          normalized_search_term?: string | null
          resolved_bool?: boolean
          results_count?: number | null
          search_term?: string
        }
        Relationships: [
          {
            foreignKeyName: "queries_clicked_product_id_fkey"
            columns: ["clicked_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          comentario: string | null
          created_at: string | null
          id: number
          pasador_id: number | null
          puntuacion: number | null
          usuario_wa_id: string | null
          viaje_id: number | null
        }
        Insert: {
          comentario?: string | null
          created_at?: string | null
          id?: number
          pasador_id?: number | null
          puntuacion?: number | null
          usuario_wa_id?: string | null
          viaje_id?: number | null
        }
        Update: {
          comentario?: string | null
          created_at?: string | null
          id?: number
          pasador_id?: number | null
          puntuacion?: number | null
          usuario_wa_id?: string | null
          viaje_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_pasador_id_fkey"
            columns: ["pasador_id"]
            isOneToOne: false
            referencedRelation: "pasadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: true
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones_pasador: {
        Row: {
          fin: string | null
          id: number
          inicio: string | null
          pasador_id: number | null
          resumen_enviado: boolean | null
          total_comision: number | null
          viajes_realizados: number | null
        }
        Insert: {
          fin?: string | null
          id?: number
          inicio?: string | null
          pasador_id?: number | null
          resumen_enviado?: boolean | null
          total_comision?: number | null
          viajes_realizados?: number | null
        }
        Update: {
          fin?: string | null
          id?: number
          inicio?: string | null
          pasador_id?: number | null
          resumen_enviado?: boolean | null
          total_comision?: number | null
          viajes_realizados?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_pasador_pasador_id_fkey"
            columns: ["pasador_id"]
            isOneToOne: false
            referencedRelation: "pasadores"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifas_pasador: {
        Row: {
          activa: boolean | null
          id: number
          peso_max: number | null
          peso_min: number | null
          precio_ars: number | null
          ruta: string | null
        }
        Insert: {
          activa?: boolean | null
          id?: number
          peso_max?: number | null
          peso_min?: number | null
          precio_ars?: number | null
          ruta?: string | null
        }
        Update: {
          activa?: boolean | null
          id?: number
          peso_max?: number | null
          peso_min?: number | null
          precio_ars?: number | null
          ruta?: string | null
        }
        Relationships: []
      }
      viajes: {
        Row: {
          comision_ars: number | null
          completado_at: string | null
          created_at: string | null
          descripcion: string | null
          direccion_destino: string | null
          direccion_origen: string | null
          estado: string | null
          id: number
          pasador_id: number | null
          peso: number | null
          precio_ars: number | null
          rating: number | null
          ruta: string | null
          usuario_wa_id: string | null
        }
        Insert: {
          comision_ars?: number | null
          completado_at?: string | null
          created_at?: string | null
          descripcion?: string | null
          direccion_destino?: string | null
          direccion_origen?: string | null
          estado?: string | null
          id?: number
          pasador_id?: number | null
          peso?: number | null
          precio_ars?: number | null
          rating?: number | null
          ruta?: string | null
          usuario_wa_id?: string | null
        }
        Update: {
          comision_ars?: number | null
          completado_at?: string | null
          created_at?: string | null
          descripcion?: string | null
          direccion_destino?: string | null
          direccion_origen?: string | null
          estado?: string | null
          id?: number
          pasador_id?: number | null
          peso?: number | null
          precio_ars?: number | null
          rating?: number | null
          ruta?: string | null
          usuario_wa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viajes_pasador_id_fkey"
            columns: ["pasador_id"]
            isOneToOne: false
            referencedRelation: "pasadores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_products: {
        Args: { merchant?: string; query_text: string }
        Returns: {
          category: string
          description: string
          id: string
          image_url: string
          merchant_id: string
          name: string
          normalized_name: string
          price: number
          stock: number
          total_reservations: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
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
