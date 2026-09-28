// supabase/migrations/*.sql 스키마를 손으로 옮긴 타입.
// Supabase 프로젝트 연결 후 아래 명령으로 자동 생성본으로 교체한다:
//   npx supabase gen types typescript --linked > src/lib/types/database.ts

type Profile = {
  id: string;
  display_name: string;
  created_at: string;
};

// 트립은 터미널명 + 날짜만으로 만든다. 버스회사·차량번호 같은 송장 정보는 텍스트로 입력하지
// 않고 사진(label_photos, photo_type='invoice')으로 남긴다. invoice_box_count만 예외 —
// AI가 송장 사진에서 읽어 제안한 값을 사람이 확인/수정해서 저장한다.
type BusTrip = {
  id: string;
  trip_date: string;
  terminal_name: string;
  invoice_box_count: number | null;
  departure_time: string | null;
  created_by: string | null;
  created_at: string;
};

type PhotoType = "label" | "invoice";

// 업로드 직후엔 'pending'(AI 분류가 아직 백그라운드에서 진행 중)으로 들어가고, 분류가 끝나면
// 터미널을 찾았든 못 찾았든 'done'이 된다 — 확인 탭이 "분류 대기 중"과 "정말 못 찾음"을
// 구분해서 보여주는 데 쓴다.
type ClassificationStatus = "pending" | "done";

type LabelPhoto = {
  id: string;
  bus_trip_id: string;
  photo_type: PhotoType;
  storage_path: string;
  taken_by: string | null;
  taken_at: string;
  classification_status: ClassificationStatus;
  // 택배송장(label) 사진에서만 채워진다 — 버스송장에는 해당 없어 항상 null.
  company_name: string | null;
};

// 검수는 정상/문제있음 구분 없이 "검수완료" 하나뿐이다 (스와이프로 확인). 문제가 있으면 메모에 적는다.
type TripReview = {
  id: string;
  bus_trip_id: string;
  note: string | null;
  reviewed_by: string | null;
  reviewed_at: string;
};

type TripReviewStatus = {
  trip_id: string;
  trip_date: string;
  terminal_name: string;
  label_photo_count: number;
  invoice_photo_count: number;
  latest_note: string | null;
  latest_reviewed_at: string | null;
  invoice_box_count: number | null;
  departure_time: string | null;
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
        Pick<BusTrip, "trip_date" | "terminal_name" | "created_by"> & {
          id?: string;
          created_at?: string;
          invoice_box_count?: number | null;
          departure_time?: string | null;
        }
      >;
      label_photos: TableDef<
        LabelPhoto,
        Omit<LabelPhoto, "id" | "taken_at" | "classification_status" | "company_name"> & {
          id?: string;
          taken_at?: string;
          classification_status?: ClassificationStatus;
          company_name?: string | null;
        }
      >;
      trip_reviews: TableDef<
        TripReview,
        Omit<TripReview, "id" | "reviewed_at"> & { id?: string; reviewed_at?: string }
      >;
    };
    Views: {
      trip_review_status: {
        Row: TripReviewStatus;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
