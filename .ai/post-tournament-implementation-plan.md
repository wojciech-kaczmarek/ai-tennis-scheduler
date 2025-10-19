# API Endpoint Implementation Plan: POST /api/tournaments

## 1. Endpoint Overview

This endpoint creates a complete tournament along with its associated players and schedule in a single atomic operation. It represents the final step in the tournament creation wizard, where the user has already generated and reviewed the schedule and is ready to persist it to the database.

**Key Characteristics:**
- Complex nested data structure requiring multi-table insertions
- Must maintain referential integrity across 5 tables: `tournaments`, `players`, `schedules`, `matches`, `match_players`
- Requires database transaction to ensure atomicity
- User-specific operation requiring authentication
- Returns simplified tournament summary upon success

## 2. Request Details

- **HTTP Method**: `POST`
- **URL Structure**: `/api/tournaments`
- **Content-Type**: `application/json`
- **Authentication**: Required (via Supabase auth token in request headers/cookies)

### Request Parameters

**Query Parameters**: None

**Request Body** (JSON):

#### Required Fields:
- `name` (string): Tournament name, must be non-empty
- `type` (string): Tournament type, must be either `'singles'` or `'doubles'`
- `courts` (number): Number of available courts, must be a positive integer (smallint range: 1-32767)
- `players` (array): Array of player objects, must contain at least 2 players
  - `placeholder_name` (string): Required, used to reference players in matches
  - `name` (string | null): Optional, actual player name
- `schedule` (object): Schedule definition
  - `matches` (array): Array of match objects, must not be empty
    - `court_number` (number): Court assignment (1 to courts count)
    - `match_order_on_court` (number): Match sequence on court (positive integer)
    - `players` (array): Array of player references in this match
      - `placeholder_name` (string): Must match a player's placeholder_name
      - `team` (number | null): Team assignment (1 or 2 for doubles, null for singles)

#### Optional Fields:
- `players[].name`: Can be null if player name is not yet known

### Request Body Example (Singles):

```json
{
  "name": "Friday Night Singles",
  "type": "singles",
  "courts": 2,
  "players": [
    { "name": "John Doe", "placeholder_name": "Player 1" },
    { "name": "Jane Smith", "placeholder_name": "Player 2" },
    { "name": null, "placeholder_name": "Player 3" },
    { "name": "Bob Wilson", "placeholder_name": "Player 4" }
  ],
  "schedule": {
    "matches": [
      {
        "court_number": 1,
        "match_order_on_court": 1,
        "players": [
          { "placeholder_name": "Player 1", "team": null },
          { "placeholder_name": "Player 2", "team": null }
        ]
      },
      {
        "court_number": 2,
        "match_order_on_court": 1,
        "players": [
          { "placeholder_name": "Player 3", "team": null },
          { "placeholder_name": "Player 4", "team": null }
        ]
      }
    ]
  }
}
```

### Request Body Example (Doubles):

```json
{
  "name": "Saturday Doubles Tournament",
  "type": "doubles",
  "courts": 1,
  "players": [
    { "name": "Alice Brown", "placeholder_name": "Player 1" },
    { "name": "Bob Smith", "placeholder_name": "Player 2" },
    { "name": "Carol White", "placeholder_name": "Player 3" },
    { "name": "David Lee", "placeholder_name": "Player 4" }
  ],
  "schedule": {
    "matches": [
      {
        "court_number": 1,
        "match_order_on_court": 1,
        "players": [
          { "placeholder_name": "Player 1", "team": 1 },
          { "placeholder_name": "Player 2", "team": 1 },
          { "placeholder_name": "Player 3", "team": 2 },
          { "placeholder_name": "Player 4", "team": 2 }
        ]
      }
    ]
  }
}
```

## 3. Used Types

### Request Types:
- **`CreateTournamentRequestDTO`**: Main request payload type
- **`CreateTournamentPlayerDTO`**: Player definition in request
- **`CreateTournamentScheduleDTO`**: Schedule structure in request
- **`CreateTournamentMatchDTO`**: Match definition in request
- **`CreateTournamentMatchPlayerDTO`**: Player reference in match

