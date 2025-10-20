import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          password_hash: string;
          role: 'admin' | 'manager';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      districts: {
        Row: {
          id: string;
          name: string;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['districts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['districts']['Insert']>;
      };
      schools: {
        Row: {
          id: string;
          name: string;
          district_id: string;
          address: string | null;
          medium: 'Assamese' | 'English' | 'Both' | null;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['schools']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['schools']['Insert']>;
      };
      exam_years: {
        Row: {
          id: string;
          year: number;
          registration_open_date: string;
          registration_close_date: string;
          exam_date: string;
          result_date: string;
          status: 'active' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['exam_years']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['exam_years']['Insert']>;
      };
      registrations: {
        Row: {
          id: string;
          exam_year_id: string;
          full_name: string;
          gender: 'Male' | 'Female' | 'Other';
          dob: string;
          class: number;
          group_type: 'A' | 'B';
          medium: 'Assamese' | 'English';
          school_id: string;
          school_roll_no: string;
          district_id: string;
          area_or_district_name: string;
          address: string;
          student_mobile: string;
          guardian_mobile: string;
          email: string | null;
          payment_option: 'Online' | 'Offline';
          payment_status: 'Pending' | 'Verified' | 'Rejected';
          transaction_id: string | null;
          offline_receipt_no: string | null;
          payment_notes: string | null;
          payment_updated_by: string | null;
          payment_updated_at: string | null;
          created_by_role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['registrations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['registrations']['Insert']>;
      };
      results: {
        Row: {
          id: string;
          exam_year_id: string;
          registration_id: string;
          gk: number;
          science: number;
          mathematics: number;
          logical_reasoning: number;
          current_affairs: number;
          total: number;
          percentage: number;
          rank_global: number | null;
          rank_school: number | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['results']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['results']['Insert']>;
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          status: 'new' | 'read';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['contact_messages']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['contact_messages']['Insert']>;
      };
    };
  };
};
