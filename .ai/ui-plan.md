# UI Architecture for Tennis Schedule Generator

## 1. UI Structure Overview

The application is a single-page Astro web app with React islands for dynamic interactions. It includes authentication, a dashboard listing tournaments, a multi-step wizard for creating tournaments, and detailed views for reviewing and editing schedules. A persistent header provides navigation, dark mode toggle, and logout functionality. All data fetching and mutations use SWR with a centralized API wrapper and custom hooks.

## 2. View List

### Login Page
- Path: `/login`
- Purpose: Authenticate existing users via email/password.
- Key Information: Email and password fields, submit button, link to Register.
- Components: AuthForm, ProtectedRoute (redirect if authenticated), FormValidation messages.
- Considerations: Focus trap on form, clear error toasts, keyboard-accessible inputs.

### Register Page
- Path: `/register`
- Purpose: Allow new users to sign up.
- Key Information: Email, password, confirm password fields, submit button, link to Login.
- Components: AuthForm, form validation errors, toasts.
- Considerations: Password strength feedback, ARIA alerts for errors.

### Dashboard
- Path: `/`
- Purpose: Display authenticated user’s tournaments.
- Key Information: Paginated grid of TournamentCard components; empty-state when none.
- Components: TournamentCard, PaginationControls, EmptyState, Shadcn/ui Dialog for delete confirmation, Heroicons SVG.
- Considerations: Responsive grid to list view on narrow screens, accessible buttons, keyboard focus management.

### Create Tournament Wizard
- Path: `/create`
- Purpose: Step-by-step creation of a new tournament and schedule preview.
- Key Information: Four tabs (Name, Type, Players, Courts), form inputs at each step, Next/Back controls.
- Components: `TournamentWizard`, Shadcn/ui Tabs, FormFields with inline validation, Skeleton during schedule generation, react-hot-toast for errors.
- Considerations: Persist step state on refresh, focus on tab headings, ARIA labels for steps.

### Schedule Preview & Edit
- Path: `/create/preview`
- Purpose: Show generated schedule; allow drag-and-drop reordering of matches.
- Key Information: `ScheduleGrid` with `CourtColumn` and `MatchCard` components, Save and Regenerate buttons.
- Components: DnDContext + sensors, React.lazy-loaded `@dnd-kit/core`, MatchCard with ordinal badge and drag handle, Skeleton while loading.
- Considerations: optimistic updates with rollback, error toasts.

### Tournament Details
- Path: `/tournaments/[id]`
- Purpose: Review and edit existing tournament: players and finalized schedule.
- Key Information: Shadcn/ui Tabs (Players, Schedule), player list with editable names, schedule grid identical to preview.
- Components: ProtectedRoute, `PlayersTab` with inline edit fields + Save buttons, `ScheduleTab` reusing ScheduleGrid and update hook.
- Considerations: Debounce name edits, explicit Save buttons, rollback on API error, accessible tab panels.

### Error & Fallback Pages
- Path: `*`
- Purpose: Display 404 or unexpected errors.
- Key Information: Error message, link back to Dashboard or Login.
- Components: ErrorMessage, ActionLink.
- Considerations: Clear guidance, focus on primary action.

## 3. User Journey Map

1. User navigates to `/`:
   - If unauthenticated, Astro middleware redirects to `/login`.
2. At `/login`, user enters credentials and submits.
3. On success, user lands on `/` Dashboard.
4. Dashboard shows tournaments or empty state; user clicks “Create Tournament”.
5. Wizard at `/create` guides through Name → Type → Players → Courts.
6. On final step, user clicks “Generate Schedule”: POST `/api/schedules/generate`.
7. After skeleton load, Preview view shows schedule; user drags to reorder.
8. Save commits via PATCH `/api/schedules/{id}/matches`.
9. User clicks “Use this plan”: POST `/api/tournaments` to persist tournament and schedule.
10. Upon success, redirected to Dashboard; new tournament appears.
11. User clicks a TournamentCard to `/tournaments/[id]` to view/edit.
12. In Details, user edits player names (Save calls PATCH `/api/players`), or reorders schedule (PATCH `/api/schedules/{id}/matches`).
13. User toggles dark mode; state persists via localStorage.
14. User clicks Logout; `signOut()` clears session and redirects to `/login`.

## 4. Layout and Navigation Structure

- **Root Layout**: Wraps content in `DialogProvider`, global SWRConfig, ThemeProvider.
- **Header** (visible when authenticated):
  - Logo/Home link
  - Dark Mode Toggle (persists to localStorage)
  - Logout Button (Shadcn/ui Button + icon)
- **Main Navigation**:
  - Dashboard link
  - Create Tournament link (wizard start)
- **Footer** (omitted for MVP)
- **ProtectedRoute**: Guards all client islands and pages except `/login` and `/register`.

## 5. Key Components

- **TournamentCard**: Displays name, type, players_count, courts, created_at; delete icon with confirmation Dialog.
- **TournamentWizard**: Container managing step state, validation, and API calls.
- **TabsStepper**: Shadcn/ui Tabs configured for wizard or detail tabs.
- **ScheduleGrid**: Layout grid for courts and match columns.
- **CourtColumn**: Column for a single court; drop zone for DnD.
- **MatchCard**: Draggable item showing match ordinal, player placeholders.
- **ProtectedRoute**: HOC for client-islands to check auth and redirect.
- **AuthForm**: Shared form logic for Login/Register.
- **EmptyState**: Illustration, text, primary action for no-data views.
- **DialogProvider**: Global context for Shadcn/ui modals.
- **SkeletonLoader**: Shadcn/ui Skeleton wrappers for async content.
- **ToastContainer**: Renders `react-hot-toast` notifications.
