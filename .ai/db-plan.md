# Database Schema for AI Tennis Scheduler

## 1. Tables

### `public.tournaments`

Stores tournament information created by users.

| Column          | Type                     | Constraints                                 | Description                                    |
| --------------- | ------------------------ | ------------------------------------------- | ---------------------------------------------- |
| `id`            | `uuid`                   | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` | Unique identifier for the tournament.          |
| `user_id`       | `uuid`                   | `NOT NULL`, `REFERENCES auth.users(id)`     | Foreign key referencing the user who owns it.  |
| `name`          | `text`                   | `NOT NULL`                                  | Name of the tournament.                        |
| `type`          | `tournament_type` (ENUM) | `NOT NULL`                                  | Type of tournament ('singles' or 'doubles').   |
| `courts`        | `smallint`               | `NOT NULL`                                  | Number of available courts.                    |
| `players_count` | `smallint`               | `NOT NULL`                                  | Number of players declared for the tournament. |
| `created_at`    | `timestamptz`            | `NOT NULL`, `DEFAULT now()`                 | Timestamp of when the tournament was created.  |

### `public.players`

Stores player information for each tournament.

| Column             | Type   | Constraints                                                       | Description                             |
| ------------------ | ------ | ----------------------------------------------------------------- | --------------------------------------- |
| `id`               | `uuid` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`                       | Unique identifier for the player.       |
| `tournament_id`    | `uuid` | `NOT NULL`, `REFERENCES public.tournaments(id) ON DELETE CASCADE` | Foreign key referencing the tournament. |
| `name`             | `text` | `NULLABLE`                                                        | Player's name (optional).               |
| `placeholder_name` | `text` | `NOT NULL`                                                        | Placeholder name (e.g., "Player 1").    |

### `public.schedules`

Stores the generated schedule for a tournament.

| Column          | Type   | Constraints                                                                 | Description                             |
| --------------- | ------ | --------------------------------------------------------------------------- | --------------------------------------- |
| `id`            | `uuid` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`                                 | Unique identifier for the schedule.     |
| `tournament_id` | `uuid` | `NOT NULL`, `UNIQUE`, `REFERENCES public.tournaments(id) ON DELETE CASCADE` | Foreign key referencing the tournament. |

### `public.matches`

Stores individual matches within a schedule.

| Column                 | Type       | Constraints                                                     | Description                                  |
| ---------------------- | ---------- | --------------------------------------------------------------- | -------------------------------------------- |
| `id`                   | `uuid`     | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`                     | Unique identifier for the match.             |
| `schedule_id`          | `uuid`     | `NOT NULL`, `REFERENCES public.schedules(id) ON DELETE CASCADE` | Foreign key referencing the schedule.        |
| `court_number`         | `smallint` | `NOT NULL`                                                      | The court number assigned to the match.      |
| `match_order_on_court` | `smallint` | `NOT NULL`                                                      | The order of the match on a specific court.  |
|                        |            | `UNIQUE (schedule_id, court_number, match_order_on_court)`      | Ensures no two matches occupy the same slot. |

### `public.match_players`

A junction table linking players to matches.

| Column      | Type       | Constraints                                                   | Description                                               |
| ----------- | ---------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| `id`        | `uuid`     | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`                   | Unique identifier for the entry.                          |
| `match_id`  | `uuid`     | `NOT NULL`, `REFERENCES public.matches(id) ON DELETE CASCADE` | Foreign key referencing the match.                        |
| `player_id` | `uuid`     | `NOT NULL`, `REFERENCES public.players(id) ON DELETE CASCADE` | Foreign key referencing the player.                       |
| `team`      | `smallint` | `NULLABLE`                                                    | Team identifier for doubles (1 or 2). `NULL` for singles. |

### Custom Types

#### `tournament_type`

```sql
CREATE TYPE tournament_type AS ENUM ('singles', 'doubles');
```

## 2. Relationships

- **`auth.users` to `tournaments`**: One-to-Many. A user can have multiple tournaments, but each tournament belongs to one user.
- **`tournaments` to `players`**: One-to-Many. A tournament has multiple players, but each player record is associated with a single tournament.
- **`tournaments` to `schedules`**: One-to-One. Each tournament has exactly one active schedule.
- **`schedules` to `matches`**: One-to-Many. A schedule consists of multiple matches.
- **`matches` and `players`**: Many-to-Many, implemented through the `match_players` junction table. A match involves multiple players, and a player can participate in multiple matches.

## 3. Indexes

- **`tournaments(user_id)`**: To efficiently query for all tournaments belonging to a specific user.
  ```sql
  CREATE INDEX idx_tournaments_user_id ON public.tournaments(user_id);
  ```
- **`players(tournament_id)`**: To quickly retrieve all players for a given tournament.
  ```sql
  CREATE INDEX idx_players_tournament_id ON public.players(tournament_id);
  ```
- **`matches(schedule_id)`**: To quickly fetch all matches for a given schedule.
  ```sql
  CREATE INDEX idx_matches_schedule_id ON public.matches(schedule_id);
  ```
- **`match_players(match_id)`**: To find all players in a specific match.
  ```sql
  CREATE INDEX idx_match_players_match_id ON public.match_players(match_id);
  ```
- **`match_players(player_id)`**: To find all matches a specific player is in.
  ```sql
  CREATE INDEX idx_match_players_player_id ON public.match_players(player_id);
  ```

## 4. Row-Level Security (RLS) Policies

RLS will be enabled only on the `tournaments` table to ensure users can only access their own data. Access to related tables (`players`, `schedules`, etc.) is implicitly controlled by querying through the user's tournaments.

```sql
-- 1. Enable RLS on the tournaments table
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- 2. Create policy for SELECT
-- Users can only see their own tournaments.
CREATE POLICY "Allow users to view their own tournaments"
ON public.tournaments FOR SELECT
USING (auth.uid() = user_id);

-- 3. Create policy for INSERT
-- Users can only create tournaments for themselves.
CREATE POLICY "Allow users to create their own tournaments"
ON public.tournaments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Create policy for UPDATE
-- Users can only update their own tournaments.
CREATE POLICY "Allow users to update their own tournaments"
ON public.tournaments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Create policy for DELETE
-- Users can only delete their own tournaments.
CREATE POLICY "Allow users to delete their own tournaments"
ON public.tournaments FOR DELETE
USING (auth.uid() = user_id);
```

## 5. Design Notes

- **UUIDs as Primary Keys**: `uuid` is used for all primary keys to prevent enumeration attacks and to facilitate easier integration in a distributed system.
- **Cascading Deletes**: `ON DELETE CASCADE` is used on foreign keys referencing `tournaments`, `schedules`, and `matches`. This ensures that when a parent record (like a tournament) is deleted, all its associated child records (players, schedule, matches) are automatically removed, maintaining data integrity.
- **Business Logic in Application Layer**: Complex validation logic (e.g., player count limits, court limits, ensuring player count is divisible by four for doubles) is intentionally left to the application layer to maintain flexibility in the database schema.
- **Schedule Uniqueness**: The `UNIQUE` constraint on `schedules.tournament_id` enforces the business rule that a tournament can only have one active schedule.
- **Match Slot Uniqueness**: The `UNIQUE` constraint on `(schedule_id, court_number, match_order_on_court)` in the `matches` table prevents scheduling conflicts where two matches might be assigned to the same court in the same order.
