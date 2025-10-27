# View Implementation Plan: Tournament Details

## 1. Overview

The Tournament Details view displays complete information about a saved tournament, including its configuration, list of players, and the full match schedule. Users can edit the schedule by modifying court assignments and match order, with changes persisted via API. This is a protected route requiring authentication, and it focuses on post-creation tournament management rather than initial setup.

**Key Characteristics:**
- Read-only tournament metadata and player list
- Editable schedule (court assignments and match order only)
- Real-time validation and conflict detection
- Error handling with automatic rollback on save failures
- Optimistic UI updates disabled for safety

## 2. View Routing

**Path:** `/tournaments/[id]`

**Route Type:** Dynamic Astro page with React island for interactivity

**File Location:** `src/pages/tournaments/[id].astro`

**Protection:** Must be wrapped in authentication middleware (handled by existing `src/middleware/index.ts`)

## 3. Component Structure

```
TournamentDetailsPage.astro (Astro page)
└── TournamentDetails (React component) - Main container
    ├── TournamentHeader - Tournament metadata display
    │   └── BackButton - Navigation to dashboard
    ├── PlayersList - Read-only player list
    └── ScheduleEditor - Editable schedule section
        ├── ScheduleGrid - Reusable grid component
        ├── EditControls - Save/Cancel buttons
        └── ValidationMessages - Conflict warnings
```

**Component File Locations:**
- `src/pages/tournaments/[id].astro` - Page wrapper
- `src/components/TournamentDetails.tsx` - Main component
- `src/components/TournamentHeader.tsx` - Header section
- `src/components/PlayersList.tsx` - Players display
- `src/components/ScheduleEditor.tsx` - Schedule editing logic
- Reuse: `src/components/ScheduleGrid.tsx` (needs editable mode)

## 4. Component Details

### TournamentDetailsPage.astro (Astro Page)

**Component Description:**
Top-level Astro page component that handles server-side setup, route parameter extraction, and renders the React island. Performs initial authentication check via middleware.

**Main Elements:**
- `<Layout>` wrapper with page title
- `<TournamentDetails client:load>` React island
- Props pass-through: `tournamentId={Astro.params.id}`

**Handled Interactions:**
- None (delegated to React component)

**Handled Validation:**
- Route parameter presence check (id exists)
- If id is missing, redirect to dashboard

**Types:**
- `Astro.params: { id?: string }`

**Props:**
- None (receives params from Astro router)

---

### TournamentDetails (React Component)

**Component Description:**
Main orchestrator component responsible for fetching tournament data, managing global state, and coordinating child components. Handles loading states, errors, and data flow between API and UI.

**Main Elements:**
```tsx
<div className="container mx-auto py-8">
  {isLoading && <LoadingSpinner />}
  {error && <ErrorMessage />}
  {tournament && (
    <>
      <TournamentHeader {...headerProps} />
      <PlayersList players={tournament.players} />
      <ScheduleEditor 
        schedule={tournament.schedule} 
        maxCourts={tournament.courts}
        onSaveSuccess={handleRefetch}
      />
    </>
  )}
</div>
```

**Handled Interactions:**
- Initial data fetch on mount
- Refetch after successful save
- Navigation back to dashboard on error
- Retry on network errors

**Handled Validation:**
- Tournament data exists
- User has permission (401/404 handling)

**Types:**
- Props: `{ tournamentId: string }`
- State: Uses `TournamentDetailsViewModel`

```typescript
interface TournamentDetailsViewModel {
  tournament: TournamentDetailDTO | null;
  isLoading: boolean;
  error: string | null;
}
```

**Props:**
```typescript
interface TournamentDetailsProps {
  tournamentId: string;
}
```

---

### TournamentHeader (React Component)

**Component Description:**
Displays tournament metadata in a card-like header section. Shows name, type (singles/doubles badge), number of courts, player count, and creation date. Includes a back button for navigation.

**Main Elements:**
```tsx
<div className="bg-card rounded-lg shadow p-6 mb-6">
  <div className="flex justify-between items-start">
    <div>
      <Button variant="ghost" onClick={onBack}>← Back</Button>
      <h1 className="text-3xl font-bold">{name}</h1>
      <div className="flex gap-4 mt-2">
        <Badge>{type === 'singles' ? 'Singles' : 'Doubles'}</Badge>
        <span>{courts} courts</span>
        <span>{playersCount} players</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Created: {formatDate(createdAt)}
      </p>
    </div>
  </div>
</div>
```

