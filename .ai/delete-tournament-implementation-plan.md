# API Endpoint Implementation Plan: DELETE /api/tournaments/{id}

## 1. Endpoint Overview

This endpoint deletes a tournament and all its associated data (players, schedule, matches, match_players) from the database. The deletion is handled atomically through PostgreSQL's cascading delete mechanism, ensuring data integrity. The endpoint enforces user ownership through Row-Level Security (RLS) policies, preventing unauthorized access to tournaments owned by other users.

**Key Characteristics:**
- Idempotent operation (safe to retry)
- Atomic deletion via database cascading
- Authorization enforced at database level via RLS
- Returns 204 No Content on success (no response body)
- Returns 404 for both non-existent and unauthorized tournaments (prevents information leakage)

## 2. Request Details

### HTTP Method
`DELETE`

### URL Structure
```
DELETE /api/tournaments/{id}
```

### Path Parameters

#### Required Parameters
- **`id`** (string, UUID format)
  - The unique identifier of the tournament to delete
  - Must be a valid UUID v4 format
  - Example: `550e8400-e29b-41d4-a716-446655440000`

#### Optional Parameters
None

### Query Parameters
None

### Request Headers
- **`Content-Type`**: Not required (no request body)
- **Authentication**: Session cookie or Authorization header (handled by Supabase middleware)

### Request Body
None

## 3. Used Types

### Existing Types (from `src/types.ts`)
- **`TournamentEntity`**: Used internally for type safety when interacting with the database

### Schema Types (to be created in `src/lib/schemas/tournamentSchemas.ts`)
```typescript
// Path parameter validation schema
export const deleteTournamentParamsSchema = z.object({
  id: z.string().uuid("Invalid tournament ID format"),
});

export type DeleteTournamentParams = z.infer<typeof deleteTournamentParamsSchema>;
```

### Service Function Signature (to be added to `src/lib/services/tournamentService.ts`)
```typescript
/**
 * Deletes a tournament and all associated data
 * 
 * @param supabase - Supabase client instance with user context
 * @param tournamentId - UUID of the tournament to delete
 * @returns true if tournament was deleted, false if not found
 * @throws Error if database operation fails
 */
export async function deleteTournament(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<boolean>
```

## 4. Response Details

### Success Response

#### 204 No Content
- **Status Code**: `204`
- **Response Body**: Empty (no content)
- **Headers**: None required
- **Meaning**: Tournament was successfully deleted

### Error Responses

#### 400 Bad Request
- **Status Code**: `400`
- **Response Body**:
```json
{
  "error": "Bad Request",
  "message": "Invalid tournament ID format",
  "details": {
    "id": {
      "_errors": ["Invalid UUID format"]
    }
  }
}
```
- **When**: Path parameter is not a valid UUID

#### 401 Unauthorized
- **Status Code**: `401`
- **Response Body**:
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```
- **When**: No valid authentication session exists

#### 404 Not Found
- **Status Code**: `404`
- **Response Body**:
```json
{
  "error": "Not Found",
  "message": "Tournament not found"
}
```
- **When**: 
  - Tournament with given ID doesn't exist
  - Tournament exists but belongs to another user (don't reveal existence)

#### 500 Internal Server Error
- **Status Code**: `500`
- **Response Body**:
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred while deleting tournament"
}
```
- **When**: Unexpected database or server error

## 5. Data Flow

### Request Flow
```
1. Client sends DELETE request
   ↓
2. Astro middleware validates session
   ↓
3. Route handler extracts tournament ID from path
   ↓
4. Zod validates UUID format
   ↓
5. Get authenticated user from context.locals.supabase
   ↓
6. Call deleteTournament service function
   ↓
7. Service executes DELETE query with RLS enforcement
   ↓
8. Database cascades delete to related tables:
   - schedules (via tournament_id FK)
   - matches (via schedule_id FK)
   - match_players (via match_id FK)
   - players (via tournament_id FK)
   ↓
9. Check affected rows count
   ↓
10. Return 204 (success) or 404 (not found)
```

### Database Cascade Chain
```
DELETE tournaments WHERE id = {id} AND user_id = {current_user}
  ↓ CASCADE
  ├─→ DELETE schedules WHERE tournament_id = {id}
  │     ↓ CASCADE
  │     └─→ DELETE matches WHERE schedule_id = {schedule_id}
  │           ↓ CASCADE
  │           └─→ DELETE match_players WHERE match_id = {match_id}
  │
  └─→ DELETE players WHERE tournament_id = {id}
```

