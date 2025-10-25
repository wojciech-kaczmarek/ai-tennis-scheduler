# API Endpoint Implementation Plan: GET /api/tournaments/{id}

## 1. Endpoint Overview

This endpoint retrieves the complete details of a single tournament, including all associated players and the full match schedule. It serves as the primary data source for displaying tournament information in the UI.

**Key Characteristics:**
- Read-only operation (GET request)
- Returns deeply nested data structure (tournament → players, schedule → matches → match players)
- Protected by authentication and Row-Level Security (RLS)
- Returns 404 for both non-existent tournaments and unauthorized access attempts to prevent information disclosure

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
```
/api/tournaments/{id}
```

### Path Parameters

| Parameter | Type   | Required | Validation | Description |
|-----------|--------|----------|------------|-------------|
| `id`      | string | Yes      | Valid UUID | Unique identifier of the tournament |

### Query Parameters
None

### Request Headers
- `Authorization`: Bearer token or session cookie (handled by Supabase auth middleware)

### Request Body
None (GET request)

### Validation Schema (Zod)
```typescript
const paramsSchema = z.object({
  id: z.string().uuid({ message: "Invalid tournament ID format" })
});
```

## 3. Used Types

### Response Type
- **`TournamentDetailDTO`**: Main response structure containing complete tournament information

### Nested Types (from `src/types.ts`)
- **`PlayerDTO`**: Player information in the tournament's players array
- **`ScheduleDTO`**: Schedule information with all matches
- **`MatchDTO`**: Individual match details with court and order information
- **`MatchPlayerDTO`**: Player information within a match context, including team assignment

### Entity Types (internal use in service layer)
- **`TournamentEntity`**: Database entity from `tournaments` table
- **`PlayerEntity`**: Database entity from `players` table
- **`ScheduleEntity`**: Database entity from `schedules` table
- **`MatchEntity`**: Database entity from `matches` table
- **`MatchPlayerEntity`**: Database entity from `match_players` table

## 4. Response Details

### Success Response (200 OK)

**Structure:**
```json
{
  "id": "uuid",
  "name": "string",
  "type": "singles" | "doubles",
  "courts": "integer",
  "created_at": "string (ISO 8601)",
  "players": [
    {
      "id": "uuid",
      "name": "string | null",
      "placeholder_name": "string"
    }
  ],
  "schedule": {
    "id": "uuid",
    "matches": [
      {
        "id": "uuid",
        "court_number": "integer",
        "match_order_on_court": "integer",
        "players": [
          {
            "player_id": "uuid",
            "name": "string | null",
            "placeholder_name": "string",
            "team": "integer | null"
          }
        ]
      }
    ]
  }
}
```

**Example:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Summer Singles Championship",
  "type": "singles",
  "courts": 2,
  "created_at": "2025-10-20T10:30:00Z",
  "players": [
    {
      "id": "223e4567-e89b-12d3-a456-426614174001",
      "name": "John Doe",
      "placeholder_name": "Player 1"
    },
    {
      "id": "323e4567-e89b-12d3-a456-426614174002",
      "name": null,
      "placeholder_name": "Player 2"
    }
  ],
  "schedule": {
    "id": "423e4567-e89b-12d3-a456-426614174003",
    "matches": [
      {
        "id": "523e4567-e89b-12d3-a456-426614174004",
        "court_number": 1,
        "match_order_on_court": 1,
        "players": [
          {
            "player_id": "223e4567-e89b-12d3-a456-426614174001",
            "name": "John Doe",
            "placeholder_name": "Player 1",
            "team": null
          },
          {
            "player_id": "323e4567-e89b-12d3-a456-426614174002",
            "name": null,
            "placeholder_name": "Player 2",
            "team": null
          }
        ]
      }
    ]
  }
}
```

### Error Responses

| Status Code | Scenario | Response Body |
|-------------|----------|---------------|
| 400 Bad Request | Invalid UUID format | `{ "error": "Invalid tournament ID format" }` |
| 401 Unauthorized | Missing or invalid authentication | `{ "error": "Unauthorized" }` |
| 404 Not Found | Tournament doesn't exist or user doesn't own it | `{ "error": "Tournament not found" }` |
| 500 Internal Server Error | Database error or unexpected exception | `{ "error": "Internal server error" }` |

## 5. Data Flow

### Request Flow
```
1. Client Request
   ↓