**Handled Interactions:**
- Back button click → Navigate to `/` (dashboard)

**Handled Validation:**
- None

**Types:**
```typescript
interface TournamentHeaderProps {
  name: string;
  type: TournamentType;
  courts: number;
  playersCount: number;
  createdAt: string;
  onBack: () => void;
}
```

**Props:** As defined in interface above

---

### PlayersList (React Component)

**Component Description:**
Displays all tournament players in a compact, read-only list format. Shows either custom names or placeholder names. Provides visual separation between tournament configuration and schedule.

**Main Elements:**
```tsx
<div className="bg-card rounded-lg shadow p-6 mb-6">
  <h2 className="text-xl font-semibold mb-4">Players</h2>
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
    {players.map(player => (
      <div key={player.id} className="flex items-center gap-2 p-2 bg-muted rounded">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          {getInitials(player.name || player.placeholder_name)}
        </div>
        <span className="text-sm">
          {player.name || player.placeholder_name}
        </span>
      </div>
    ))}
  </div>
</div>
```

**Handled Interactions:**
- None (read-only display)

**Handled Validation:**
- None

**Types:**
```typescript
interface PlayersListProps {
  players: PlayerDTO[];
}

// PlayerDTO from types.ts:
// Pick<PlayerEntity, "id" | "name" | "placeholder_name">
```

**Props:** As defined in interface above

---

### ScheduleEditor (React Component)

**Component Description:**
Core editing component that manages schedule modification state. Tracks changes to matches, validates edits, detects conflicts, and handles save/cancel operations. Delegates display to ScheduleGrid but owns editing logic.

**Main Elements:**
```tsx
<div className="bg-card rounded-lg shadow p-6">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-semibold">Match Schedule</h2>
    {isDirty && (
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving || hasConflicts}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    )}
  </div>
  
  {hasConflicts && (
    <Alert variant="destructive" className="mb-4">
      <AlertDescription>
        Conflicts detected: {conflictMessages.join(', ')}
      </AlertDescription>
    </Alert>
  )}
  
  {saveError && (
    <Alert variant="destructive" className="mb-4">
      <AlertDescription>{saveError}</AlertDescription>
    </Alert>
  )}
  
  <ScheduleGrid 
    matches={displayMatches} 
    editable={true}
    maxCourts={maxCourts}
    onMatchUpdate={handleMatchUpdate}
  />
</div>
```

**Handled Interactions:**
- Match court number change
- Match order change
- Save button click
- Cancel button click
- Conflict resolution

**Handled Validation:**
1. **Court number range:** `1 <= court_number <= maxCourts`
2. **Match order:** Positive integers only (`match_order_on_court >= 1`)
3. **Duplicate match IDs:** Each match can only be updated once in the batch
4. **Match existence:** Updated match must belong to this schedule
5. **Conflict detection:** No two matches can share same `(court_number, match_order_on_court)` pair
6. **Player availability:** Players cannot play multiple matches simultaneously (same court/order)

**Types:**
```typescript
interface ScheduleEditorProps {
  schedule: ScheduleDTO;
  maxCourts: number;
  onSaveSuccess: () => void;
}

interface ScheduleEditorState {
  originalMatches: MatchDTO[];
  editedMatches: Map<string, UpdateMatchDTO>; // match_id -> update
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  conflicts: ConflictInfo[];
}

interface ConflictInfo {
  type: 'court_order_duplicate' | 'player_overlap';
  matchIds: string[];
  message: string;
}
```

**Props:** As defined in `ScheduleEditorProps` above

---

### ScheduleGrid (React Component - Reused/Enhanced)

**Component Description:**
Reusable component that renders matches in a grid organized by courts and match order. Must support both read-only (preview) and editable (details) modes. For editable mode, renders input fields for court and order changes.

