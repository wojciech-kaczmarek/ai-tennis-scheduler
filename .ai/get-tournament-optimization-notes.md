# GET /api/tournaments/{id} - Optimization Notes

## Query Strategy Evolution

### Problem 1: Single Query with Nested JOINs (Initial Plan)

The initial implementation plan suggested a single query with nested JOINs:

```typescript
supabase
  .from('tournaments')
  .select(`
    *,
    players(*),
    schedules(
      *,
      matches(
        *,
        match_players(*, player:players(*))
      )
    )
  `)
```

**Issue**: Creates a **massive Cartesian product**:
- 1 tournament × N players × M matches × (M × P) match_players

**Example** (10 players, 50 matches):
- Result set: 1 × 10 × 50 × 150 = **75,000 rows** of duplicated data
- Network overhead: Massive data transfer with repeated data
- Memory overhead: Supabase must process and return all duplicated data

### Problem 2: Three Queries with Player JOIN (First Iteration)

Second approach attempted to reduce duplication:

1. Tournament + Players (1 × 10 = 10 rows)
2. Schedule (1 row)
3. Matches + Match Players with player JOIN (50 matches × 3 players avg = 150 rows)

**Issue**: Still has player data duplication in Query 3
- Each player's data (name, placeholder_name) repeated for every match they play in
- For a player in 10 matches, their data is sent 10 times
- Network overhead: Still significant for tournaments with many matches

### Final Solution: Three Optimized Queries (Current Implementation)

The optimized implementation uses **3 separate queries with zero duplication**:

1. **Query 1**: Tournament + Schedule
   ```typescript
   .from('tournaments')
   .select('id, name, type, courts, created_at, schedules(id)')
   .eq('id', tournamentId)
   .single()
   ```
   - Result size: **1 row**
   - No JOINs, just tournament data with schedule ID

2. **Query 2**: Players by tournament_id
   ```typescript
   .from('players')
   .select('id, name, placeholder_name')
   .eq('tournament_id', tournamentId)
   ```
   - Result size: **N rows** (10 rows for 10 players)
   - Each player fetched exactly once
   - No duplication

3. **Query 3**: Matches + Match Players (player_id only)
   ```typescript
   .from('matches')
   .select('id, court_number, match_order_on_court, match_players(player_id, team)')
   .eq('schedule_id', scheduleId)
   .order('court_number', { ascending: true })
   .order('match_order_on_court', { ascending: true })
   ```
   - Result size: **M rows** (50 rows for 50 matches)
   - Only player_id references, no player details
   - Player details mapped from Query 2 in application code

### Performance Comparison

| Metric | Single Query | 3 Queries (v1) | 3 Queries (v2 - Final) |
|--------|-------------|----------------|------------------------|
| **Network Rows** | ~75,000 | ~161 | **61** |
| **Data Duplication** | Very High | Medium | **None** |
| **Network Transfer** | Very Large | Medium | **Minimal** |
| **Database Load** | Very High | Medium | **Low** |
| **Scalability** | Poor (exponential) | Fair (linear with duplication) | **Excellent (pure linear)** |

**Example** (10 players, 50 matches):
- Single Query: 75,000 rows
- 3 Queries v1: 161 rows (10 + 1 + 150)
- **3 Queries v2: 61 rows (1 + 10 + 50)** ✅

### Benefits of Final Approach

1. **Zero Data Duplication**: Each piece of data fetched exactly once
2. **Pure Linear Growth**: Total rows = 1 + N players + M matches
3. **Minimal Network Transfer**: ~1,200x less data than single query approach
4. **Optimal Database Load**: Simple queries with single-table access or minimal JOINs
5. **Better Caching**: Smaller result sets are easier to cache
6. **Application-Side Mapping**: Player details mapped using a Map for O(1) lookup

### Implementation Details

**Player Mapping Strategy**:
```typescript
// Build player lookup map from Query 2
const playerMap = new Map<string, PlayerDTO>();
playersData.forEach(player => {
  playerMap.set(player.id, { id, name, placeholder_name });
});

// Map player details in Query 3 results
match.match_players.map(mp => {
  const player = playerMap.get(mp.player_id);
  return { player_id, ...player, team };
});
```

**Complexity**: O(N) for building map + O(M × P) for mapping = O(N + M×P)
- Very fast for typical tournament sizes
- No database overhead

### Trade-offs

**Pros**:
- ✅ Zero data duplication
- ✅ Minimal network transfer
- ✅ Optimal scalability
- ✅ Simple, fast queries
- ✅ Easy to cache
- ✅ Clear separation of concerns

**Cons**:
- ❌ 3 round trips to database instead of 1
- ❌ Application-side mapping required
- ❌ Slightly more complex code

**Verdict**: The benefits massively outweigh the costs:
- Database round trips are fast (same datacenter, indexed queries)
- Application-side mapping is trivial with Map (O(1) lookup)
- Network transfer reduction is enormous (1,200x improvement)
- Scales perfectly as tournament size increases

## Data Structure Verification

The implementation correctly maps to `TournamentDetailDTO`:

### MatchPlayerDTO Structure
```typescript
{
  player_id: string,      // From match_players.player_id
  id: string,             // From match_players.player.id
  name: string | null,    // From match_players.player.name
  placeholder_name: string, // From match_players.player.placeholder_name
  team: number | null     // From match_players.team
}
```

**Note**: Both `player_id` and `id` are included as per the DTO specification. While they contain the same value, having both fields provides flexibility for different use cases in the frontend.

### Match Ordering

Matches are explicitly ordered by:
1. `court_number` (ascending)
2. `match_order_on_court` (ascending)

This ensures consistent ordering in the response, making it easier for the frontend to display matches in the correct sequence.

## Testing

Comprehensive integration tests are provided in:
- `test-data/test-get-tournament.ps1` (PowerShell)
- `test-data/test-get-tournament.sh` (Bash)

These tests verify:
- ✅ Complete data structure for singles tournaments
- ✅ Complete data structure for doubles tournaments
- ✅ Correct team assignments (null for singles, 1/2 for doubles)
- ✅ All required fields present at each level
- ✅ Proper error handling (400, 404)
- ✅ Match ordering
- ✅ Automatic cleanup

## Future Optimizations

If performance becomes an issue with very large tournaments (100+ matches):

1. **Pagination**: Add pagination for matches
2. **Field Selection**: Allow client to specify which fields to return
3. **Caching**: Implement Redis caching for frequently accessed tournaments
4. **GraphQL**: Consider GraphQL for more flexible data fetching
5. **Materialized View**: Create a materialized view for tournament details if read-heavy

## Conclusion

The implemented solution prioritizes **scalability and performance** over simplicity. While it requires 3 database queries instead of 1, it provides much better performance characteristics for real-world tournament sizes and will scale well as the application grows.