2. Astro Middleware (authentication check)
   ↓
3. Route Handler (/api/tournaments/[id].ts)
   ├─ Extract id from params
   ├─ Validate UUID format (Zod)
   └─ Get supabase client from context.locals
   ↓
4. Service Layer (tournamentService.getTournamentById)
   ├─ Query tournaments table (RLS filters by user_id automatically)
   ├─ JOIN players table for tournament players
   ├─ JOIN schedules table
   ├─ JOIN matches table
   ├─ JOIN match_players table
   ├─ JOIN players table again for match player details
   └─ Transform entities to DTOs
   ↓
5. Route Handler
   ├─ Return 404 if null
   ├─ Return 200 with TournamentDetailDTO if found
   └─ Handle errors with appropriate status codes
   ↓
6. Client receives response
```

### Database Query Strategy

The service layer should execute an efficient query that:
1. Fetches the tournament with RLS filtering
2. Fetches all players associated with the tournament
3. Fetches the schedule (one-to-one relationship)
4. Fetches all matches for the schedule
5. Fetches all match_players relationships
6. Joins player details for each match participant

**Recommended Approach:**
- Use Supabase's query builder with `.select()` and nested joins
- Single query with nested relationships to minimize round trips
- Example query structure:
  ```typescript
  supabase
    .from('tournaments')
    .select(`
      id,
      name,
      type,
      courts,
      created_at,
      players:players(id, name, placeholder_name),
      schedule:schedules(
        id,
        matches:matches(
          id,
          court_number,
          match_order_on_court,
          match_players:match_players(
            player_id,
            team,
            player:players(id, name, placeholder_name)
          )
        )
      )
    `)
    .eq('id', tournamentId)
    .single()
  ```

### Data Transformation

Transform the database result to match `TournamentDetailDTO`:
- Map tournament fields directly
- Map players array with correct field selection
- Restructure schedule object to include only `id` and `matches`
- Transform match_players to flatten player information with team assignment
- Ensure all nullable fields are properly handled

## 6. Security Considerations

### Authentication
- **Requirement**: User must be authenticated
- **Implementation**: Astro middleware validates session using `context.locals.supabase.auth.getUser()`
- **Failure Response**: 401 Unauthorized if authentication fails

### Authorization
- **Requirement**: User can only access their own tournaments
- **Implementation**: 
  - RLS policy on `tournaments` table automatically filters by `auth.uid() = user_id`
  - Query returns null if tournament doesn't exist or user doesn't own it
  - Both cases return 404 to prevent information disclosure
- **Failure Response**: 404 Not Found (don't reveal whether tournament exists)

### Input Validation
- **UUID Validation**: Validate tournament ID is a valid UUID format before querying
- **SQL Injection Prevention**: Supabase SDK uses parameterized queries automatically
- **XSS Prevention**: Return JSON responses (no HTML rendering in API)

### Data Exposure Prevention
- **Exclude Sensitive Fields**: Don't return `user_id` in response
- **Consistent Error Messages**: Return 404 for both non-existent and unauthorized tournaments
- **No Stack Traces**: Never expose stack traces or internal error details to client

### Rate Limiting Considerations
- Consider implementing rate limiting at the API gateway or middleware level
- Prevent enumeration attacks by limiting requests per user per time window

## 7. Error Handling

### Error Scenarios and Handling

#### 1. Missing or Invalid Authentication (401)
**Scenario**: No auth token, expired token, or invalid session
**Detection**: Middleware checks `context.locals.supabase.auth.getUser()`
**Response**:
```json
{
  "error": "Unauthorized"
}
```
**Logging**: Log authentication failure with IP address and timestamp

#### 2. Invalid Tournament ID Format (400)
**Scenario**: Path parameter is not a valid UUID
**Detection**: Zod validation fails on `paramsSchema`
**Response**:
```json
{
  "error": "Invalid tournament ID format"
}
```
**Logging**: Log validation error with provided ID value

#### 3. Tournament Not Found or Unauthorized (404)
**Scenario**: Tournament doesn't exist OR user doesn't own the tournament
**Detection**: Service returns `null`
**Response**:
```json
{
  "error": "Tournament not found"
}
```
**Logging**: Log with user_id and tournament_id for audit trail
**Note**: Use same response for both cases to prevent information disclosure

#### 4. Database Connection Error (500)
**Scenario**: Cannot connect to Supabase or query fails
**Detection**: Supabase client throws error
**Response**:
```json
{
  "error": "Internal server error"
}
```
**Logging**: Log full error details including stack trace server-side

#### 5. Data Transformation Error (500)
**Scenario**: Unexpected data structure from database
**Detection**: Error during DTO mapping
**Response**:
```json
{
  "error": "Internal server error"
}
```
**Logging**: Log raw database response and transformation error

#### 6. Unexpected Errors (500)
**Scenario**: Any other unhandled exception
**Detection**: Try-catch block in route handler
**Response**:
```json
{
  "error": "Internal server error"
}
```
**Logging**: Log full error with context

### Error Logging Format
```typescript
console.error('Error in GET /api/tournaments/[id]:', {
  endpoint: 'GET /api/tournaments/[id]',
  tournament_id: id,
  user_id: userId,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
});
```

### Error Response Helper
Create a consistent error response helper:
```typescript
function errorResponse(status: number, message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
```

## 8. Performance Considerations

### Query Optimization
- **Single Query**: Use nested joins to fetch all data in one query
- **Index Usage**: Ensure indexes exist on:
  - `tournaments.id` (primary key)
  - `tournaments.user_id` (for RLS filtering)
  - `players.tournament_id` (foreign key)
  - `schedules.tournament_id` (foreign key)
  - `matches.schedule_id` (foreign key)
  - `match_players.match_id` (foreign key)
  - `match_players.player_id` (foreign key)

### Response Size
- **Typical Size**: Small to medium (< 100 KB for most tournaments)
- **Large Tournaments**: Could be larger with many matches
- **Mitigation**: Consider pagination for matches if needed in future

### Caching Strategy
- **Client-Side**: Set appropriate `Cache-Control` headers
- **Recommendation**: `Cache-Control: private, max-age=60` (cache for 1 minute)
- **Invalidation**: Cache should be invalidated when tournament is updated

### Database Connection Pooling
- Supabase handles connection pooling automatically
- No additional configuration needed

### Potential Bottlenecks
1. **Complex Joins**: Multiple table joins could be slow for large datasets
   - Mitigation: Proper indexing (already planned in db-plan.md)
2. **N+1 Queries**: Avoid fetching related data in loops
   - Mitigation: Use single query with nested joins
3. **Large Result Sets**: Tournaments with many matches
   - Mitigation: Monitor performance and consider pagination if needed

## 9. Implementation Steps

### Step 1: Create Zod Validation Schema
**File**: `src/lib/schemas/tournamentSchemas.ts`

Add the path parameter validation schema:
```typescript
export const getTournamentParamsSchema = z.object({
  id: z.string().uuid({ message: "Invalid tournament ID format" })
});
```

### Step 2: Implement Service Method
**File**: `src/lib/services/tournamentService.ts`

Implement `getTournamentById` method:
```typescript
export async function getTournamentById(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<TournamentDetailDTO | null> {
  // Query with nested joins
  // Transform database entities to DTOs
  // Return null if not found or RLS blocks access
}
```

**Key Implementation Details:**
- Use Supabase query builder with nested selects
- Handle the case where schedule might not exist (though it should per business rules)
- Transform match_players junction table data into MatchPlayerDTO format
- Ensure proper error handling for database errors
- Return null if tournament not found (RLS will filter unauthorized access)

### Step 3: Create API Route Handler
**File**: `src/pages/api/tournaments/[id].ts`

Create the route file with GET handler:
```typescript
export const prerender = false;

export async function GET(context: APIContext): Promise<Response> {
  // 1. Get supabase client from context.locals
  // 2. Validate authentication
  // 3. Extract and validate id parameter
  // 4. Call tournamentService.getTournamentById()
  // 5. Return appropriate response
}
```

### Step 4: Implement GET Handler Logic

**Pseudo-code:**
```typescript
1. Extract supabase client from context.locals.supabase
2. Check authentication:
   - Call supabase.auth.getUser()
   - If error or no user, return 401
3. Extract id from context.params
4. Validate id with getTournamentParamsSchema:
   - If validation fails, return 400
5. Call tournamentService.getTournamentById(supabase, id):
   - Wrap in try-catch
   - If returns null, return 404
   - If returns data, return 200 with TournamentDetailDTO
   - If throws error, log and return 500
```

### Step 5: Implement Error Handling

Add comprehensive error handling:
- Try-catch block around service call
- Specific error responses for each scenario
- Detailed server-side logging
- Generic client-facing error messages

### Step 6: Add Response Headers

Set appropriate headers:
```typescript
{
  'Content-Type': 'application/json',
  'Cache-Control': 'private, max-age=60'
}
```

### Step 7: Test the Endpoint

**Test Cases:**
1. **Valid Request**: Authenticated user requesting their own tournament
   - Expected: 200 with complete tournament data
2. **Invalid UUID**: Request with malformed tournament ID
   - Expected: 400 with validation error
3. **Unauthenticated**: Request without auth token
   - Expected: 401 Unauthorized
4. **Not Found**: Request for non-existent tournament ID
   - Expected: 404 Not Found
5. **Unauthorized**: Request for another user's tournament
   - Expected: 404 Not Found (same as not found)
6. **Database Error**: Simulate database connection failure
   - Expected: 500 Internal Server Error

### Step 8: Create Test Script

**File**: `curl-examples-tournaments-get.sh` (or `.ps1` for PowerShell)

Create curl examples for testing:
```bash
#!/bin/bash

# Get tournament by ID
curl -X GET "http://localhost:4321/api/tournaments/{tournament-id}" \
  -H "Authorization: Bearer {access-token}" \
  -H "Content-Type: application/json"
```

### Step 9: Update Documentation

Update API documentation with:
- Endpoint details
- Request/response examples
- Error codes and scenarios
- Authentication requirements

### Step 10: Code Review Checklist

Before considering implementation complete, verify:
- [ ] Zod schema validates UUID format correctly
- [ ] Service method uses single query with nested joins
- [ ] RLS policies are properly applied
- [ ] Authentication is checked in route handler
- [ ] All error scenarios are handled
- [ ] Error logging includes necessary context
- [ ] Response headers are set correctly
- [ ] DTOs match the specification exactly
- [ ] No sensitive data (user_id) is exposed
- [ ] Code follows project structure and coding practices
- [ ] Test script covers all scenarios
- [ ] Linter passes without errors

## 10. Additional Considerations

### Future Enhancements
- Add query parameter for selecting specific fields (sparse fieldsets)
- Implement ETag support for conditional requests
- Add compression for large responses
- Consider GraphQL for more flexible data fetching

### Monitoring
- Track response times for this endpoint
- Monitor error rates by status code
- Alert on high 500 error rates
- Track most frequently accessed tournaments

### Documentation
- Add OpenAPI/Swagger specification
- Include in API documentation
- Provide code examples in multiple languages
- Document rate limits if implemented

