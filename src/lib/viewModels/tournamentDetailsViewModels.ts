// ============================================================================
// Tournament Details View Models
// ============================================================================
// This file contains all view model types for the Tournament Details view
// These types define the shape of component props and internal state

import type { TournamentDetailDTO, PlayerDTO, ScheduleDTO, MatchDTO, UpdateMatchDTO, TournamentType } from "@/types";

/**
 * View state for TournamentDetails component
 */
export interface TournamentDetailsViewModel {
  tournament: TournamentDetailDTO | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Props for TournamentDetails component
 */
export interface TournamentDetailsProps {
  tournamentId: string;
}

/**
 * Props for TournamentHeader component
 */
export interface TournamentHeaderProps {
  name: string;
  type: TournamentType;
  courts: number;
  playersCount: number;
  createdAt: string;
  onBack: () => void;
}

/**
 * Props for PlayersList component
 */
export interface PlayersListProps {
  players: PlayerDTO[];
}

/**
 * Props for ScheduleEditor component
 */
export interface ScheduleEditorProps {
  schedule: ScheduleDTO;
  maxCourts: number;
  onSaveSuccess: () => void;
}

/**
 * Internal state for ScheduleEditor component
 */
export interface ScheduleEditorState {
  originalMatches: MatchDTO[];
  editedMatches: Map<string, UpdateMatchDTO>;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  conflicts: ConflictInfo[];
}

/**
 * Conflict detection result
 */
export interface ConflictInfo {
  type: "court_order_duplicate" | "player_overlap";
  matchIds: string[];
  message: string;
}

/**
 * Props for ScheduleGrid component
 */
export interface ScheduleGridProps {
  matches: MatchDTO[];
  editable: boolean;
  maxCourts?: number;
  onMatchUpdate?: (matchId: string, field: "court" | "order", value: number) => void;
}




