# API Endpoint Implementation Plan: GET /api/tournaments

## 1. Endpoint Overview
Retrieves a paginated, sorted list of tournaments owned by the authenticated user.

## 2. Request Details
- **HTTP Method:** GET  
- **URL:** `/api/tournaments`  
- **Query Parameters:**
  - **Optional:**
    - `page` (integer, default `1`) — page number (min: 1)
    - `page_size` (integer, default `10`, max: `100`) — items per page
    - `sort_by` (string, default `created_at`) — field to sort by (`name`, `created_at`, `players_count`, etc.)
    - `order` (string, default `desc`) — sort direction (`asc` or `desc`)
- **Request Body:** _None_

## 3. Used Types
- `PaginationDTO`  
- `TournamentListItemDTO`  
- `TournamentListResponseDTO`  

## 4. Response Details
- **Status 200 OK**
  ```json
  {
    "data": [ TournamentListItemDTO, ... ],
    "pagination": {
      "page": number,
      "page_size": number,
      "total_items": number,
      "total_pages": number
    }
  }
  ```
- **Error Statuses:**
  - 400 Bad Request — invalid query parameters
  - 401 Unauthorized — user not authenticated
  - 500 Internal Server Error — unexpected failures

## 5. Data Flow
1. **Authentication**  
   - Astro endpoint middleware reads `context.locals.supabase` to verify user.
   - Obtain `userId` from `session.user.id`.
2. **Validation**  
   - Parse and validate query params via a Zod schema with defaults.
3. **Service Call**  
   - Call `tournamentService.getTournamentsForUser(userId, { page, page_size, sort_by, order })`.
4. **Database Query**  
   - Use Supabase client:
     ```ts
     const { data, count } = await supabase
       .from("tournaments")
       .select(`id, name, type, players_count, courts, created_at`, { count: "exact" })
       .eq("user_id", userId)
       .order(sort_by, { ascending: order === "asc" })
       .range((page-1)*page_size, page*page_size - 1);
     ```
5. **Pagination Calculation**  
   - `total_items = count || 0`  
   - `total_pages = Math.ceil(total_items / page_size)`
6. **Response Mapping**  
   - Map raw rows to `TournamentListItemDTO` (fields match exactly)
   - Wrap in `TournamentListResponseDTO`

## 6. Security Considerations
- **Authentication**: enforce via `context.locals.supabase.auth.getSession()`
- **Authorization**: filter by `user_id` to prevent data leakage
- **Input Sanitization**: Zod ensures valid types and bounds
- **Rate Limiting**: (optional) throttle excessively large requests
- **SQL Injection**: Supabase query builder prevents injection

## 7. Error Handling
| Scenario                        | Status Code | Action                                                   |
|---------------------------------|-------------|----------------------------------------------------------|
| Invalid query parameters        | 400         | Return `400 Bad Request` with Zod error details          |
| Missing/invalid auth session    | 401         | Return `401 Unauthorized`                                |
| Database/network failure        | 500         | Log error; return `500 Internal Server Error`            |

- **Logging:**  
  - Use shared logger in `src/lib/utils.ts`  
  - Optionally insert into an `errors` table for audit

## 8. Performance
- **Indexes:** ensure `tournaments(user_id)`, `tournaments(created_at)` are indexed  
- **Count Query:** using Supabase’s `{ count: "exact" }` is efficient for moderate tables  
- **Limits:** enforce `page_size <= 100` to avoid large payloads

## 9. Implementation Steps
1. **Define Zod Schema** (`src/lib/schemas/tournamentSchemas.ts`)
   ```ts
   export const listTournamentsQuerySchema = z.object({
     page: z.coerce.number().int().min(1).default(1),
     page_size: z.coerce.number().int().min(1).max(100).default(10),
     sort_by: z.enum(["name","created_at","players_count","courts"]).default("created_at"),
     order: z.enum(["asc","desc"]).default("desc")
   });
   ```
2. **Create Service** (`src/lib/services/tournamentService.ts`)
   ```ts
   import { supabase } from "../supabaseClient";
   export async function getTournamentsForUser(
     userId: string,
     opts: { page: number; page_size: number; sort_by: string; order: string; }
   ) { /* db query + pagination */ }
   ```
3. **Implement API Route** (`src/pages/api/tournaments.ts`)
   ```ts
   import { listTournamentsQuerySchema } from "src/lib/schemas/tournamentSchemas";
   import { getTournamentsForUser } from "src/lib/services/tournamentService";
   export const GET = async ({ request, locals }) => {
     // auth check
     // parse + validate query
     // call service
     // return JSON with 200
   };
   export const prerender = false;
   ```
4. **Error Handling & Logging**
   - Wrap service call in try/catch
   - Log errors via shared logger
5. **Testing**
   - Unit tests for Zod schema and service logic
   - Integration test for the API route using a test Supabase instance