**Main Elements:**
```tsx
<div className="space-y-4">
  {courtGroups.map(court => (
    <div key={court} className="border rounded-lg p-4">
      <h3 className="font-semibold mb-3">Court {court}</h3>
      <div className="space-y-2">
        {matchesByCourt[court]
          .sort((a, b) => a.match_order_on_court - b.match_order_on_court)
          .map(match => (
            <div key={match.id} className="flex items-center gap-4 p-3 bg-muted rounded">
              {editable ? (
                <>
                  <Select 
                    value={match.court_number} 
                    onValueChange={(val) => onMatchUpdate(match.id, 'court', val)}
                  >
                    {Array.from({length: maxCourts}, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={n}>Court {n}</SelectItem>
                    ))}
                  </Select>
                  <Input 
                    type="number" 
                    min="1" 
                    value={match.match_order_on_court}
                    onChange={(e) => onMatchUpdate(match.id, 'order', e.target.value)}
                    className="w-20"
                  />
                </>
              ) : (
                <span className="text-sm font-medium">Match {match.match_order_on_court}</span>
              )}
              <div className="flex-1">
                {formatMatchPlayers(match.players, tournamentType)}
              </div>
            </div>
          ))}
      </div>
    </div>
  ))}
</div>
```

**Handled Interactions:**
- Court selection change (if editable)
- Order input change (if editable)

**Handled Validation:**
- None (delegated to parent ScheduleEditor)

**Types:**
```typescript
interface ScheduleGridProps {
  matches: MatchDTO[];
  editable: boolean;
  maxCourts?: number; // Required if editable
  onMatchUpdate?: (matchId: string, field: 'court' | 'order', value: number) => void;
}
```

**Props:** As defined in interface above

## 5. Types

### Existing DTOs (from `src/types.ts`)

These types are already defined and should be imported:

```typescript
// Tournament detail response
export type TournamentDetailDTO = Pick<
  TournamentEntity, 
  "id" | "name" | "type" | "courts" | "created_at"
> & {
  players: PlayerDTO[];
  schedule: ScheduleDTO;
};

// Player information
export type PlayerDTO = Pick<
  PlayerEntity, 
  "id" | "name" | "placeholder_name"
>;

// Schedule with matches
export type ScheduleDTO = Pick<ScheduleEntity, "id"> & {
  matches: MatchDTO[];
};

// Match information
export type MatchDTO = Pick<
  MatchEntity, 
  "id" | "court_number" | "match_order_on_court"
> & {
  players: MatchPlayerDTO[];
};

// Player in match context
export type MatchPlayerDTO = Pick<
  PlayerEntity, 
  "id" | "name" | "placeholder_name"
> & {
  player_id: string;
  team: number | null;
};

// Match update command
export interface UpdateMatchDTO {
  match_id: string;
  court_number: number;
  match_order_on_court: number;
}

// Bulk update request
export interface UpdateScheduleMatchesRequestDTO {
  updates: UpdateMatchDTO[];
}

// Update response
export interface UpdateScheduleMatchesResponseDTO {
  schedule_id: string;
  updated_matches: string[];
}

// Tournament type enum
export type TournamentType = Enums<"tournament_type">;
```

### New ViewModels (to be created)

These types should be added to a new file `src/lib/viewModels/tournamentDetailsViewModels.ts`:

```typescript
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
  type: 'court_order_duplicate' | 'player_overlap';
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
  onMatchUpdate?: (matchId: string, field: 'court' | 'order', value: number) => void;
}
```

## 6. State Management

### Global State (TournamentDetails Component)

**Pattern:** React useState with custom hook

**Hook:** `useTournamentDetails`
- **Location:** `src/lib/hooks/useTournamentDetails.ts`
- **Purpose:** Fetch and cache tournament data
- **Parameters:** `tournamentId: string`
- **Returns:**
  ```typescript
  {
    tournament: TournamentDetailDTO | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
  }
  ```
- **Implementation:**
  ```typescript
  export function useTournamentDetails(tournamentId: string) {
    const [tournament, setTournament] = useState<TournamentDetailDTO | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTournament = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/tournaments/${tournamentId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Tournament not found');
          }
          if (response.status === 401) {
            throw new Error('Unauthorized');
          }
          throw new Error('Failed to load tournament');
        }
        
        const data: TournamentDetailDTO = await response.json();
        setTournament(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }, [tournamentId]);

    useEffect(() => {
      fetchTournament();
    }, [fetchTournament]);

    return { tournament, isLoading, error, refetch: fetchTournament };
  }
  ```

### Local State (ScheduleEditor Component)

**Pattern:** React useState with custom hook for editing logic

**Hook:** `useScheduleEditor`
- **Location:** `src/lib/hooks/useScheduleEditor.ts`
- **Purpose:** Manage schedule editing state and validation
- **Parameters:** 
  ```typescript
  {
    scheduleId: string;
    initialMatches: MatchDTO[];
    maxCourts: number;
  }
  ```
