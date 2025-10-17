# REST API Plan

## 1. Resources

- **Tournament**: Represents a complete tournament, including its settings, players, and schedule. Corresponds to the `public.tournaments` table and its related tables (`players`, `schedules`, `matches`).
- **Schedule**: A non-persistent resource used for generating and previewing a tournament schedule before it is saved.

## 2. Endpoints

### Tournament Endpoints

#### `GET /api/tournaments`

- **Description**: Retrieves a list of all tournaments created by the authenticated user.
- **Query Parameters**:
  - `page` (optional, integer, default: 1): For pagination.
  - `pageSize` (optional, integer, default: 10): For pagination.
  - `sortBy` (optional, string, default: 'created_at'): Field to sort by.
  - `order` (optional, string, default: 'desc'): Sort order ('asc' or 'desc').
- **Request Payload**: None.
- **Response Payload**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "string",
        "type": "string ('singles' or 'doubles')",
        "players_count": "integer",
        "courts": "integer",
        "created_at": "string (ISO 8601)"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalItems": 1,
      "totalPages": 1
    }
  }
  ```
- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized`

---

#### `POST /api/tournaments`

- **Description**: Creates a new tournament along with its players and the final, user-accepted schedule. This is the final step of the tournament creation wizard.
- **Query Parameters**: None.
- **Request Payload**:
  ```json
  {
    "name": "string",
    "type": "string ('singles' or 'doubles')",
    "courts": "integer",
    "players": [
      {
        "name": "string (nullable)",
        "placeholder_name": "string"
      }
    ],
    "schedule": {
      "matches": [
        {
          "court_number": "integer",
          "match_order_on_court": "integer",
          "players": [
            {
              "placeholder_name": "string",
              "team": "integer (1 or 2, nullable for singles)"
            }
          ]
        }
      ]
    }
  }
  ```
- **Response Payload**:
  ```json
  {
    "id": "uuid",
    "name": "string",
    "type": "string",
    "players_count": "integer",
    "courts": "integer",
    "created_at": "string (ISO 8601)"
  }
  ```
- **Success Codes**: `201 Created`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `422 Unprocessable Entity`

---

#### `GET /api/tournaments/{id}`

- **Description**: Retrieves the full details of a single tournament, including players and the complete match schedule.
- **Query Parameters**: None.
- **Request Payload**: None.
- **Response Payload**:
  ```json
  {
    "id": "uuid",
    "name": "string",
    "type": "string",
    "courts": "integer",
    "created_at": "string (ISO 8601)",
    "players": [
      {
        "id": "uuid",
        "name": "string (nullable)",
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
              "name": "string (nullable)",
              "placeholder_name": "string",
              "team": "integer (1 or 2, nullable for singles)"
            }
          ]
        }
      ]
    }
  }
  ```
- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized`, `404 Not Found`

---

#### `DELETE /api/tournaments/{id}`

- **Description**: Deletes a tournament and all its associated data (players, schedule, matches) via cascading deletes in the database.
- **Query Parameters**: None.
- **Request Payload**: None.
- **Response Payload**: None.
- **Success Codes**: `204 No Content`
- **Error Codes**: `401 Unauthorized`, `404 Not Found`

---

### Schedule Endpoints

#### `POST /api/schedules/generate`

- **Description**: Generates a new, optimized (but not persisted) schedule based on user inputs. This is used for the preview step in the UI.
- **Query Parameters**: None.
- **Request Payload**:
  ```json
  {
    "type": "string ('singles' or 'doubles')",
    "courts": "integer",
    "players": [
      {
        "name": "string (nullable)",
        "placeholder_name": "string"
      }
    ]
  }
  ```
- **Response Payload**:
  ```json
  {
    "matches": [
      {
        "court_number": "integer",
        "match_order_on_court": "integer",
        "players": [
          {
            "placeholder_name": "string",
            "team": "integer (1 or 2, nullable for singles)"
          }
        ]
      }
    ]
  }
  ```
- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request`, `422 Unprocessable Entity`

---

#### `PATCH /api/schedules/{id}/matches`

- **Description**: Updates the court number and match order for one or more matches within an existing, saved schedule.
- **Query Parameters**: None.
- **Request Payload**:
  ```json
  {
    "updates": [
      {
        "match_id": "uuid",
        "court_number": "integer",
        "match_order_on_court": "integer"
      }
    ]
  }
  ```
- **Response Payload**:
  ```json
  {
    "schedule_id": "uuid",
    "updated_matches": ["uuid", "uuid"]
  }
  ```
- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `409 Conflict`

## 3. Authentication and Authorization

- **Authentication**: The API will use JWT-based authentication provided by Supabase Auth. Clients must include a valid JWT in the `Authorization: Bearer <token>` header for all protected endpoints.
- **Authorization**: The API relies on PostgreSQL's Row-Level Security (RLS) policies configured in the database. All queries on the `tournaments` table are automatically filtered by the `user_id` of the authenticated user (`auth.uid()`). This ensures that users can only access, modify, or delete their own data. The API logic does not need to implement additional authorization checks for resource ownership.

## 4. Validation and Business Logic

### Validation Rules

- **Tournament Name**: Must be a non-empty string.
- **Tournament Type**: Must be either `'singles'` or `'doubles'`.
- **Courts**: Must be an integer between 1 and 6 (inclusive).
- **Players Count**: Must be an integer between 4 and 24 (inclusive).
- **Doubles Player Count**: For `doubles` tournaments, the number of players must be a multiple of 4.

### Business Logic Implementation

- **Schedule Generation**: The `POST /api/schedules/generate` endpoint encapsulates the complex logic for creating an optimized schedule. It will implement the priority rules defined in the PRD:
  1.  Minimize back-to-back matches for any single player.
  2.  Maximize court utilization.
- **Atomic Tournament Creation**: The `POST /api/tournaments` endpoint will be transactional. It will create the tournament, players, schedule, and all matches in a single database transaction. If any part of the process fails, the entire transaction will be rolled back to ensure data integrity.
- **Schedule Editing**: The `PATCH /api/schedules/{id}/matches` endpoint allows for bulk updates to a schedule's layout, ensuring that reordering matches in the UI is an efficient, single API call. The endpoint must validate that the updates do not create a scheduling conflict (i.e., two matches on the same court in the same order slot), returning a `409 Conflict` error if such a case arises.
