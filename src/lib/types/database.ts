// supabase/migrations/*.sql 스키마를 손으로 옮긴 타입.
// Supabase 프로젝트 연결 후 아래 명령으로 자동 생성본으로 교체한다:
//   npx supabase gen types typescript --linked > src/lib/types/database.ts

type Profile = {
  id: string;
  display_name: string;
  created_at: string;
};

type BusTrip = {
  id: string;
  trip_date: string;
  terminal_name: string;
  bus_company: string;
  vehicle_number: string;
  destination: string | null;
  invoice_box_count: number;
  departure_time: string | null;
  arrival_time: string | null;
  created_by: string | null;
  created_at: string;
};

type Order = {
  id: string;
  order_date: string;
  terminal_name: string;
  customer_name: string;
  box_count: number;
  bus_trip_id: string | null;
  checked: boolean;
  checked_by: string | null;
  checked_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type LabelPhoto = {
  id: string;
  bus_trip_id: string;
  storage_path: string;
  taken_by: string | null;
  taken_at: string;
};

type BusTripReconciliation = {
  bus_trip_id: string;
  trip_date: string;
  terminal_name: string;
  bus_company: string;
  vehicle_number: string;
  invoice_box_count: number;
  assigned_order_count: number;
  checked_order_count: number;
  checked_box_count: number;
  is_mismatch: boolean;
};

type TableDef<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile, Pick<Profile, "id" | "display_name">>;
      bus_trips: TableDef<
        BusTrip,
        Omit<BusTrip, "id" | "created_at"> & { id?: string; created_at?: string }
      >;
      orders: TableDef<
        Order,
        Omit<
          Order,
          | "id"
          | "bus_trip_id"
          | "checked"
          | "checked_by"
          | "checked_at"
          | "created_at"
          | "updated_at"
        > & {
          id?: string;
          bus_trip_id?: string | null;
          checked?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      label_photos: TableDef<
        LabelPhoto,
        Omit<LabelPhoto, "id" | "taken_at"> & { id?: string; taken_at?: string }
      >;
    };
    Views: {
      bus_trip_reconciliation: {
        Row: BusTripReconciliation;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