- **Returns:**
  ```typescript
  {
    displayMatches: MatchDTO[]; // Merged original + edits
    editedMatches: Map<string, UpdateMatchDTO>;
    isDirty: boolean;
    isSaving: boolean;
    saveError: string | null;
    conflicts: ConflictInfo[];
    updateMatch: (matchId: string, field: 'court' | 'order', value: number) => void;
    saveChanges: () => Promise<void>;
    cancelChanges: () => void;
    hasConflicts: boolean;
  }
  ```
- **Key Logic:**
  - Track changes in Map for O(1) lookup
  - Merge original matches with edits for display
  - Validate on every update
  - Detect conflicts before save
  - Rollback on API failure

## 7. API Integration

### Fetch Tournament Details

**Endpoint:** `GET /api/tournaments/{id}`

**Request Type:** None (GET with path parameter)

**Response Type:** `TournamentDetailDTO`

**Implementation Location:** `useTournamentDetails` hook

**Error Handling:**
- 401 Unauthorized → Redirect to login
- 404 Not Found → Show error, redirect to dashboard
- 500 Server Error → Show error with retry option
- Network Error → Show error with retry option

**Example:**
```typescript
const response = await fetch(`/api/tournaments/${tournamentId}`, {
  method: 'GET',
  credentials: 'include', // Include cookies for auth
  headers: {
    'Content-Type': 'application/json',
  },
});

if (!response.ok) {
  // Handle error based on status
}

const tournament: TournamentDetailDTO = await response.json();
```

---

### Update Schedule Matches

**Endpoint:** `PATCH /api/schedules/{id}/matches`

**Request Type:** `UpdateScheduleMatchesRequestDTO`

**Response Type:** `UpdateScheduleMatchesResponseDTO`

**Implementation Location:** `useScheduleEditor` hook (saveChanges method)

**Request Preparation:**
```typescript
// Convert Map to array of updates
const updates: UpdateMatchDTO[] = Array.from(editedMatches.values());

const requestBody: UpdateScheduleMatchesRequestDTO = {
  updates: updates,
};
```

**Error Handling:**
- 400 Bad Request → Show validation error, keep changes for correction
- 401 Unauthorized → Redirect to login
- 404 Not Found → Show error, refetch tournament
- 409 Conflict → Show conflict details, rollback changes
- 500 Server Error → Show error, rollback changes
- Network Error → Show error, keep changes for retry option

**Rollback Strategy:**
```typescript
try {
  const response = await fetch(`/api/schedules/${scheduleId}/matches`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error('Save failed');
  }

  const result: UpdateScheduleMatchesResponseDTO = await response.json();
  
  // Success: clear edited state
  setEditedMatches(new Map());
  setIsDirty(false);
  onSaveSuccess(); // Trigger refetch
  
} catch (error) {
  // Rollback: keep editedMatches, show error
  setSaveError(error.message);
  // Do NOT clear editedMatches - preserve user changes
}
```

## 8. User Interactions

### 1. Page Load
**Trigger:** User navigates to `/tournaments/[id]`

**Flow:**
1. Astro page extracts `id` from route params
2. React component mounts with `tournamentId` prop
3. `useTournamentDetails` hook fires GET request
4. Loading spinner displays while `isLoading === true`
5. On success: render header, players, and schedule
6. On error: display error message with back/retry buttons

**UI States:**
- Loading: Skeleton or spinner
- Success: Full content
- Error: Error card with actions

---

### 2. View Tournament Information
**Trigger:** Tournament data loaded successfully

**Display:**
- Tournament name as h1
- Type badge (Singles/Doubles)
- Courts count
- Players count
- Creation date (formatted)
- Back button to dashboard

**No interaction required** - informational display

---

### 3. View Players List
**Trigger:** Tournament data loaded successfully

**Display:**
- Grid of player cards (2-4 columns responsive)
- Each card shows initials avatar + name
- Uses `player.name` if available, else `player.placeholder_name`

**No interaction required** - read-only display

---

### 4. Edit Match Court Assignment
**Trigger:** User changes court number in schedule grid

**Flow:**
1. User clicks court select dropdown for a match
2. Dropdown shows options 1 through `maxCourts`
3. User selects new court number
4. `onMatchUpdate(matchId, 'court', newValue)` called
5. `useScheduleEditor` validates new value:
   - Must be between 1 and maxCourts
