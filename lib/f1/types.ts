/**
 * F1 Types — TypeScript interfaces for OpenF1 API responses.
 *
 * These mirror the JSON shapes returned by https://api.openf1.org/v1/.
 * Each tool imports the types it needs so inputs and outputs are fully typed.
 */

export interface OpenF1Meeting {
  readonly meeting_key: number;
  readonly meeting_name: string;
  readonly meeting_official_name: string;
  readonly location: string;
  readonly country_code: string;
  readonly country_name: string;
  readonly country_flag: string;
  readonly circuit_key: number;
  readonly circuit_short_name: string;
  readonly circuit_type: string;
  readonly circuit_info_url: string;
  readonly circuit_image: string;
  readonly gmt_offset: string;
  readonly date_start: string;
  readonly date_end: string;
  readonly year: number;
  readonly is_cancelled: boolean;
}

export interface OpenF1Session {
  readonly session_key: number;
  readonly meeting_key: number;
  readonly session_type: string;
  readonly session_name: string;
  readonly date_start: string;
  readonly date_end: string;
  readonly circuit_key: number;
  readonly circuit_short_name: string;
  readonly country_code: string;
  readonly country_name: string;
  readonly location: string;
  readonly gmt_offset: string;
  readonly year: number;
  readonly is_cancelled: boolean;
}

export interface OpenF1Driver {
  readonly meeting_key: number;
  readonly session_key: number;
  readonly driver_number: number;
  readonly broadcast_name: string;
  readonly full_name: string;
  readonly name_acronym: string;
  readonly team_name: string;
  readonly team_colour: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly headshot_url: string | null;
  readonly country_code: string | null;
}

export interface OpenF1Position {
  readonly date: string;
  readonly session_key: number;
  readonly meeting_key: number;
  readonly driver_number: number;
  readonly position: number;
}

export interface OpenF1Lap {
  readonly meeting_key: number;
  readonly session_key: number;
  readonly driver_number: number;
  readonly lap_number: number;
  readonly date_start: string;
  readonly duration_sector_1: number | null;
  readonly duration_sector_2: number | null;
  readonly duration_sector_3: number | null;
  readonly i1_speed: number | null;
  readonly i2_speed: number | null;
  readonly st_speed: number | null;
  readonly is_pit_out_lap: boolean;
  readonly lap_duration: number | null;
  readonly lap_time: string | null;
  readonly segments_sector_1: readonly (number | null)[];
  readonly segments_sector_2: readonly (number | null)[];
  readonly segments_sector_3: readonly (number | null)[];
}

export interface OpenF1PitStop {
  readonly date: string;
  readonly session_key: number;
  readonly meeting_key: number;
  readonly driver_number: number;
  readonly lap_number: number;
  readonly lane_duration: number;
  readonly stop_duration: number | null;
  readonly pit_duration: number;
}

export interface OpenF1Weather {
  readonly date: string;
  readonly session_key: number;
  readonly meeting_key: number;
  readonly air_temperature: number;
  readonly track_temperature: number;
  readonly humidity: number;
  readonly pressure: number;
  readonly wind_direction: number;
  readonly wind_speed: number;
  readonly rainfall: number;
}

export interface OpenF1CarData {
  readonly date: string;
  readonly session_key: number;
  readonly meeting_key: number;
  readonly driver_number: number;
  readonly speed: number;
  readonly rpm: number;
  readonly n_gear: number;
  readonly throttle: number;
  readonly brake: number;
  readonly drs: number | null;
}