### RLS Policy Enforcement
The `tournaments` table has RLS enabled with a DELETE policy:
```sql
CREATE POLICY "Allow users to delete their own tournaments"
ON public.tournaments FOR DELETE
USING (auth.uid() = user_id);
```

This ensures that even if the application layer has a bug, users can only delete their own tournaments.

## 6. Security Considerations

### Authentication
- **Requirement**: User must have a valid authenticated session
- **Implementation**: Check `context.locals.supabase.auth.getUser()`
- **Failure Response**: 401 Unauthorized if no valid session

### Authorization
- **Requirement**: User can only delete tournaments they own
- **Implementation**: 
  - RLS policy enforces `user_id = auth.uid()` at database level
  - Service layer doesn't need explicit ownership check
  - Return 404 (not 403) to prevent information leakage
- **Failure Response**: 404 Not Found if tournament doesn't exist or user doesn't own it

### Input Validation
- **UUID Format**: Validate path parameter is a valid UUID to prevent SQL injection
- **Implementation**: Use Zod schema with `.uuid()` validator
- **Failure Response**: 400 Bad Request for invalid format

### Information Disclosure Prevention
- **Strategy**: Return 404 for both non-existent and unauthorized tournaments
- **Rationale**: Prevents attackers from enumerating valid tournament IDs
- **Implementation**: Don't distinguish between "doesn't exist" and "not authorized"

### CSRF Protection
- **Requirement**: Protect against cross-site request forgery
- **Implementation**: Rely on Astro middleware and Supabase session validation
- **Note**: Modern browsers with SameSite cookies provide additional protection

### Rate Limiting (Future Enhancement)
- Consider implementing rate limiting to prevent abuse
- Suggestion: Max 10 deletions per minute per user

## 7. Error Handling

### Error Scenarios and Responses