6. If valid: add/update match in `editedMatches` Map
7. Set `isDirty = true`
8. Re-run conflict detection
9. Update `displayMatches` with new value
10. Enable Save/Cancel buttons

**Validation:**
- Court number in range [1, maxCourts]
- Check for conflicts with other matches

**UI Feedback:**
- Dropdown highlights selected value
- Save button becomes enabled
- Conflict warning appears if detected

---

### 5. Edit Match Order
**Trigger:** User changes match order number

**Flow:**
1. User focuses on order input field for a match
2. User types new order number
3. On blur or Enter: `onMatchUpdate(matchId, 'order', newValue)` called
4. `useScheduleEditor` validates new value:
   - Must be positive integer (>= 1)
5. If valid: add/update match in `editedMatches` Map
6. Set `isDirty = true`
7. Re-run conflict detection
8. Update `displayMatches` with new value
9. Enable Save/Cancel buttons

**Validation:**
- Order >= 1
- Check for conflicts with other matches

**UI Feedback:**
- Input highlights on focus
- Save button becomes enabled
- Conflict warning appears if detected

---

### 6. Save Changes
**Trigger:** User clicks "Save Changes" button

**Preconditions:**
- `isDirty === true` (has unsaved changes)
- `hasConflicts === false` (no validation errors)

**Flow:**
1. Disable save button, show "Saving..." text
2. Convert `editedMatches` Map to array
3. Create request payload: `{ updates: UpdateMatchDTO[] }`
4. Send PATCH request to `/api/schedules/{scheduleId}/matches`
5. Wait for response
6. **On Success (200):**
   - Clear `editedMatches` Map
   - Set `isDirty = false`
   - Call `onSaveSuccess()` to trigger refetch
   - Show success toast/message
   - Re-enable buttons
7. **On Error (400/409/500):**
   - Keep `editedMatches` intact (rollback)
   - Set `saveError` with message
   - Display error alert
   - Re-enable buttons
   - User can retry or cancel

**UI States:**
- Saving: Button disabled, loading indicator
- Success: Brief success message, state reset
- Error: Error alert, changes preserved

---

### 7. Cancel Changes
**Trigger:** User clicks "Cancel" button

**Preconditions:**
- `isDirty === true` (has unsaved changes)

**Flow:**
1. Clear `editedMatches` Map
2. Set `isDirty = false`
3. Clear any `saveError`
4. Clear any conflicts
5. `displayMatches` reverts to original
6. Hide Save/Cancel buttons

**Confirmation:**
- For simplicity, no confirmation dialog in MVP
- Future: add "Are you sure?" dialog if many changes

---

### 8. Navigate Back
**Trigger:** User clicks "Back" button in header

**Flow:**
1. Check if `isDirty === true`
2. **If dirty:** Show confirmation dialog
   - "You have unsaved changes. Discard them?"
   - Confirm: navigate to `/`
   - Cancel: stay on page
3. **If not dirty:** Navigate immediately to `/`

**Implementation:**
```typescript
const handleBack = () => {
  if (isDirty) {
    if (confirm('You have unsaved changes. Discard them?')) {
      navigate('/');
    }
  } else {
    navigate('/');
  }
};
```

---

### 9. Handle Load Error
**Trigger:** Error occurs during initial data fetch

**Scenarios:**
- 401 Unauthorized → Redirect to login
- 404 Not Found → Show "Tournament not found" with back button
- Network/500 Error → Show error with retry button

**UI:**
```tsx
{error && (
  <div className="container mx-auto py-8">
    <Alert variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
    <div className="flex gap-2 mt-4">
      <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
      <Button variant="outline" onClick={refetch}>Retry</Button>
    </div>
  </div>
)}
```

## 9. Conditions and Validation

### Court Number Validation

**Affected Components:** ScheduleEditor, ScheduleGrid

**Condition:** `1 <= court_number <= tournament.courts`

**When Validated:**
- Before adding to `editedMatches`
- Before save API call
- Enforced by UI: select dropdown limited to valid range

**UI Implementation:**
```tsx
<Select value={match.court_number.toString()}>
  {Array.from({ length: maxCourts }, (_, i) => i + 1).map(n => (
    <SelectItem key={n} value={n.toString()}>
      Court {n}
    </SelectItem>
  ))}
</Select>
```

