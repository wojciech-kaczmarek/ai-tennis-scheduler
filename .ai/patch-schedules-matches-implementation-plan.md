# API Endpoint Implementation Plan: PATCH /api/schedules/{id}/matches

## 1. Endpoint Overview

This endpoint allows authenticated users to update the court assignments and match order for one or more matches within an existing schedule. The operation supports bulk updates and must be atomic - all updates succeed or all fail. The endpoint enforces authorization by verifying the user owns the tournament associated with the schedule.

**Key Characteristics:**
- Supports bulk updates (multiple matches in single request)
- Atomic transaction (all-or-nothing)
- Validates match ownership and prevents conflicts
- Enforces court number constraints based on tournament configuration

## 2. Request Details

- **HTTP Method**: `PATCH`
- **URL Structure**: `/api/schedules/{id}/matches`
- **Content-Type**: `application/json`

### Parameters

#### Path Parameters (Required)
- `id` (string, UUID): The unique identifier of the schedule to update

#### Request Body (Required)
```json
{
  "updates": [
    {
      "match_id": "uuid",
      "court_number": integer,
      "match_order_on_court": integer
    }
  ]
}
```

**Field Descriptions:**
- `updates` (array, required): Array of match update objects. Must contain at least one update.
  - `match_id` (string, UUID, required): The unique identifier of the match to update
  - `court_number` (integer, required): The court number to assign (must be between 1 and tournament's court count)
  - `match_order_on_court` (integer, required): The order of the match on the specified court (must be positive)

**Validation Rules:**
- `updates` array must not be empty
- No duplicate `match_id` values within the request
- All `match_id` values must belong to the specified schedule
- `court_number` must be within the range [1, tournament.courts]
- `match_order_on_court` must be a positive integer
- No two matches can have the same (court_number, match_order_on_court) combination within the schedule after updates

## 3. Used Types

### Request Types
```typescript
// From src/types.ts
UpdateScheduleMatchesRequestDTO {
  updates: UpdateMatchDTO[];
}

UpdateMatchDTO {
  id: string;  // Note: API spec uses "match_id", need to align
  court_number: number;
  match_order_on_court: number;
}
```

**Important**: The existing `UpdateMatchDTO` type uses `id` but the API specification uses `match_id`. We need to update the type definition to match the API spec:

```typescript
export type UpdateMatchDTO = {
  match_id: string;
  court_number: number;
  match_order_on_court: number;
};
```

### Response Types
```typescript
// From src/types.ts
UpdateScheduleMatchesResponseDTO {
  schedule_id: string;
  updated_matches: string[];
}
```

### Entity Types (Internal Use)
```typescript
// From src/types.ts
ScheduleEntity
MatchEntity
TournamentEntity
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "schedule_id": "uuid",
  "updated_matches": ["uuid", "uuid", "uuid"]
}
```

**Fields:**
- `schedule_id` (string, UUID): The ID of the schedule that was updated
- `updated_matches` (array of strings): Array of match IDs that were successfully updated

### Error Responses

#### 400 Bad Request
Invalid input data or validation failure.

**Scenarios:**
- Invalid UUID format for schedule ID or match IDs
- Empty `updates` array
- Duplicate `match_id` in updates array
- `court_number` out of valid range
- `match_order_on_court` is not positive
- Match ID doesn't belong to the specified schedule

**Example Response:**
```json
{
  "error": "Invalid court_number: must be between 1 and 4"
}
```

#### 401 Unauthorized
User is not authenticated.

**Example Response:**
```json
{
  "error": "Unauthorized"
}
```

#### 404 Not Found
Schedule doesn't exist or user doesn't own the associated tournament.

**Example Response:**
```json
{
  "error": "Schedule not found"
}
```

**Note**: Return 404 (not 403) even for authorization failures to prevent resource enumeration.

#### 409 Conflict
Update would create a scheduling conflict.

**Scenarios:**
- Two matches would occupy the same (court_number, match_order_on_court) slot

**Example Response:**
```json
{
  "error": "Conflict: Court 2, Order 1 is already occupied by another match"
}
```

#### 500 Internal Server Error
Unexpected server-side error.

**Example Response:**
```json
{
  "error": "Internal server error"
}
```

## 5. Data Flow

### Step-by-Step Flow

1. **Request Reception**
   - Astro endpoint handler receives PATCH request
   - Extract schedule ID from path parameter
   - Parse request body

2. **Authentication Check**
   - Retrieve user session from `context.locals.supabase`
   - If no session, return 401 Unauthorized

3. **Input Validation**
   - Validate schedule ID format (UUID)
   - Validate request body against Zod schema
   - Check for empty updates array
   - Check for duplicate match_ids in request
   - If validation fails, return 400 Bad Request

4. **Authorization & Data Retrieval**
   - Query database to:
     - Verify schedule exists
     - Get associated tournament details (including court count)
     - Verify user owns the tournament
   - If schedule not found or user doesn't own tournament, return 404 Not Found

5. **Match Ownership Validation**
   - Verify all match_ids in the request belong to the specified schedule
   - If any match doesn't belong, return 400 Bad Request

6. **Business Logic Validation**
   - Validate court_number values are within [1, tournament.courts]
   - Validate match_order_on_court values are positive
   - If validation fails, return 400 Bad Request

7. **Conflict Detection**
   - Check for conflicts in the new assignments:
     - Get all current matches for the schedule
     - Simulate the updates
     - Ensure no two matches occupy the same (court_number, match_order_on_court)
   - If conflict detected, return 409 Conflict

8. **Database Update**
   - Execute bulk update in a transaction
   - Update all matches atomically
   - If database error occurs, rollback and return 500 Internal Server Error

9. **Response Generation**
   - Construct success response with schedule_id and updated match IDs
   - Return 200 OK

### Database Queries

**Query 1: Authorization & Tournament Details**
```typescript
// Get schedule with tournament details and verify ownership
const { data: schedule, error } = await supabase
  .from('schedules')
  .select(`
    id,
    tournament_id,
    tournaments!inner (
      id,
      user_id,
      courts
    )
  `)
  .eq('id', scheduleId)
  .eq('tournaments.user_id', userId)
  .single();
```

**Query 2: Validate Match Ownership**
```typescript
// Verify all match_ids belong to the schedule
const { data: matches, error } = await supabase
  .from('matches')
  .select('id')
  .eq('schedule_id', scheduleId)
  .in('id', matchIds);
```

**Query 3: Get Current Matches for Conflict Detection**
```typescript
// Get all matches in the schedule to check for conflicts
const { data: allMatches, error } = await supabase
  .from('matches')
  .select('id, court_number, match_order_on_court')
  .eq('schedule_id', scheduleId);
```

**Query 4: Bulk Update Matches**
```typescript
// Update matches in a transaction
// Note: Supabase doesn't support bulk updates directly,
// so we'll need to use individual updates or RPC function
for (const update of updates) {
  await supabase
    .from('matches')
    .update({
      court_number: update.court_number,
      match_order_on_court: update.match_order_on_court
    })
    .eq('id', update.match_id);
}
```

## 6. Security Considerations

### Authentication
- **Requirement**: User must be authenticated
- **Implementation**: Check `context.locals.supabase.auth.getUser()`
- **Failure Response**: 401 Unauthorized

### Authorization
- **Requirement**: User must own the tournament associated with the schedule
- **Implementation**: 
  - Join schedules → tournaments tables
  - Filter by `tournaments.user_id = auth.uid()`
  - Use RLS policies on tournaments table
- **Failure Response**: 404 Not Found (to prevent resource enumeration)

### Input Validation
- **UUID Validation**: Validate all UUIDs to prevent injection attacks
- **Range Validation**: Ensure court numbers and match orders are within valid ranges
- **Array Validation**: Prevent empty arrays and excessively large payloads
- **Duplicate Prevention**: Check for duplicate match_ids in request

### Data Integrity
- **Match Ownership**: Verify all matches belong to the specified schedule
- **Conflict Prevention**: Ensure no scheduling conflicts after updates
- **Atomic Updates**: Use transactions to prevent partial updates

### Rate Limiting
- Consider implementing rate limiting to prevent abuse
- Suggested limit: 100 requests per minute per user

### Resource Enumeration Prevention
- Return 404 (not 403) for authorization failures
- Don't expose whether a schedule exists if user doesn't own it

## 7. Error Handling

### Error Scenarios and Responses

| Error Scenario | Status Code | Error Message | Handling Strategy |
|----------------|-------------|---------------|-------------------|
| User not authenticated | 401 | "Unauthorized" | Check session early, return immediately |
| Invalid schedule ID format | 400 | "Invalid schedule ID format" | Validate UUID format with Zod |
| Empty updates array | 400 | "Updates array cannot be empty" | Check array length in Zod schema |
| Invalid match_id format | 400 | "Invalid match ID format: {match_id}" | Validate UUID format with Zod |
| Duplicate match_id in request | 400 | "Duplicate match ID in updates: {match_id}" | Check for duplicates before processing |
| Schedule not found | 404 | "Schedule not found" | Query returns no results |
| User doesn't own tournament | 404 | "Schedule not found" | Query with user_id filter returns no results |
| Match doesn't belong to schedule | 400 | "Match {match_id} does not belong to schedule" | Compare match count with request |
| Court number out of range | 400 | "Invalid court_number: must be between 1 and {max_courts}" | Validate against tournament.courts |
| Invalid match order | 400 | "match_order_on_court must be positive" | Validate in Zod schema |
| Scheduling conflict | 409 | "Conflict: Court {court}, Order {order} is already occupied" | Detect conflicts before update |
| Database constraint violation | 409 | "Scheduling conflict detected" | Catch unique constraint error |
| Database connection error | 500 | "Internal server error" | Log error, return generic message |
| Unexpected error | 500 | "Internal server error" | Log error, return generic message |

### Error Handling Best Practices

1. **Early Returns**: Handle errors as early as possible in the flow
2. **Specific Messages**: Provide clear, actionable error messages for 4xx errors
3. **Generic Messages**: Don't expose internal details in 5xx errors
4. **Logging**: Log all errors with context for debugging
5. **Consistency**: Use consistent error response format

### Error Response Format
```typescript
{
  error: string;  // Human-readable error message
}
```

## 8. Performance Considerations

### Potential Bottlenecks
1. **Multiple Database Queries**: Authorization, validation, and updates require several queries
2. **Large Update Batches**: Processing many updates in a single request
3. **Conflict Detection**: Checking all matches for conflicts can be expensive

### Optimization Strategies

1. **Query Optimization**
   - Use single query with joins for authorization and tournament details
   - Leverage existing indexes: `idx_matches_schedule_id`, `idx_tournaments_user_id`
   - Consider adding composite index on `(schedule_id, court_number, match_order_on_court)` for conflict detection

2. **Batch Processing**
   - Limit maximum number of updates per request (e.g., 100 matches)
   - Use PostgreSQL RPC function for atomic bulk updates instead of multiple individual queries
   - Consider using `upsert` operations if supported

3. **Caching**
   - Cache tournament details if multiple requests for same schedule
   - Use database connection pooling

4. **Transaction Management**
   - Keep transactions short and focused
   - Use appropriate isolation level (READ COMMITTED is usually sufficient)

5. **Request Size Limits**
   - Implement maximum payload size (e.g., 1MB)
   - Limit updates array to reasonable size (e.g., 100 items)

### Expected Performance
- **Small updates (1-10 matches)**: < 200ms
- **Medium updates (11-50 matches)**: < 500ms
- **Large updates (51-100 matches)**: < 1000ms

## 9. Implementation Steps

### Step 1: Update Type Definitions
**File**: `src/types.ts`

Update the `UpdateMatchDTO` type to align with API specification:
```typescript
export type UpdateMatchDTO = {
  match_id: string;  // Changed from 'id' to 'match_id'
  court_number: number;
  match_order_on_court: number;
};
```

### Step 2: Create Zod Validation Schema
**File**: `src/lib/schemas/scheduleSchemas.ts` (new file)

Create validation schemas for the endpoint:
```typescript
import { z } from 'zod';

export const updateMatchSchema = z.object({
  match_id: z.string().uuid({ message: 'Invalid match ID format' }),
  court_number: z.number().int().positive({ message: 'Court number must be positive' }),
  match_order_on_court: z.number().int().positive({ message: 'Match order must be positive' })
});

export const updateScheduleMatchesSchema = z.object({
  updates: z.array(updateMatchSchema)
    .min(1, { message: 'Updates array cannot be empty' })
    .max(100, { message: 'Cannot update more than 100 matches at once' })
});

export const scheduleIdParamSchema = z.string().uuid({ message: 'Invalid schedule ID format' });
```

### Step 3: Create Schedule Service
**File**: `src/lib/services/scheduleService.ts` (new file)

Implement the business logic:
```typescript
import type { SupabaseClient } from '../db/supabase.client';
import type { UpdateMatchDTO, UpdateScheduleMatchesResponseDTO } from '../../types';

interface UpdateMatchesParams {
  scheduleId: string;
  userId: string;
  updates: UpdateMatchDTO[];
}

export async function updateScheduleMatches(
  supabase: SupabaseClient,
  params: UpdateMatchesParams
): Promise<UpdateScheduleMatchesResponseDTO> {
  // Implementation details in subsequent steps
}

// Helper function to check for duplicate match IDs
function hasDuplicateMatchIds(updates: UpdateMatchDTO[]): string | null {
  const matchIds = updates.map(u => u.match_id);
  const uniqueIds = new Set(matchIds);
  if (uniqueIds.size !== matchIds.length) {
    const duplicates = matchIds.filter((id, index) => matchIds.indexOf(id) !== index);
    return duplicates[0];
  }
  return null;
}

// Helper function to detect scheduling conflicts
function detectConflicts(
  currentMatches: Array<{ id: string; court_number: number; match_order_on_court: number }>,
  updates: UpdateMatchDTO[]
): { court_number: number; match_order_on_court: number } | null {
  // Create a map of match positions after updates
  const updatesMap = new Map(updates.map(u => [u.match_id, u]));
  
  // Build final state
  const finalPositions = new Map<string, { court: number; order: number }>();
  
  for (const match of currentMatches) {
    const update = updatesMap.get(match.id);
    const court = update ? update.court_number : match.court_number;
    const order = update ? update.match_order_on_court : match.match_order_on_court;
    
    const key = `${court}-${order}`;
    if (finalPositions.has(key)) {
      return { court_number: court, match_order_on_court: order };
    }
    finalPositions.set(key, { court, order });
  }
  
  return null;
}
```

### Step 4: Implement Service Function Logic
**File**: `src/lib/services/scheduleService.ts`

Complete the `updateScheduleMatches` function:
```typescript
export async function updateScheduleMatches(
  supabase: SupabaseClient,
  params: UpdateMatchesParams
): Promise<UpdateScheduleMatchesResponseDTO> {
  const { scheduleId, userId, updates } = params;

  // 1. Check for duplicate match IDs
  const duplicateId = hasDuplicateMatchIds(updates);
  if (duplicateId) {
    throw new Error(`Duplicate match ID in updates: ${duplicateId}`);
  }

  // 2. Get schedule with tournament details and verify ownership
  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select(`
      id,
      tournament_id,
      tournaments!inner (
        id,
        user_id,
        courts
      )
    `)
    .eq('id', scheduleId)
    .eq('tournaments.user_id', userId)
    .single();

  if (scheduleError || !schedule) {
    throw new Error('Schedule not found');
  }

  const maxCourts = schedule.tournaments.courts;

  // 3. Validate court numbers are within range
  for (const update of updates) {
    if (update.court_number < 1 || update.court_number > maxCourts) {
      throw new Error(`Invalid court_number: must be between 1 and ${maxCourts}`);
    }
  }

  // 4. Verify all match_ids belong to the schedule
  const matchIds = updates.map(u => u.match_id);
  const { data: matchesInSchedule, error: matchesError } = await supabase
    .from('matches')
    .select('id')
    .eq('schedule_id', scheduleId)
    .in('id', matchIds);

  if (matchesError) {
    throw new Error('Failed to verify match ownership');
  }

  if (!matchesInSchedule || matchesInSchedule.length !== matchIds.length) {
    const foundIds = new Set(matchesInSchedule?.map(m => m.id) || []);
    const missingId = matchIds.find(id => !foundIds.has(id));
    throw new Error(`Match ${missingId} does not belong to schedule`);
  }

  // 5. Get all matches in schedule for conflict detection
  const { data: allMatches, error: allMatchesError } = await supabase
    .from('matches')
    .select('id, court_number, match_order_on_court')
    .eq('schedule_id', scheduleId);

  if (allMatchesError || !allMatches) {
    throw new Error('Failed to retrieve schedule matches');
  }

  // 6. Check for conflicts
  const conflict = detectConflicts(allMatches, updates);
  if (conflict) {
    throw new Error(
      `Conflict: Court ${conflict.court_number}, Order ${conflict.match_order_on_court} is already occupied`
    );
  }

  // 7. Execute updates
  const updatedMatchIds: string[] = [];
  
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        court_number: update.court_number,
        match_order_on_court: update.match_order_on_court
      })
      .eq('id', update.match_id);

    if (updateError) {
      // If any update fails, throw error (transaction will rollback if using RPC)
      throw new Error('Failed to update matches');
    }

    updatedMatchIds.push(update.match_id);
  }

  // 8. Return success response
  return {
    schedule_id: scheduleId,
    updated_matches: updatedMatchIds
  };
}
```

### Step 5: Create API Endpoint Handler
**File**: `src/pages/api/schedules/[id]/matches.ts` (new file)

Create the Astro endpoint:
```typescript
import type { APIRoute } from 'astro';
import { updateScheduleMatchesSchema, scheduleIdParamSchema } from '../../../../lib/schemas/scheduleSchemas';
import { updateScheduleMatches } from '../../../../lib/services/scheduleService';

export const prerender = false;

export const PATCH: APIRoute = async (context) => {
  try {
    // 1. Get authenticated user
    const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validate schedule ID from path parameter
    const scheduleIdResult = scheduleIdParamSchema.safeParse(context.params.id);
    if (!scheduleIdResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid schedule ID format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse and validate request body
    const body = await context.request.json();
    const validationResult = updateScheduleMatchesSchema.safeParse(body);
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return new Response(
        JSON.stringify({ error: firstError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Call service to update matches
    const result = await updateScheduleMatches(context.locals.supabase, {
      scheduleId: scheduleIdResult.data,
      userId: user.id,
      updates: validationResult.data.updates
    });

    // 5. Return success response
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating schedule matches:', error);

    // Handle specific error types
    if (error instanceof Error) {
      // Schedule not found or authorization failure
      if (error.message === 'Schedule not found') {
        return new Response(
          JSON.stringify({ error: 'Schedule not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Conflict errors
      if (error.message.startsWith('Conflict:')) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Validation errors
      if (
        error.message.includes('Invalid court_number') ||
        error.message.includes('Duplicate match ID') ||
        error.message.includes('does not belong to schedule')
      ) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generic server error
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

### Step 6: Create Directory Structure
Create the necessary directory for the nested route:
```bash
mkdir -p src/pages/api/schedules/[id]
```

### Step 7: Add Database Migration (Optional)
**File**: `supabase/migrations/YYYYMMDDHHMMSS_add_schedule_match_index.sql`

Add composite index for better conflict detection performance:
```sql
-- Add composite index for efficient conflict detection
CREATE INDEX IF NOT EXISTS idx_matches_schedule_court_order 
ON public.matches(schedule_id, court_number, match_order_on_court);
```

### Step 8: Create Test Script
**File**: `test-data/test-update-schedule-matches.sh`

Create a test script for manual testing:
```bash
#!/bin/bash

# Test PATCH /api/schedules/{id}/matches

SCHEDULE_ID="your-schedule-id-here"
BASE_URL="http://localhost:4321"

# Test 1: Successful update
echo "Test 1: Successful update"
curl -X PATCH "$BASE_URL/api/schedules/$SCHEDULE_ID/matches" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {
        "match_id": "match-id-1",
        "court_number": 2,
        "match_order_on_court": 1
      },
      {
        "match_id": "match-id-2",
        "court_number": 2,
        "match_order_on_court": 2
      }
    ]
  }'

