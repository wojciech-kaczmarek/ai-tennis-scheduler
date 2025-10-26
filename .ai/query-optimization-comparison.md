# Query Optimization Comparison

## Visual Comparison of Query Strategies

### Scenario: Tournament with 10 players, 50 matches

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APPROACH 1: Single Nested Query                  │
└─────────────────────────────────────────────────────────────────────┘

Query:
  tournaments JOIN players JOIN schedules JOIN matches JOIN match_players JOIN players

Result Set:
  ┌──────────────────────────────────────────────────────────────────┐
  │ 1 tournament × 10 players × 50 matches × 150 match_players      │
  │ = 75,000 ROWS                                                     │
  │                                                                   │
  │ Each row contains:                                                │
  │ - Tournament data (repeated 75,000 times) ❌                     │
  │ - Player data (repeated 7,500 times per player) ❌               │
  │ - Match data (repeated 1,500 times per match) ❌                 │
  │ - Match player data (repeated 500 times) ❌                      │
  └──────────────────────────────────────────────────────────────────┘

Network Transfer: ~15 MB (estimated)
Database Load: Very High (complex nested JOIN)
Scalability: Poor (exponential growth)


┌─────────────────────────────────────────────────────────────────────┐
│              APPROACH 2: Three Queries with Player JOIN             │
└─────────────────────────────────────────────────────────────────────┘

Query 1: tournaments JOIN players
  Result: 1 × 10 = 10 rows
  ┌────────────────────────────────────────┐
  │ Tournament + Player (repeated 10×)     │
  └────────────────────────────────────────┘

Query 2: schedules
  Result: 1 row
  ┌────────────────────────────────────────┐
  │ Schedule ID                            │
  └────────────────────────────────────────┘

Query 3: matches JOIN match_players JOIN players
  Result: 50 matches × 3 players avg = 150 rows
  ┌────────────────────────────────────────┐
  │ Match + Player data (repeated per      │
  │ match for each player) ❌              │
  │                                         │
  │ Player "John" plays 10 matches →       │
  │ His data sent 10 times ❌              │
  └────────────────────────────────────────┘

Total: 161 ROWS
Network Transfer: ~50 KB (estimated)
Database Load: Medium (3 queries, one with JOIN)
Scalability: Fair (linear with duplication)


┌─────────────────────────────────────────────────────────────────────┐
│         APPROACH 3: Three Optimized Queries (FINAL) ✅             │
└─────────────────────────────────────────────────────────────────────┘

Query 1: tournaments JOIN schedules
  Result: 1 row
  ┌────────────────────────────────────────┐
  │ Tournament + Schedule ID               │
  └────────────────────────────────────────┘

Query 2: players WHERE tournament_id
  Result: 10 rows (one per player)
  ┌────────────────────────────────────────┐
  │ Player 1: {id, name, placeholder}      │
  │ Player 2: {id, name, placeholder}      │
  │ ...                                     │
  │ Player 10: {id, name, placeholder}     │
  │                                         │
  │ Each player fetched ONCE ✅            │
  └────────────────────────────────────────┘

Query 3: matches JOIN match_players (player_id ONLY)
  Result: 50 rows (one per match)
  ┌────────────────────────────────────────┐
  │ Match 1: {id, court, order,            │
  │   players: [player_id, player_id]}     │
  │ Match 2: {id, court, order,            │
  │   players: [player_id, player_id]}     │
  │ ...                                     │
  │                                         │
  │ Only IDs, no player details ✅         │
  └────────────────────────────────────────┘

Application Layer:
  ┌────────────────────────────────────────┐
  │ Map player_id → player details         │
  │ using Map from Query 2                 │
  │ O(1) lookup per player ✅              │
  └────────────────────────────────────────┘