**Error Handling:**
- Invalid value should never occur due to dropdown
- If somehow received: show validation error, don't save

---

### Match Order Validation

**Affected Components:** ScheduleEditor, ScheduleGrid

**Condition:** `match_order_on_court >= 1` (positive integer)

**When Validated:**
- On input blur/change
- Before adding to `editedMatches`
- Before save API call

**UI Implementation:**
```tsx
<Input 
  type="number" 
  min="1" 
  step="1"
  value={match.match_order_on_court}
  onChange={handleOrderChange}
  onBlur={validateOrder}
/>
```

**Error Handling:**
- If value < 1: show inline error, disable save
- If non-integer: round or reject

---

### Conflict Detection

**Affected Components:** ScheduleEditor (validation logic)

**Condition:** No two matches can have identical `(court_number, match_order_on_court)` pair

**When Validated:**
- After every match update
- Before save button is enabled
- Continuously during editing

**Implementation:**
```typescript
function detectConflicts(
  originalMatches: MatchDTO[], 
  editedMatches: Map<string, UpdateMatchDTO>
): ConflictInfo[] {
  // Merge original + edits
  const finalMatches = originalMatches.map(m => {
    const edit = editedMatches.get(m.id);
    return edit ? { ...m, ...edit } : m;
  });
  
  // Check for duplicate court+order pairs
  const conflicts: ConflictInfo[] = [];
  const seen = new Map<string, string>(); // "court_order" -> matchId
  
  for (const match of finalMatches) {
    const key = `${match.court_number}_${match.match_order_on_court}`;
    const existing = seen.get(key);
    
    if (existing) {
      conflicts.push({
        type: 'court_order_duplicate',
        matchIds: [existing, match.id],
        message: `Matches conflict on Court ${match.court_number}, Order ${match.match_order_on_court}`,
      });
    } else {
      seen.set(key, match.id);
    }
  }
  
  return conflicts;
}
```

**UI State:**
- `hasConflicts = conflicts.length > 0`
- If true: disable save button, show alert with details
- Conflicts displayed above schedule grid

---

### Player Availability (Optional Enhancement)

**Affected Components:** ScheduleEditor (advanced validation)

**Condition:** A player cannot participate in multiple matches with the same `(court_number, match_order_on_court)`

**When Validated:**
- Same as conflict detection
- More complex: requires checking match.players arrays

**Implementation:**
```typescript
function detectPlayerOverlaps(matches: MatchDTO[]): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const slotPlayers = new Map<string, Set<string>>(); // "court_order" -> Set<playerIds>
  
  for (const match of matches) {
    const key = `${match.court_number}_${match.match_order_on_court}`;
    const playersInSlot = slotPlayers.get(key) || new Set();
    
    for (const player of match.players) {
      if (playersInSlot.has(player.player_id)) {
        conflicts.push({
          type: 'player_overlap',
          matchIds: [match.id],
          message: `Player ${player.name || player.placeholder_name} plays multiple matches in Court ${match.court_number}, Order ${match.match_order_on_court}`,
        });
      }
      playersInSlot.add(player.player_id);
    }
    
    slotPlayers.set(key, playersInSlot);
  }
  
  return conflicts;
}
```

**Note:** This may be overly restrictive. Consider if simultaneous play on different courts is allowed.

---

### Unique Match IDs

**Affected Components:** ScheduleEditor (Map usage)

**Condition:** Each match can only appear once in the updates array

**When Validated:**
- Automatically enforced by using `Map<string, UpdateMatchDTO>`
- Map keys are match IDs, so duplicates overwrite

**No explicit validation needed** - data structure guarantees uniqueness

---

### Match Belongs to Schedule

**Affected Components:** ScheduleEditor

**Condition:** All updated match IDs must exist in `originalMatches`

**When Validated:**
- Before adding to `editedMatches`
- Should never fail if UI only shows existing matches

**Implementation:**
```typescript
function updateMatch(matchId: string, field: string, value: number) {
  // Verify match exists
  const matchExists = originalMatches.some(m => m.id === matchId);
  if (!matchExists) {
    console.error('Match not found:', matchId);
    return;
  }
  
  // Proceed with update...
}
```

## 10. Error Handling

### Load Errors

