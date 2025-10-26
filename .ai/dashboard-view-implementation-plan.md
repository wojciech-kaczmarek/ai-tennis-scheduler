# View Implementation Plan: Dashboard

## 1. Overview
The Dashboard view displays a paginated grid of the authenticated user’s tournaments. It allows users to browse existing tournaments, view key details (name, type, players count, courts, creation date), and delete tournaments via a confirmation dialog. An empty state is shown if no tournaments exist.

## 2. View Routing
- Path: `/`
- Implemented in `src/pages/index.astro` with a React island for client-side interactivity.

## 3. Component Structure
```
DashboardPage
├── TournamentGrid
│   ├── TournamentCard (repeat)
│   │   └── DeleteConfirmationDialog
├── DashboardEmptyState (conditional)
└── PaginationControls
```

## 4. Component Details

### DashboardPage
- Description: Orchestrates data fetching, state management, and renders child components.
- Main elements: header, conditional content area (grid or empty state), footer with pagination.
- Handled events: fetch on mount, onPageChange, onPageSizeChange, onDeleteTournament.
- Validation: enforce `page >= 1` and `page_size` within [1, 100].
- Types: `DashboardViewModel` (items: `TournamentListItemDTO[]`, pagination: `PaginationDTO`).
- Props: none.

### TournamentCard
- Description: Displays tournament details and a delete button.
- Main elements: title, type badge, players count, courts count, formatted creation date, Shadcn/ui IconButton for delete.
- Handled events: `onDeleteClick` to open confirmation.
- Validation: none (read-only display).
- Types: `TournamentListItemDTO`.
- Props:
  - `tournament: TournamentListItemDTO`
  - `onDelete: (id: string) => void`

### DeleteConfirmationDialog
- Description: Shadcn/ui Dialog to confirm or cancel deletion.
- Main elements: Dialog title, message with tournament name, Confirm and Cancel buttons.
- Handled events: `onConfirm`, `onCancel`.
- Props:
  - `isOpen: boolean`
  - `tournamentName: string`
  - `onConfirm: () => void`
  - `onCancel: () => void`

### PaginationControls
- Description: Pagination UI for navigating pages and selecting page size.
- Main elements: Prev/Next buttons, current page display, page size dropdown.
- Handled events:
  - `onPageChange(newPage: number)`
  - `onPageSizeChange(newSize: number)`
- Validation: disable Prev on `page === 1`, disable Next on `page === total_pages`.
- Types:
  - `PaginationDTO`.
- Props:
  - `pagination: PaginationDTO`
  - `onPageChange: (page: number) => void`
  - `onPageSizeChange: (size: number) => void`

### DashboardEmptyState
- Description: Displayed when no tournaments are returned.
- Main elements: message icon (Heroicons), text, optional link/button to create a new tournament.
- Handled events: none or optional `onCreate`.
- Props: none.

## 5. Types
- `TournamentListItemDTO` (existing): `{ id, name, type, players_count, courts, created_at }`
- `PaginationDTO` (existing): `{ page, page_size, total_items, total_pages }`
- `DashboardViewModel` (new):
  ```ts
  interface DashboardViewModel {
    items: TournamentListItemDTO[];
    pagination: PaginationDTO;
  }
  ```

## 6. State Management
- `useState` for:
  - `viewModel: DashboardViewModel`
  - `isLoading: boolean`
  - `error: string | null`
  - `deleteTarget: TournamentListItemDTO | null` (to open dialog)
- Custom hook `useTournaments(page, pageSize)`:
  - Fetches data, returns `{ data, loading, error, refetch }`.

## 7. API Integration
- **GET** `/api/tournaments?page={page}&page_size={pageSize}`
  - Request: no body.
  - Response: `TournamentListResponseDTO` = `{ data: TournamentListItemDTO[]; pagination: PaginationDTO }`
- **DELETE** `/api/tournaments/{id}`
  - Request: no body, method DELETE.
  - Response: `204 No Content` or `200 OK`.

## 8. User Interactions
- Initial page load: fetch and display tournaments.
- Change page or page size: fetch new data.
- Click delete icon: open `DeleteConfirmationDialog`.
- Confirm deletion: call DELETE endpoint, on success `refetch()`, close dialog.
- Cancel deletion: close dialog.

## 9. Conditions and Validation
- Ensure `page` and `page_size` are within valid ranges before calling API.
- Disable pagination controls at boundaries.
- Disable delete confirm button during deletion request.

## 10. Error Handling
- On fetch error: show inline error message or toast with retry button.
- On delete error: show toast error, keep dialog open or close with error state.

## 11. Implementation Steps
1. Create `src/components/DashboardPage.tsx` as a React component.
2. Implement `useTournaments` hook in `src/lib/hooks/useTournaments.ts`.
3. Build `TournamentCard.tsx` in `src/components/TournamentCard.tsx`.
4. Build `DeleteConfirmationDialog.tsx` in `src/components/DeleteConfirmationDialog.tsx` using Shadcn/ui.
5. Build `PaginationControls.tsx` in `src/components/PaginationControls.tsx`.
6. Build `DashboardEmptyState.tsx` in `src/components/DashboardEmptyState.tsx` with Heroicons.
7. Update `src/pages/index.astro` to import and render `DashboardPage` with client directive (`client:load`).
8. Style components with Tailwind and ensure responsiveness.
9. Test interactions: loading, empty, pagination, deletion flows.
10. Add keyboard and ARIA attributes for accessibility.
11. Review and refactor code, add unit tests.