### Response Types:
- **`TournamentCreatedResponseDTO`**: Success response (alias for `TournamentListItemDTO`)

### Entity Types (Internal):
- **`TournamentEntity`**: Database tournament record
- **`PlayerEntity`**: Database player record
- **`ScheduleEntity`**: Database schedule record
- **`MatchEntity`**: Database match record
- **`MatchPlayerEntity`**: Database match-player junction record
- **`TournamentType`**: Enum type for tournament types

### Validation Schema:
- **Zod schema**: `createTournamentSchema` (to be defined in `src/lib/schemas/tournamentSchemas.ts`)

## 4. Response Details

### Success Response (201 Created):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Friday Night Singles",
  "type": "singles",
  "players_count": 4,
  "courts": 2,
  "created_at": "2025-10-19T14:30:00.000Z"
}
```

**Response Fields:**
- `id` (uuid): Unique identifier of the created tournament
- `name` (string): Tournament name
- `type` (string): Tournament type ('singles' or 'doubles')
- `players_count` (number): Total number of players (calculated from players array)
- `courts` (number): Number of courts
- `created_at` (string): ISO 8601 timestamp of creation

### Error Responses:

#### 400 Bad Request:
```json
{
  "error": "Invalid request payload",
  "details": [
    "Field 'name' is required",
    "Field 'type' must be either 'singles' or 'doubles'"
  ]
}
```

#### 401 Unauthorized:
```json
{
  "error": "Authentication required"
}
```

#### 422 Unprocessable Entity:
```json
{
  "error": "Validation failed",
  "details": [
    "For doubles tournaments, player count must be divisible by 4",
    "Player 'Player 5' referenced in match but not found in players list"
  ]
}
```

#### 500 Internal Server Error:
```json
{
  "error": "Failed to create tournament"
}
```

## 5. Data Flow

### High-Level Flow:

```
1. Client Request → Astro API Route
2. Authentication Check (via context.locals.supabase)
3. Request Body Validation (Zod schema)
4. Business Logic Validation (custom rules)
5. Database Transaction:
   a. Insert tournament → get tournament_id
   b. Insert players → map placeholder_name to player_id
   c. Insert schedule → get schedule_id
   d. Insert matches → get match_ids
   e. Insert match_players (using player_id mappings)