**Scenario 1: Tournament Not Found (404)**
- **Cause:** Invalid tournament ID or user doesn't own it
- **Handling:**
  ```tsx
  <Alert variant="destructive">
    <AlertTitle>Tournament Not Found</AlertTitle>
    <AlertDescription>
      This tournament doesn't exist or you don't have permission to view it.
    </AlertDescription>
  </Alert>
  <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
  ```

**Scenario 2: Unauthorized (401)**
- **Cause:** User not logged in or session expired
- **Handling:** Automatic redirect to login page via middleware

**Scenario 3: Network Error**
- **Cause:** Connection issues, server down
- **Handling:**
  ```tsx
  <Alert variant="destructive">
    <AlertTitle>Connection Error</AlertTitle>
    <AlertDescription>
      Failed to load tournament. Please check your connection.
    </AlertDescription>
  </Alert>
  <Button onClick={refetch}>Retry</Button>
  ```

---

### Save Errors

**Scenario 1: Validation Error (400)**
- **Cause:** Invalid court number or order (should be prevented by UI)
- **Handling:**
  - Display error message from API
  - Keep changes in state (no rollback)
  - Allow user to correct and retry
  - Example: "Invalid court_number: must be between 1 and 6"

**Scenario 2: Conflict Error (409)**
- **Cause:** Server-side conflict detection (duplicate court/order)
- **Handling:**
  - Display conflict details from API
  - Rollback changes (clear `editedMatches`)
  - Refetch fresh data
  - Alert user: "Conflict detected: [details]. Changes have been discarded. Please review the schedule and try again."

**Scenario 3: Not Found (404)**
- **Cause:** Schedule or tournament deleted by another session
- **Handling:**
  - Display error: "Schedule no longer exists"
  - Redirect to dashboard after 3 seconds

**Scenario 4: Server Error (500)**
- **Cause:** Backend issue, database error
- **Handling:**
  - Display generic error message
  - Keep changes in state (allow retry)
  - Log error details to console
  - Alert: "An error occurred while saving. Please try again."

**Scenario 5: Network Error**
- **Cause:** Connection lost during save
- **Handling:**
  - Display error: "Connection lost. Changes not saved."
  - Keep changes in state
  - Offer retry button
  - Consider adding auto-retry with exponential backoff

---

### Validation Errors (Client-Side)

**Scenario 1: Court Out of Range**
- **Prevention:** Dropdown limited to valid courts
- **Fallback:** If somehow occurs, show error and prevent save

**Scenario 2: Invalid Order**
- **Prevention:** Input type="number" with min="1"
- **Fallback:** Validate on blur, show inline error

**Scenario 3: Detected Conflicts**
- **Handling:**
  - Disable save button
  - Display alert above grid with conflict details
  - Highlight conflicting matches (optional enhancement)
  - Example: "Cannot save: 2 matches are scheduled for Court 1, Order 3"

---

### Edge Cases

**Scenario 1: Concurrent Edits**
- **Problem:** Another user/session modifies the same tournament
- **Handling:** 
  - API returns 409 conflict
  - Rollback and refetch fresh data
  - Inform user of conflict

**Scenario 2: Deleted Tournament**
- **Problem:** Tournament deleted while user is viewing
- **Handling:**
  - Save returns 404
  - Redirect to dashboard with message

**Scenario 3: Browser Refresh**
- **Problem:** User refreshes page with unsaved changes
- **Handling:**
  - Changes are lost (no persistence in MVP)
  - Future: consider localStorage backup

**Scenario 4: Network Timeout**
- **Problem:** Slow connection, request hangs
- **Handling:**
  - Set timeout on fetch (e.g., 30 seconds)
  - Display timeout error with retry option

## 11. Implementation Steps

### Step 1: Create Types and ViewModels
1. Create file: `src/lib/viewModels/tournamentDetailsViewModels.ts`
2. Add all interface definitions from Section 5
3. Ensure imports from `src/types.ts` and `src/db/database.types.ts`

### Step 2: Create API Hook - useTournamentDetails
1. Create file: `src/lib/hooks/useTournamentDetails.ts`
2. Implement fetch logic as described in Section 6
3. Handle all error cases (401, 404, 500, network)
4. Return: `{ tournament, isLoading, error, refetch }`
5. Add proper TypeScript types

