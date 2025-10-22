# API Endpoint Implementation Plan: Generate Schedule Preview (POST /api/schedules/generate)

## 1. Endpoint Overview
This endpoint generates an optimized schedule preview based on user inputs for tournament scheduling. The generated schedule is non-persistent and is used to display a preview in the UI before finalizing and saving any actual tournament schedules.

## 2. Request Details
- **HTTP Method:** POST  
- **URL Structure:** `/api/schedules/generate`
- **Parameters:**
  - **Required (in Request Body):**
    - `type` (string): Indicates the tournament type; allowed values are "singles" or "doubles".
    - `courts` (number): The total number of available courts (max. 6).
    - `players` (array): An array of player objects (max. 24), each containing:
      - `name` (string or null): Player's name (optional).
      - `placeholder_name` (string): Unique identifier for players in the preview.
  - **Optional:** None

- **Request Body Structure Example:**
  ```json
  {
    "type": "singles",
    "courts": 3,
    "players": [
      {
        "name": "Alice",
        "placeholder_name": "Player 1"
      },
      {
        "name": null,
        "placeholder_name": "Player 2"
      }
    ]
  }
  ```

## 3. Used Types
- **Request DTO:** `GenerateScheduleRequestDTO`  
  - Derived from the type definitions in `src/types.ts` and validates the input payload.
- **Response DTO:** `GeneratedScheduleDTO`  
  - Contains a `matches` array, where each match object includes:
    - `court_number` (number)
    - `match_order_on_court` (number)
    - `players` array with each player having:
      - `placeholder_name` (string)
      - `team` (number or null)

- **Supporting Types:**
  - `GenerateScheduleMatchDTO`
  - `GenerateScheduleMatchPlayerDTO`

## 4. Data Flow
1. **Request Reception:** The endpoint receives a POST request at `/api/schedules/generate` with a JSON payload.
2. **Input Validation:**  
   - Parse and validate payload using a Zod schema (or similar) ensuring:
     - `type` is exactly "singles" or "doubles".
     - `courts` is a positive integer.
     - `players` is a non-empty array with properly structured objects.
3. **Service Layer Processing:**
   - Forward the validated data to a schedule generation service (e.g., `scheduleService`).
   - The service computes an optimized schedule based on the number of courts and players.
   - For doubles, assign teams appropriately; for singles, team value remains null.
4. **Response Formation:**  
   - Return the generated schedule encapsulated within a `GeneratedScheduleDTO` structure.
   - Ensure the response status is `200 OK` upon successful execution.

## 5. Security Considerations
- **Authentication & Authorization:**  
  - Ensure that the endpoint is protected using Supabase's authentication mechanisms.
  - Verify that only authenticated users can access this endpoint.
- **Input Sanitization & Validation:**  
  - Apply strict validation using Zod schemas to prevent injection and invalid data.
- **Rate Limiting:**  
  - Implement rate limiting to mitigate potential abuse.
- **Data Exposure:**  
  - Since the schedule is non-persistent, ensure no sensitive data is unnecessarily exposed in the preview.
- **Error Logging:**  
  - Log server-side errors with sufficient context for debugging without exposing sensitive information to the client.

## 6. Error Handling
- **400 Bad Request:**  
  - Triggered when required fields are missing or format is invalid.
- **422 Unprocessable Entity:**  
  - Returned if the payload passes schema but fails business rules (e.g., invalid tournament type or insufficient players for the chosen type).
- **500 Internal Server Error:**  
  - For any unexpected runtime errors during schedule generation.
- **Logging:**  
  - All errors should be logged using the standard error logging mechanism, including request ID and error details for troubleshooting.

## 7. Performance Considerations
- **In-Memory Computation:**  
  - Since schedule generation is non-persistent and computed in-memory, ensure that the algorithm is optimized for handling a potentially large number of players and courts.
- **Scalability:**  
  - The design should accommodate asynchronous processing if schedule complexity increases.
- **Caching:**  
  - Consider short-lived caching if repeated similar requests occur during a user session.

## 8. Implementation Steps
1. **Define Zod Schema:**  
   - Create a Zod schema for `GenerateScheduleRequestDTO` in `src/lib/schemas/scheduleSchemas.ts` to validate incoming payloads.
2. **Create the API Endpoint:**  
   - Implement the endpoint handler in `src/pages/api/schedules.ts`.
   - Parse and validate the request payload.
3. **Develop Schedule Generation Logic:**  
   - Extract logic into a dedicated service (e.g., `src/lib/services/scheduleService.ts`).
   - Implement scheduling logic ensuring correct match and team assignments based on the tournament type.
4. **Error Handling & Logging:**  
   - Integrate error handling within the endpoint, ensuring proper HTTP status codes and logging are returned.
5. **Response Construction:**  
   - Format the successful response using the `GeneratedScheduleDTO` structure.
6. **Testing:**  
   - Write unit tests for the schedule generation service.
   - Perform integration tests to verify the endpoint returns correct HTTP status codes and response structure.
7. **Documentation & Code Review:**  
   - Update API documentation to reflect the new endpoint.
   - Conduct code reviews and verify against implementation rules and best practices.