6. Commit Transaction
7. Format Response (TournamentCreatedResponseDTO)
8. Return 201 with response body
```

### Detailed Data Flow:

#### Step 1: Authentication
- Extract Supabase client from `context.locals.supabase`
- Call `supabase.auth.getUser()` to verify authentication
- Extract `user_id` from auth context
- If no user, return 401 Unauthorized

#### Step 2: Request Validation
- Parse request body as JSON
- Validate against Zod schema (`createTournamentSchema`)
- Perform type checking and required field validation
- If validation fails, return 400 Bad Request with details

#### Step 3: Business Logic Validation
- Validate player count rules:
  - For singles: count must be even and ≥ 2
  - For doubles: count must be divisible by 4 and ≥ 4
- Validate court numbers in matches (1 to `courts`)
- Validate match slot uniqueness (no duplicate `court_number` + `match_order_on_court`)
- Validate player references in matches:
  - All `placeholder_name` values must exist in players array
  - All players should be referenced in at least one match
- Validate team assignments:
  - For singles: all teams must be null
  - For doubles: teams must be 1 or 2, each match must have 2 players per team
- Validate match player counts:
  - Singles matches must have exactly 2 players
  - Doubles matches must have exactly 4 players
- If validation fails, return 422 Unprocessable Entity with details

#### Step 4: Service Layer Execution
- Call `tournamentService.createTournamentWithSchedule()` with:
  - `user_id`
  - `tournamentData` (from request)
  - Supabase client

Service performs the following in a database transaction:

1. **Insert Tournament**:
   ```typescript
   const { data: tournament, error: tournamentError } = await supabase
     .from('tournaments')
     .insert({
       user_id: userId,
       name: tournamentData.name,
       type: tournamentData.type,
       courts: tournamentData.courts,
       players_count: tournamentData.players.length
     })
     .select()
     .single();
   ```

2. **Insert Players and Build Mapping**:
   ```typescript
   const { data: players, error: playersError } = await supabase
     .from('players')
     .insert(
       tournamentData.players.map(p => ({
         tournament_id: tournament.id,
         name: p.name,
         placeholder_name: p.placeholder_name
       }))
     )
     .select();
   
   // Build placeholder_name → player_id mapping
   const playerMap = new Map(
     players.map(p => [p.placeholder_name, p.id])
   );
   ```

3. **Insert Schedule**:
   ```typescript
   const { data: schedule, error: scheduleError } = await supabase
     .from('schedules')
     .insert({
       tournament_id: tournament.id
     })
     .select()
     .single();
   ```

4. **Insert Matches**:
   ```typescript
   const { data: matches, error: matchesError } = await supabase
     .from('matches')
     .insert(
       tournamentData.schedule.matches.map(m => ({
         schedule_id: schedule.id,
         court_number: m.court_number,
         match_order_on_court: m.match_order_on_court
       }))
     )
     .select();
   
   // Build match index mapping for match_players insertion
   const matchMap = new Map(
     matches.map((match, idx) => [idx, match.id])
   );
   ```

5. **Insert Match-Players**:
   ```typescript
   const matchPlayerInserts = tournamentData.schedule.matches.flatMap(
     (match, matchIdx) =>
       match.players.map(mp => ({
         match_id: matchMap.get(matchIdx)!,
         player_id: playerMap.get(mp.placeholder_name)!,
         team: mp.team
       }))
   );
   
   const { error: matchPlayersError } = await supabase
     .from('match_players')
     .insert(matchPlayerInserts);
   ```

6. **Return Created Tournament**:
   - Service returns the tournament record
   - Format as `TournamentCreatedResponseDTO`

#### Step 5: Error Handling
- Catch database errors and rollback transaction
- Log errors appropriately
- Return 500 Internal Server Error with generic message

#### Step 6: Response
- Return 201 Created with formatted response body
- Include `Location` header with tournament URL: `/api/tournaments/{id}`

## 6. Security Considerations

### Authentication & Authorization

1. **User Authentication**:
   - Verify user is authenticated via `context.locals.supabase.auth.getUser()`
   - Reject unauthenticated requests with 401
   - Never trust client-provided `user_id` values

2. **Row-Level Security (RLS)**:
   - RLS is enabled on `tournaments` table
   - `user_id` is automatically set from `auth.uid()` in policies
   - Users can only create tournaments for themselves
   - Related tables (players, schedules, matches) are accessed through tournaments

3. **Authorization**:
   - No additional authorization needed (any authenticated user can create tournaments)

### Input Validation & Sanitization

1. **Schema Validation**:
   - Use Zod for comprehensive input validation
   - Validate data types, required fields, and formats
   - Reject requests with invalid structure immediately

2. **Business Rule Validation**:
   - Validate player count constraints
   - Validate schedule consistency
   - Prevent SQL injection through parameterized queries (handled by Supabase client)

3. **Resource Limits**:
   - Limit maximum array sizes to prevent DoS:
     - Max players: 24
     - Max matches: 100
     - Max players per match: 4 (enforced by business logic)
   - Limit string lengths:
     - Tournament name: 200 characters
     - Player name: 100 characters
     - Placeholder name: 50 characters

### Data Protection

1. **Sensitive Data**:
   - Never expose `user_id` in responses
   - Use UUIDs for all IDs (prevents enumeration)
   - Sanitize error messages (don't leak schema details)

2. **Transaction Integrity**:
   - Use database transactions to ensure atomicity
   - On failure, rollback all changes
   - Prevent partial data insertion

## 7. Error Handling

### Error Categories & Status Codes

#### 1. Authentication Errors (401 Unauthorized)

**Scenarios:**
- No authentication token provided
- Invalid or expired authentication token
- User session expired

**Response:**
```json
{
  "error": "Authentication required"
}
```

**Implementation:**
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return new Response(
    JSON.stringify({ error: "Authentication required" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 2. Request Validation Errors (400 Bad Request)

**Scenarios:**
- Invalid JSON syntax
- Missing required fields
- Type mismatches
- Invalid enum values

**Response:**
```json
{
  "error": "Invalid request payload",
  "details": [
    "Field 'name' is required and must be a non-empty string",
    "Field 'type' must be either 'singles' or 'doubles'",
    "Field 'courts' must be a positive integer"
  ]
}
```

**Implementation:**
```typescript
const validationResult = createTournamentSchema.safeParse(requestBody);
if (!validationResult.success) {
  return new Response(
    JSON.stringify({
      error: "Invalid request payload",
      details: validationResult.error.errors.map(e => e.message)
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 3. Business Logic Errors (422 Unprocessable Entity)

**Scenarios:**

a. **Player Count Violations:**
- Singles tournament with odd number of players
- Doubles tournament with player count not divisible by 4
- Less than minimum players (2 for singles, 4 for doubles)

b. **Schedule Consistency Violations:**
- Invalid court numbers (outside 1 to courts range)
- Duplicate match slots (same court_number + match_order_on_court)
- Player reference not found in players list
- Player not referenced in any match

c. **Team Assignment Violations:**
- Singles matches with non-null team values
- Doubles matches with invalid team numbers (not 1 or 2)
- Doubles matches without exactly 2 players per team

d. **Match Composition Violations:**
- Singles matches without exactly 2 players
- Doubles matches without exactly 4 players

e. **Database Constraint Violations:**
- Unique constraint violation on match slots
- Foreign key constraint violation

**Response:**
```json
{
  "error": "Validation failed",
  "details": [
    "For doubles tournaments, player count must be divisible by 4",
    "Match on court 1, order 1 has invalid player reference: 'Player 99'",
    "Duplicate match slot detected: court 2, order 1"
  ]
}
```

**Implementation:**
```typescript
// Example validation function
function validateBusinessRules(data: CreateTournamentRequestDTO): string[] {
  const errors: string[] = [];
  
  // Player count validation
  if (data.type === 'singles' && data.players.length % 2 !== 0) {
    errors.push('Singles tournaments must have an even number of players');
  }
  if (data.type === 'doubles' && data.players.length % 4 !== 0) {
    errors.push('Doubles tournaments must have a player count divisible by 4');
  }
  
  // Court number validation
  const invalidCourts = data.schedule.matches.filter(
    m => m.court_number < 1 || m.court_number > data.courts
  );
  if (invalidCourts.length > 0) {
    errors.push(`Invalid court numbers detected. Courts must be between 1 and ${data.courts}`);
  }
  
  // Player reference validation
  const playerNames = new Set(data.players.map(p => p.placeholder_name));
  for (const match of data.schedule.matches) {
    for (const mp of match.players) {
      if (!playerNames.has(mp.placeholder_name)) {
        errors.push(`Player '${mp.placeholder_name}' referenced in match but not found in players list`);
      }
    }
  }
  
  // ... more validations
  
  return errors;
}

// Usage
const validationErrors = validateBusinessRules(validatedData);
if (validationErrors.length > 0) {
  return new Response(
    JSON.stringify({ error: "Validation failed", details: validationErrors }),
    { status: 422, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 4. Server Errors (500 Internal Server Error)

**Scenarios:**
- Database connection failure
- Transaction rollback failure
- Unexpected runtime errors
- Service layer exceptions

**Response:**
```json
{
  "error": "Failed to create tournament"
}
```

**Implementation:**
```typescript
try {
  const result = await tournamentService.createTournamentWithSchedule(
    user.id,
    validatedData,
    supabase
  );
  // ... success handling
} catch (error) {
  console.error("Tournament creation failed:", error);
  return new Response(
    JSON.stringify({ error: "Failed to create tournament" }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### Error Logging Strategy

1. **Client Errors (4xx)**:
   - Log basic info (timestamp, user_id, endpoint)
   - Log validation errors for analytics
   - Don't log full request body (may contain sensitive data)

2. **Server Errors (5xx)**:
   - Log full error stack trace
   - Log request context (user_id, tournament data structure without PII)
   - Alert development team for investigation
   - Consider using error tracking service (e.g., Sentry)

### Error Response Format

All error responses should follow consistent structure:

```typescript
type ErrorResponse = {
  error: string;           // Human-readable error message
  details?: string[];      // Optional array of specific validation errors
  code?: string;          // Optional error code for client handling
};
```

## 8. Performance Considerations

### Potential Bottlenecks

1. **Multi-Table Insertions**:
   - Creating a tournament involves 5 table insertions
   - Large schedules (50+ matches) can result in hundreds of insert operations
   - Mitigation: Use batch inserts where possible

2. **Transaction Duration**:
   - Long-running transactions can lock tables
   - Risk of deadlocks with concurrent requests
   - Mitigation: Keep transaction scope minimal, use connection pooling

3. **Network Latency**:
   - Multiple round-trips to Supabase
   - Mitigation: Use Supabase batch operations, minimize query count

4. **Data Validation**:
   - Complex business rule validation can be CPU-intensive for large schedules
   - Mitigation: Early validation, fail fast approach

### Optimization Strategies

#### 1. Batch Insert Operations

Instead of inserting records one-by-one, use batch inserts:

```typescript
// Good: Batch insert
await supabase.from('players').insert(playersArray);

// Bad: Individual inserts
for (const player of playersArray) {
  await supabase.from('players').insert(player);
}
```

#### 2. Use Single Transaction

Ensure all operations occur in a single database transaction. While Supabase doesn't expose explicit transaction control via the client SDK, multiple operations can be executed within the same connection context.

**Note**: For complex transactions, consider using PostgreSQL stored procedures or Supabase Edge Functions with direct database access.

#### 3. Minimize Data Transfer

- Only select necessary fields in insert responses
- Use `.select('id')` when only IDs are needed
- Avoid `.select('*')` unless full record is required

#### 5. Database Indexes

Ensure proper indexes exist (from db-plan.md):
- `idx_tournaments_user_id` on `tournaments(user_id)`
- `idx_players_tournament_id` on `players(tournament_id)`
- `idx_matches_schedule_id` on `matches(schedule_id)`
- `idx_match_players_match_id` on `match_players(match_id)`
- `idx_match_players_player_id` on `match_players(player_id)`

#### 6. Connection Pooling

- Supabase handles connection pooling automatically
- Ensure proper Supabase client initialization (singleton pattern)
- Don't create new Supabase clients per request

### Performance Targets

- **Response Time**: < 2 seconds for typical tournament (4-8 players, 10-20 matches)
- **Response Time**: < 5 seconds for large tournament (20+ players, 100+ matches)
- **Throughput**: Handle 10+ concurrent tournament creations
- **Database Transaction**: Complete within 1 second

### Monitoring Metrics

1. **Request Metrics**:
   - Average response time
   - 95th percentile response time
   - Error rate by status code
   - Request volume

2. **Database Metrics**:
   - Query execution time
   - Transaction duration
   - Connection pool utilization
   - Deadlock frequency

3. **Business Metrics**:
   - Tournament creation success rate
   - Average players per tournament
   - Average matches per tournament

## 9. Implementation Steps

### Step 1: Define Zod Validation Schema

**File**: `src/lib/schemas/tournamentSchemas.ts`

```typescript
import { z } from 'zod';

// Player schema for tournament creation
const createTournamentPlayerSchema = z.object({
  name: z.string().max(100).nullable(),
  placeholder_name: z.string().min(1).max(50)
});

// Match player reference schema
const createTournamentMatchPlayerSchema = z.object({
  placeholder_name: z.string().min(1).max(50),
  team: z.number().int().min(1).max(2).nullable()
});

// Match schema
const createTournamentMatchSchema = z.object({
  court_number: z.number().int().positive(),
  match_order_on_court: z.number().int().positive(),
  players: z.array(createTournamentMatchPlayerSchema).min(2).max(4)
});

// Schedule schema
const createTournamentScheduleSchema = z.object({
  matches: z.array(createTournamentMatchSchema).min(1).max(100)
});

// Main tournament creation schema
export const createTournamentSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  type: z.enum(['singles', 'doubles']),
  courts: z.number().int().min(1).max(100),
  players: z.array(createTournamentPlayerSchema).min(2).max(240),
  schedule: createTournamentScheduleSchema
});

// Type inference
export type CreateTournamentSchemaType = z.infer<typeof createTournamentSchema>;
```

### Step 2: Create Business Validation Function

**File**: `src/lib/services/tournamentService.ts` (add to existing file)

```typescript
import type { CreateTournamentRequestDTO } from '../../types';

/**
 * Validates business rules for tournament creation
 * Returns array of error messages (empty if valid)
 */
export function validateTournamentBusinessRules(
  data: CreateTournamentRequestDTO
): string[] {
  const errors: string[] = [];

  // Player count validation
  if (data.type === 'singles') {
    if (data.players.length < 2) {
      errors.push('Singles tournaments must have at least 2 players');
    }
    if (data.players.length % 2 !== 0) {
      errors.push('Singles tournaments must have an even number of players');
    }
  }

  if (data.type === 'doubles') {
    if (data.players.length < 4) {
      errors.push('Doubles tournaments must have at least 4 players');
    }
    if (data.players.length % 4 !== 0) {
      errors.push('Doubles tournaments must have a player count divisible by 4');
    }
  }

  // Build player set for reference validation
  const playerNames = new Set(data.players.map(p => p.placeholder_name));

  // Validate placeholder_name uniqueness
  if (playerNames.size !== data.players.length) {
    errors.push('Duplicate placeholder names found in players list');
  }

  // Validate match slots uniqueness
  const matchSlots = new Set<string>();
  for (const match of data.schedule.matches) {
    const slotKey = `${match.court_number}-${match.match_order_on_court}`;
    if (matchSlots.has(slotKey)) {
      errors.push(
        `Duplicate match slot: court ${match.court_number}, order ${match.match_order_on_court}`
      );
    }
    matchSlots.add(slotKey);
  }

  // Validate each match
  for (const match of data.schedule.matches) {
    // Court number validation
    if (match.court_number < 1 || match.court_number > data.courts) {
      errors.push(
        `Invalid court number ${match.court_number}. Must be between 1 and ${data.courts}`
      );
    }

    // Player count validation
    const expectedPlayerCount = data.type === 'singles' ? 2 : 4;
    if (match.players.length !== expectedPlayerCount) {
      errors.push(
        `Match on court ${match.court_number}, order ${match.match_order_on_court} has ${match.players.length} players, expected ${expectedPlayerCount}`
      );
    }

    // Validate player references
    for (const mp of match.players) {
      if (!playerNames.has(mp.placeholder_name)) {
        errors.push(
          `Player '${mp.placeholder_name}' in match not found in players list`
        );
      }
    }

    // Team validation
    if (data.type === 'singles') {
      const invalidTeams = match.players.filter(p => p.team !== null);
      if (invalidTeams.length > 0) {
        errors.push(
          `Singles match on court ${match.court_number} has team assignments (should be null)`
        );
      }
    }

    if (data.type === 'doubles') {
      const teams = match.players.map(p => p.team);
      const team1Count = teams.filter(t => t === 1).length;
      const team2Count = teams.filter(t => t === 2).length;
      const invalidTeams = teams.filter(t => t !== 1 && t !== 2);

      if (invalidTeams.length > 0) {
        errors.push(
          `Doubles match on court ${match.court_number} has invalid team values (must be 1 or 2)`
        );
      }
      if (team1Count !== 2 || team2Count !== 2) {
        errors.push(
          `Doubles match on court ${match.court_number} must have exactly 2 players per team`
        );
      }
    }
  }

  // Validate all players are referenced
  const referencedPlayers = new Set<string>();
  for (const match of data.schedule.matches) {
    for (const mp of match.players) {
      referencedPlayers.add(mp.placeholder_name);
    }
  }
  for (const playerName of playerNames) {
    if (!referencedPlayers.has(playerName)) {
      errors.push(`Player '${playerName}' is not referenced in any match`);
    }
  }

  return errors;
}
```

### Step 3: Create Service Method for Tournament Creation

**File**: `src/lib/services/tournamentService.ts` (add to existing file)

```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type {
  CreateTournamentRequestDTO,
  TournamentCreatedResponseDTO
} from '../../types';

/**
 * Creates a tournament with players and schedule in a single transaction
 */
export async function createTournamentWithSchedule(
  userId: string,
  data: CreateTournamentRequestDTO,
  supabase: SupabaseClient
): Promise<TournamentCreatedResponseDTO> {
  // Step 1: Insert tournament
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .insert({
      user_id: userId,
      name: data.name,
      type: data.type,
      courts: data.courts,
      players_count: data.players.length
    })
    .select('id, name, type, players_count, courts, created_at')
    .single();

  if (tournamentError || !tournament) {
    throw new Error(`Failed to create tournament: ${tournamentError?.message}`);
  }

  try {
    // Step 2: Insert players and build mapping
    const { data: players, error: playersError } = await supabase
      .from('players')
      .insert(
        data.players.map(p => ({
          tournament_id: tournament.id,
          name: p.name,
          placeholder_name: p.placeholder_name
        }))
      )
      .select('id, placeholder_name');

    if (playersError || !players) {
      throw new Error(`Failed to create players: ${playersError?.message}`);
    }

    // Build placeholder_name → player_id mapping
    const playerMap = new Map<string, string>(
      players.map(p => [p.placeholder_name, p.id])
    );

    // Step 3: Insert schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        tournament_id: tournament.id
      })
      .select('id')
      .single();

    if (scheduleError || !schedule) {
      throw new Error(`Failed to create schedule: ${scheduleError?.message}`);
    }

    // Step 4: Insert matches
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .insert(
        data.schedule.matches.map(m => ({
          schedule_id: schedule.id,
          court_number: m.court_number,
          match_order_on_court: m.match_order_on_court
        }))
      )
      .select('id');

    if (matchesError || !matches) {
      throw new Error(`Failed to create matches: ${matchesError?.message}`);
    }

    // Step 5: Insert match-players
    const matchPlayerInserts = data.schedule.matches.flatMap((match, matchIdx) =>
      match.players.map(mp => ({
        match_id: matches[matchIdx].id,
        player_id: playerMap.get(mp.placeholder_name)!,
        team: mp.team
      }))
    );

    const { error: matchPlayersError } = await supabase
      .from('match_players')
      .insert(matchPlayerInserts);

    if (matchPlayersError) {
      throw new Error(`Failed to create match players: ${matchPlayersError.message}`);
    }

    // Return created tournament
    return {
      id: tournament.id,
      name: tournament.name,
      type: tournament.type,
      players_count: tournament.players_count,
      courts: tournament.courts,
      created_at: tournament.created_at
    };
  } catch (error) {
    // Cleanup: Delete tournament (cascade will remove all related records)
    await supabase.from('tournaments').delete().eq('id', tournament.id);
    throw error;
  }
}
```

### Step 4: Implement API Endpoint

**File**: `src/pages/api/tournaments.ts`

```typescript
import type { APIRoute } from 'astro';
import { createTournamentSchema } from '../../lib/schemas/tournamentSchemas';
import {
  validateTournamentBusinessRules,
  createTournamentWithSchedule
} from '../../lib/services/tournamentService';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // Step 1: Authentication check
  const supabase = locals.supabase;
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Step 2: Parse request body
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Invalid JSON payload'
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Step 3: Zod schema validation
  const validationResult = createTournamentSchema.safeParse(requestBody);
  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        error: 'Invalid request payload',
        details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const validatedData = validationResult.data;

  // Step 4: Business rules validation
  const businessErrors = validateTournamentBusinessRules(validatedData);
  if (businessErrors.length > 0) {
    return new Response(
      JSON.stringify({
        error: 'Validation failed',
        details: businessErrors
      }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Step 5: Create tournament via service
  try {
    const createdTournament = await createTournamentWithSchedule(
      user.id,
      validatedData,
      supabase
    );

    return new Response(JSON.stringify(createdTournament), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        Location: `/api/tournaments/${createdTournament.id}`
      }
    });
  } catch (error) {
    console.error('Tournament creation failed:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create tournament'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
```

### Step 5: Update Type Definitions (if needed)

**File**: `src/types.ts`

Verify that all required types are properly defined:
- `CreateTournamentRequestDTO` ✓
- `CreateTournamentPlayerDTO` ✓
- `CreateTournamentScheduleDTO` ✓
- `CreateTournamentMatchDTO` ✓
- `CreateTournamentMatchPlayerDTO` ✓
- `TournamentCreatedResponseDTO` ✓

All types are already defined in the provided `types.ts` file.

### Step 6: Update Database Types (if needed)

**File**: `src/db/database.types.ts`

Ensure database types are up-to-date with the schema. If the schema has changed since types were generated, regenerate types using:

```bash
npx supabase gen types typescript --local > src/db/database.types.ts
```

### Step 7: Test Authentication Middleware

**File**: `src/middleware/index.ts`

Verify that the middleware properly initializes the Supabase client and attaches it to `locals.supabase`. The endpoint depends on this middleware.

### Step 8: Manual Testing

Create test cases for:

1. **Successful Creation (Singles)**:
   - 4 players, 2 courts, valid schedule
   - Expected: 201 Created

2. **Successful Creation (Doubles)**:
   - 4 players, 1 court, valid schedule with teams
   - Expected: 201 Created

3. **Authentication Failure**:
   - No auth token
   - Expected: 401 Unauthorized

4. **Invalid JSON**:
   - Malformed JSON payload
   - Expected: 400 Bad Request

5. **Missing Required Fields**:
   - Omit 'name' field
   - Expected: 400 Bad Request

6. **Invalid Player Count (Singles)**:
   - 3 players (odd number)
   - Expected: 422 Unprocessable Entity

7. **Invalid Player Count (Doubles)**:
   - 5 players (not divisible by 4)
   - Expected: 422 Unprocessable Entity

8. **Invalid Court Number**:
   - Match assigned to court 5 when only 2 courts available
   - Expected: 422 Unprocessable Entity

9. **Invalid Player Reference**:
   - Match references "Player 99" not in players list
   - Expected: 422 Unprocessable Entity

10. **Team Assignment Errors (Singles)**:
    - Singles match with team = 1
    - Expected: 422 Unprocessable Entity

11. **Team Assignment Errors (Doubles)**:
    - Doubles match with 3 players on team 1, 1 on team 2
    - Expected: 422 Unprocessable Entity

### Step 9: Integration Testing

Test the complete flow:
1. Generate schedule via `POST /api/schedules/generate` (when implemented)
2. Create tournament with generated schedule via `POST /api/tournaments`
3. Retrieve tournament details via `GET /api/tournaments/{id}` (when implemented)
4. Verify all data is correctly persisted

### Step 10: Performance Testing

1. Test with large tournaments (50+ players, 200+ matches)
2. Measure response time
3. Test concurrent tournament creation (5+ simultaneous requests)
4. Monitor database connection pool
5. Verify transaction commits successfully

### Step 11: Documentation

1. Update API documentation with actual examples
2. Document error codes and their meanings
3. Add JSDoc comments to all functions
4. Create developer guide for extending functionality

### Step 12: Deployment Checklist

Before deploying to production:

- [ ] All Zod schemas defined and tested
- [ ] Business validation functions implemented
- [ ] Service layer tested with various inputs
- [ ] API endpoint handles all error cases
- [ ] Database indexes are in place
- [ ] RLS policies are enabled and tested
- [ ] Authentication middleware is functional
- [ ] Manual test cases pass
- [ ] Integration tests pass
- [ ] Performance tests meet targets
- [ ] Error logging is configured
- [ ] API documentation is updated
- [ ] Code reviewed by team
- [ ] Security review completed

---

## Summary

This implementation plan provides comprehensive guidance for implementing the `POST /api/tournaments` endpoint. The endpoint creates a complete tournament with players and schedule in a single atomic operation, ensuring data integrity through proper validation, error handling, and transaction management.

**Key Implementation Priorities:**
1. Robust validation at multiple levels (schema, business rules, database constraints)
2. Atomic transaction handling to prevent partial data insertion
3. Comprehensive error handling with appropriate status codes
4. Performance optimization through batch operations
5. Security through authentication, authorization, and input sanitization