### Step 3: Create Editing Hook - useScheduleEditor
1. Create file: `src/lib/hooks/useScheduleEditor.ts`
2. Implement state management with Map for edited matches
3. Implement `updateMatch` function with validation
4. Implement conflict detection function
5. Implement `saveChanges` with API call and rollback
6. Implement `cancelChanges` to reset state
7. Return all necessary state and functions

### Step 4: Enhance ScheduleGrid Component (if needed)
1. Open existing: `src/components/ScheduleGrid.tsx`
2. Add `editable` prop (boolean)
3. Add `maxCourts` prop (number, optional)
4. Add `onMatchUpdate` prop (function, optional)
5. Conditionally render:
   - If editable: select dropdown for court, input for order
   - If not editable: static text
6. Ensure proper styling and responsiveness
7. Test both modes (preview and details)

### Step 5: Create TournamentHeader Component
1. Create file: `src/components/TournamentHeader.tsx`
2. Implement UI as described in Section 4
3. Accept props: name, type, courts, playersCount, createdAt, onBack
4. Add back button with navigation handler
5. Format date properly (use date-fns or similar)
6. Add responsive layout
7. Use Shadcn/ui components (Button, Badge)

### Step 6: Create PlayersList Component
1. Create file: `src/components/PlayersList.tsx`
2. Implement grid layout (responsive columns)
3. Map through players array
4. Display avatar with initials + name
5. Handle both custom names and placeholder names
6. Use Tailwind for styling
7. Ensure accessibility (proper semantic HTML)

### Step 7: Create ScheduleEditor Component
1. Create file: `src/components/ScheduleEditor.tsx`
2. Use `useScheduleEditor` hook
3. Render ScheduleGrid with editable=true
4. Render Save/Cancel buttons (conditional on isDirty)
5. Render conflict alerts (conditional on hasConflicts)
6. Render save error alerts
7. Wire up all event handlers
8. Implement save/cancel logic
9. Test all validation scenarios

### Step 8: Create TournamentDetails Component
1. Create file: `src/components/TournamentDetails.tsx`
2. Use `useTournamentDetails` hook
3. Implement loading state (skeleton or spinner)
4. Implement error state (alert with actions)
5. Implement success state:
   - Render TournamentHeader
   - Render PlayersList
   - Render ScheduleEditor
6. Pass proper props to all children
7. Handle navigation (back button, errors)
8. Test data flow

### Step 9: Create Astro Page
1. Create file: `src/pages/tournaments/[id].astro`
2. Extract id from `Astro.params`
3. Validate id exists, redirect if not
4. Wrap in Layout component
5. Render TournamentDetails React component with client:load
6. Pass tournamentId prop
7. Set proper page title
8. Ensure middleware protection is active

### Step 10: Update Navigation
1. Open: `src/components/TournamentCard.tsx` (or dashboard component)
2. Ensure tournament cards link to `/tournaments/[id]`
3. Test navigation from dashboard to details

### Step 11: Test Error Scenarios
1. Test with invalid tournament ID (should show 404 error)
2. Test unauthorized access (should redirect to login)
3. Test network errors (disconnect network, should show error)
4. Test save conflicts (create conflict, should detect and prevent)
5. Test save errors (mock 500 error, should rollback)

### Step 12: Test User Interactions
1. Load page with valid tournament
2. View all tournament information
3. Edit match court assignments
4. Edit match orders
5. Create conflict (same court+order)
6. Verify save button disabled
7. Resolve conflict
8. Save changes successfully
9. Verify refetch shows updated data
10. Make changes and cancel
11. Verify rollback works
12. Navigate back to dashboard

### Step 13: Polish and Accessibility
1. Add proper ARIA labels to interactive elements
2. Ensure keyboard navigation works (tab order)
3. Test with screen reader
4. Add loading indicators to all async actions
5. Ensure proper focus management
6. Add transitions/animations (subtle)
7. Test responsive design on mobile
8. Verify color contrast meets WCAG standards

### Step 14: Documentation
1. Add JSDoc comments to all components
2. Add JSDoc comments to hooks
3. Update main README if needed
4. Document any gotchas or edge cases
5. Add code examples for complex logic

### Step 15: Final Review
1. Run linter, fix all issues
2. Run type checker, fix all errors
3. Test all happy paths
4. Test all error paths
5. Review code for consistency with project guidelines
6. Ensure no console.logs in production code (or use proper logger)
7. Verify all user stories are met
8. Perform cross-browser testing
9. Get code review from team member
10. Deploy to staging and test end-to-end