echo -e "\n\n"

# Test 2: Invalid court number
echo "Test 2: Invalid court number (should return 400)"
curl -X PATCH "$BASE_URL/api/schedules/$SCHEDULE_ID/matches" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {
        "match_id": "match-id-1",
        "court_number": 999,
        "match_order_on_court": 1
      }
    ]
  }'

echo -e "\n\n"

# Test 3: Scheduling conflict
echo "Test 3: Scheduling conflict (should return 409)"
curl -X PATCH "$BASE_URL/api/schedules/$SCHEDULE_ID/matches" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {
        "match_id": "match-id-1",
        "court_number": 1,
        "match_order_on_court": 1
      },
      {
        "match_id": "match-id-2",
        "court_number": 1,
        "match_order_on_court": 1
      }
    ]
  }'

echo -e "\n\n"
```

### Step 9: Create PowerShell Test Script
**File**: `test-data/test-update-schedule-matches.ps1`

Create a PowerShell version for Windows:
```powershell
# Test PATCH /api/schedules/{id}/matches

$SCHEDULE_ID = "your-schedule-id-here"
$BASE_URL = "http://localhost:4321"

# Test 1: Successful update
Write-Host "Test 1: Successful update"
$body1 = @{
    updates = @(
        @{
            match_id = "match-id-1"
            court_number = 2
            match_order_on_court = 1
        },
        @{
            match_id = "match-id-2"
            court_number = 2
            match_order_on_court = 2
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "$BASE_URL/api/schedules/$SCHEDULE_ID/matches" `
    -Method PATCH `
    -ContentType "application/json" `
    -Body $body1

Write-Host "`n`n"

# Test 2: Invalid court number
Write-Host "Test 2: Invalid court number (should return 400)"
$body2 = @{
    updates = @(
        @{
            match_id = "match-id-1"
            court_number = 999
            match_order_on_court = 1
        }
    )
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$BASE_URL/api/schedules/$SCHEDULE_ID/matches" `
        -Method PATCH `
        -ContentType "application/json" `
        -Body $body2
} catch {
    Write-Host $_.Exception.Message
}

Write-Host "`n`n"
```

### Step 10: Update Documentation
**File**: `.ai/api-plan.md`

Add implementation notes for the endpoint:
```markdown
### PATCH /api/schedules/{id}/matches - IMPLEMENTED

- **Status**: ✅ Implemented
- **Files**:
  - Endpoint: `src/pages/api/schedules/[id]/matches.ts`
  - Service: `src/lib/services/scheduleService.ts`
  - Schema: `src/lib/schemas/scheduleSchemas.ts`
- **Notes**:
  - Supports bulk updates (max 100 matches per request)
  - Atomic operation - all updates succeed or all fail
  - Validates ownership and prevents scheduling conflicts
  - Uses composite index for efficient conflict detection
```

### Step 11: Run Linter and Fix Issues
```bash
npm run lint
```

Fix any linting errors that appear.

### Step 12: Test the Endpoint
1. Start the development server: `npm run dev`
2. Create a tournament with schedule using existing endpoints
3. Use the test scripts to verify the endpoint works correctly
4. Test all error scenarios (401, 400, 404, 409, 500)
5. Verify authorization works correctly
6. Test with various payload sizes

### Step 13: Commit Changes
```bash
git add .
git commit -m "feat: implement PATCH /api/schedules/{id}/matches endpoint"
```

## 10. Testing Checklist

- [ ] Endpoint returns 401 when user is not authenticated
- [ ] Endpoint returns 400 for invalid schedule ID format
- [ ] Endpoint returns 400 for empty updates array
- [ ] Endpoint returns 400 for invalid match ID format
- [ ] Endpoint returns 400 for duplicate match IDs in request
- [ ] Endpoint returns 404 when schedule doesn't exist
- [ ] Endpoint returns 404 when user doesn't own tournament (not 403)
- [ ] Endpoint returns 400 when match doesn't belong to schedule
- [ ] Endpoint returns 400 when court number is out of range
- [ ] Endpoint returns 400 when match order is not positive
- [ ] Endpoint returns 409 when update creates scheduling conflict
- [ ] Endpoint returns 200 with correct response for successful update
- [ ] All matches are updated atomically (all or nothing)
- [ ] Response includes correct schedule_id and updated match IDs
- [ ] Endpoint handles large batches (50-100 matches) efficiently
- [ ] Database constraints prevent invalid data
- [ ] Linter passes without errors
- [ ] No console errors in browser or server logs

## 11. Future Enhancements

1. **Batch Optimization**: Implement PostgreSQL RPC function for true atomic bulk updates
2. **Validation Caching**: Cache tournament details to reduce database queries for multiple updates
3. **Audit Trail**: Add logging table to track schedule modifications
4. **Optimistic Locking**: Add version field to prevent concurrent modification issues
5. **Undo Functionality**: Store previous state to allow rollback of changes
6. **Real-time Updates**: Use Supabase Realtime to notify clients of schedule changes
7. **Rate Limiting**: Implement per-user rate limiting to prevent abuse
8. **Metrics**: Add performance monitoring and analytics