Total: 61 ROWS (1 + 10 + 50)
Network Transfer: ~10 KB (estimated)
Database Load: Low (3 simple queries)
Scalability: Excellent (pure linear growth)
```

## Performance Metrics Table

| Metric | Approach 1 | Approach 2 | Approach 3 ✅ |
|--------|-----------|-----------|---------------|
| **Total Rows** | 75,000 | 161 | **61** |
| **Network Data** | ~15 MB | ~50 KB | **~10 KB** |
| **Tournament Duplication** | 75,000× | 10× | **1× (no dup)** |
| **Player Duplication** | 7,500× per player | ~10× per player | **1× per player** |
| **Match Duplication** | 1,500× per match | 3× per match | **1× per match** |
| **Database Queries** | 1 | 3 | **3** |
| **JOIN Complexity** | Very High | Medium | **Low** |
| **Application Processing** | Minimal | Minimal | **Map lookup (O(1))** |

## Scalability Analysis

### Growth Rate Comparison

```
Tournament Size: Players × Matches

Small (4 players, 3 matches):
  Approach 1: 4 × 3 × 9 = 108 rows
  Approach 2: 4 + 1 + 9 = 14 rows
  Approach 3: 1 + 4 + 3 = 8 rows ✅

Medium (10 players, 50 matches):
  Approach 1: 10 × 50 × 150 = 75,000 rows
  Approach 2: 10 + 1 + 150 = 161 rows
  Approach 3: 1 + 10 + 50 = 61 rows ✅

Large (20 players, 100 matches):
  Approach 1: 20 × 100 × 300 = 600,000 rows
  Approach 2: 20 + 1 + 300 = 321 rows
  Approach 3: 1 + 20 + 100 = 121 rows ✅

Very Large (24 players, 150 matches):
  Approach 1: 24 × 150 × 450 = 1,620,000 rows
  Approach 2: 24 + 1 + 450 = 475 rows
  Approach 3: 1 + 24 + 150 = 175 rows ✅
```

### Growth Visualization

```
Rows Returned (log scale)

1,000,000 │                                    ╱ Approach 1
          │                                 ╱
  100,000 │                              ╱
          │                           ╱
   10,000 │                        ╱
          │                     ╱
    1,000 │                  ╱
          │               ╱
      100 │            ╱────────────────────── Approach 2
          │         ╱  ─────────────────────── Approach 3 ✅
       10 │      ╱
          │   ╱
        1 │╱
          └─────────────────────────────────────────────
            4/3    10/50   20/100  24/150
            Players/Matches
```

## Key Insights

### Why Approach 3 is Optimal

1. **Zero Duplication**
   - Each piece of data fetched exactly once
   - No repeated tournament, player, or match data

2. **Linear Scalability**
   - Rows = 1 + N + M (where N = players, M = matches)
   - Grows linearly, not exponentially

3. **Minimal Network Transfer**
   - ~1,500× less data than Approach 1
   - ~2.6× less data than Approach 2

4. **Simple Queries**
   - Each query accesses 1-2 tables maximum
   - Easy for database to optimize
   - Uses indexes efficiently

5. **Application-Side Mapping**
   - Map lookup is O(1) - extremely fast
   - No database overhead
   - Flexible for future enhancements

### Trade-off Analysis

**Cost**: 2 additional database round trips
- Round trip time: ~1-5ms per query (same datacenter)
- Total overhead: ~2-10ms

**Benefit**: Reduced network transfer
- Approach 1 → 3: ~15 MB → ~10 KB (1,500× reduction)
- Network transfer time saved: ~100-500ms (depending on connection)

**Net Result**: ~90-490ms faster response time + better scalability ✅

## Conclusion

Approach 3 is the clear winner for this use case:
- ✅ Optimal performance for all tournament sizes
- ✅ Scales linearly (no exponential growth)
- ✅ Minimal network transfer
- ✅ Simple, maintainable code
- ✅ Easy to cache and optimize further

The small cost of 2 additional database queries is vastly outweighed by the massive reduction in data transfer and improved scalability.