| Scenario | Status Code | Response | Logging |
|----------|-------------|----------|---------|
| Invalid UUID format | 400 | Bad Request with validation details | No (expected user error) |
| No authentication session | 401 | Unauthorized message | No (expected user error) |
| Tournament doesn't exist | 404 | Not Found message | No (expected scenario) |
| Tournament owned by another user | 404 | Not Found message | No (security: don't reveal existence) |
| Database connection failure | 500 | Internal Server Error | Yes (critical error) |
| Unexpected database error | 500 | Internal Server Error | Yes (unexpected error) |
| Service layer exception | 500 | Internal Server Error | Yes (unexpected error) |

### Error Response Format
All error responses follow consistent JSON structure:
```typescript
{
  error: string;        // Error type/category
  message: string;      // Human-readable message
  details?: unknown;    // Optional validation details (400 errors only)
}
```

### Logging Strategy
- **400 errors**: Don't log (expected user input errors)
- **401 errors**: Don't log (expected authentication failures)
- **404 errors**: Don't log (expected scenario)
- **500 errors**: Always log with full error details using `console.error()`
- **Log format**: Include timestamp, user ID, tournament ID, and error stack trace

### Error Recovery
- **Transactional Safety**: Database cascading deletes are atomic
- **Idempotency**: Safe to retry - subsequent calls return 404 (already deleted)
- **No Partial State**: Either all related records are deleted or none are

## 8. Performance Considerations

### Database Performance
- **Cascading Deletes**: Efficient due to foreign key indexes
- **Expected Query Time**: < 100ms for typical tournament with schedule
- **Indexes Used**:
  - `tournaments.id` (primary key)
  - `tournaments.user_id` (for RLS policy)
  - Foreign key indexes on related tables

### Optimization Strategies
- **Single Query**: One DELETE statement handles all cascading
- **No N+1 Problem**: Database handles cascading internally
- **Connection Pooling**: Reuse Supabase client connections

### Potential Bottlenecks
- **Large Tournaments**: Tournaments with 100+ matches may take longer
  - Mitigation: Database cascading is still efficient
  - Consider: Add database-level timeout if needed
- **Concurrent Deletes**: Multiple users deleting simultaneously
  - Mitigation: PostgreSQL handles concurrent transactions well
  - No special handling needed

### Monitoring Recommendations
- Track deletion operation duration
- Monitor cascade delete performance for large tournaments
- Alert on 500 errors (unexpected failures)
- Track 404 rate (high rate might indicate enumeration attempts)

## 9. Implementation Steps

### Step 1: Create Zod Schema for Path Parameter Validation
**File**: `src/lib/schemas/tournamentSchemas.ts`

Add the following schema at the end of the file:

```typescript
// ============================================================================
// DELETE /api/tournaments/{id} - Delete Tournament Schema
// ============================================================================

/**
 * Path parameter schema for DELETE /api/tournaments/{id}
 * Validates tournament ID is a valid UUID
 */
export const deleteTournamentParamsSchema = z.object({
  id: z.string().uuid("Invalid tournament ID format"),
});

/**
 * Type inference for delete tournament path parameters
 */
export type DeleteTournamentParams = z.infer<typeof deleteTournamentParamsSchema>;
```

### Step 2: Create Service Function for Tournament Deletion
**File**: `src/lib/services/tournamentService.ts`

Add the following function at the end of the file:

```typescript
// ============================================================================
// DELETE /api/tournaments/{id} - Delete Tournament Function
// ============================================================================

/**
 * Deletes a tournament and all associated data via cascading delete
 * 
 * This function performs a single DELETE operation on the tournaments table.
 * PostgreSQL automatically cascades the deletion to related tables:
 * - schedules (via tournament_id FK)
 * - matches (via schedule_id FK)  
 * - match_players (via match_id FK)
 * - players (via tournament_id FK)
 * 
 * Row-Level Security (RLS) ensures users can only delete their own tournaments.
 * 
 * @param supabase - Supabase client instance with user context
 * @param tournamentId - UUID of the tournament to delete
 * @returns true if tournament was deleted, false if not found or unauthorized
 * @throws Error if database operation fails unexpectedly
 */
export async function deleteTournament(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<boolean> {
  const { data, error, count } = await supabase
    .from("tournaments")
    .delete({ count: "exact" })
    .eq("id", tournamentId)
    .select();

  if (error) {
    throw new Error(`Failed to delete tournament: ${error.message}`);
  }

  // count will be 0 if tournament doesn't exist or user doesn't own it (RLS)
  return (count ?? 0) > 0;
}
```

### Step 3: Implement DELETE Route Handler
**File**: `src/pages/api/tournaments/[id].ts` (new file)

Create a new file with the following content:

```typescript
import type { APIRoute } from "astro";
import { deleteTournamentParamsSchema } from "../../../lib/schemas/tournamentSchemas";
import { deleteTournament } from "../../../lib/services/tournamentService";

/**
 * DELETE /api/tournaments/{id}
 * Deletes a tournament and all associated data (players, schedule, matches)
 * 
 * Path Parameters:
 * - id (required): UUID of the tournament to delete
 * 
 * Returns:
 * - 204: Tournament deleted successfully (no content)
 * - 400: Invalid tournament ID format
 * - 401: User not authenticated
 * - 404: Tournament not found or user not authorized
 * - 500: Internal server error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Validate path parameter
    const validation = deleteTournamentParamsSchema.safeParse(params);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid tournament ID format",
          details: validation.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { id } = validation.data;

    // Step 2: Verify authentication
    const { data: { user }, error: authError } = await locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Delete tournament via service
    const deleted = await deleteTournament(locals.supabase, id);

    // Step 4: Return appropriate response
    if (!deleted) {
      // Tournament doesn't exist or user doesn't own it
      // Return 404 for both cases (don't reveal existence)
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Tournament not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Success - return 204 No Content
    return new Response(null, {
      status: 204,
    });

  } catch (error) {
    // Step 5: Handle unexpected errors
    console.error("Error deleting tournament:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while deleting tournament",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// Disable prerendering for this API route
export const prerender = false;
```

### Step 4: Update Imports in Service File
**File**: `src/lib/services/tournamentService.ts`

Ensure the imports at the top of the file include all necessary types. No changes needed if `SupabaseClient` is already imported.

### Step 5: Test the Implementation

#### Manual Testing with cURL

Create a test script: `curl-examples-tournaments-delete.sh`

```bash
#!/bin/bash

# Test DELETE /api/tournaments/{id}

BASE_URL="http://localhost:4321"

# Test 1: Delete existing tournament (replace with valid ID)
echo "Test 1: Delete existing tournament"
curl -X DELETE "$BASE_URL/api/tournaments/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -v

echo -e "\n\n"

# Test 2: Delete non-existent tournament
echo "Test 2: Delete non-existent tournament"
curl -X DELETE "$BASE_URL/api/tournaments/00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" \
  -v

echo -e "\n\n"

# Test 3: Invalid UUID format
echo "Test 3: Invalid UUID format"
curl -X DELETE "$BASE_URL/api/tournaments/invalid-id" \
  -H "Content-Type: application/json" \
  -v
```

Create PowerShell version: `curl-examples-tournaments-delete.ps1`

```powershell
# Test DELETE /api/tournaments/{id}

$baseUrl = "http://localhost:4321"

# Test 1: Delete existing tournament (replace with valid ID)
Write-Host "Test 1: Delete existing tournament"
curl.exe -X DELETE "$baseUrl/api/tournaments/550e8400-e29b-41d4-a716-446655440000" `
  -H "Content-Type: application/json" `
  -v

Write-Host "`n`n"

# Test 2: Delete non-existent tournament
Write-Host "Test 2: Delete non-existent tournament"
curl.exe -X DELETE "$baseUrl/api/tournaments/00000000-0000-0000-0000-000000000000" `
  -H "Content-Type: application/json" `
  -v

Write-Host "`n`n"

# Test 3: Invalid UUID format
Write-Host "Test 3: Invalid UUID format"
curl.exe -X DELETE "$baseUrl/api/tournaments/invalid-id" `
  -H "Content-Type: application/json" `
  -v
```

#### Expected Test Results

1. **Test 1** (Valid deletion):
   - Status: `204 No Content`
   - Body: Empty
   - Verify in database that tournament and all related records are deleted

2. **Test 2** (Non-existent tournament):
   - Status: `404 Not Found`
   - Body: `{"error": "Not Found", "message": "Tournament not found"}`

3. **Test 3** (Invalid UUID):
   - Status: `400 Bad Request`
   - Body: Contains validation error details

### Step 6: Verify Database Cascading

After implementing, verify cascading deletes work correctly:

1. Create a tournament with schedule using POST endpoint
2. Verify records exist in all tables:
   ```sql
   SELECT * FROM tournaments WHERE id = '{tournament_id}';
   SELECT * FROM players WHERE tournament_id = '{tournament_id}';
   SELECT * FROM schedules WHERE tournament_id = '{tournament_id}';
   SELECT * FROM matches WHERE schedule_id = '{schedule_id}';
   SELECT * FROM match_players WHERE match_id IN (SELECT id FROM matches WHERE schedule_id = '{schedule_id}');
   ```
3. Delete tournament using DELETE endpoint
4. Verify all records are deleted from all tables

### Step 7: Update API Documentation

Update the main API documentation file (if exists) to include the new DELETE endpoint with:
- Endpoint description
- Path parameters
- Response codes
- Example requests/responses

### Step 8: Consider Additional Enhancements (Optional)

Future improvements to consider:
- Add soft delete functionality (mark as deleted instead of removing)
- Add audit logging for deletion operations
- Implement rate limiting for delete operations
- Add confirmation token requirement for deletion
- Return deletion timestamp in response header
- Add bulk delete endpoint for multiple tournaments

## 10. Testing Checklist

### Unit Tests (Future)
- [ ] Service function returns true when tournament exists and is deleted
- [ ] Service function returns false when tournament doesn't exist
- [ ] Service function returns false when tournament belongs to another user
- [ ] Service function throws error on database failure

### Integration Tests (Future)
- [ ] DELETE returns 204 when tournament is successfully deleted
- [ ] DELETE returns 404 when tournament doesn't exist
- [ ] DELETE returns 404 when tournament belongs to another user
- [ ] DELETE returns 400 when ID format is invalid
- [ ] DELETE returns 401 when user is not authenticated
- [ ] Cascading delete removes all related records
- [ ] RLS policies prevent unauthorized deletion

### Manual Testing
- [ ] Can delete own tournament successfully
- [ ] Cannot delete another user's tournament
- [ ] Cannot delete with invalid UUID format
- [ ] Cannot delete without authentication
- [ ] All related records are removed after deletion
- [ ] Subsequent delete attempts return 404

## 11. Rollback Plan

If issues arise after deployment:

1. **Immediate**: Remove or comment out the DELETE handler in `src/pages/api/tournaments/[id].ts`
2. **Redeploy**: Push changes to remove the endpoint
3. **Investigate**: Review logs for error patterns
4. **Fix**: Address identified issues
5. **Retest**: Verify fixes in staging environment
6. **Redeploy**: Restore endpoint functionality

## 12. Success Criteria

The implementation is considered successful when:

- [ ] Users can delete their own tournaments
- [ ] Users cannot delete tournaments they don't own
- [ ] All related data is deleted via cascading
- [ ] Appropriate status codes are returned for all scenarios
- [ ] No sensitive information is leaked in error responses
- [ ] Error logging captures unexpected failures
- [ ] Manual testing passes all scenarios
- [ ] Performance is acceptable (< 100ms for typical tournaments)

