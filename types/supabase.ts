export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: { Row: any; Insert: any; Update: any };
      students: { Row: any; Insert: any; Update: any };
      classes: { Row: any; Insert: any; Update: any };
      attendance: { Row: any; Insert: any; Update: any };
      student_evaluations: { Row: any; Insert: any; Update: any };
      invoices: { Row: any; Insert: any; Update: any };
      invoice_items: { Row: any; Insert: any; Update: any };
      tournaments: { Row: any; Insert: any; Update: any };
      tournaments_games: { Row: any; Insert: any; Update: any };
      packages: { Row: any; Insert: any; Update: any };
      payments: { Row: any; Insert: any; Update: any };
      notifications: { Row: any; Insert: any; Update: any };
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      student_status: any;
      class_type: any;
      payment_status: any;
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
