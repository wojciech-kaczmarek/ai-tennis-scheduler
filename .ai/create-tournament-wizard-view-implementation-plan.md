# View Implementation Plan: Create Tournament Wizard

## 1. Overview
The Create Tournament Wizard is a multi-step form that guides users through creating a new tennis tournament. Users enter the tournament name, select the type (singles or doubles), add player details, specify the number of courts, preview an AI-generated schedule, and finally submit to persist the tournament.

## 2. View Routing
Path: `/create`

## 3. Component Structure
```
CreatePage (/create)
└── TournamentWizard
    ├── TabNavigation
    │   ├── NameStep
    │   ├── TypeStep
    │   ├── PlayersStep
    │   ├── CourtsStep
    │   └── PreviewStep
    ├── WizardControls
    ├── ScheduleSkeleton
    └── ToastHandler
```

## 4. Component Details

### TournamentWizard
- Purpose: Container for wizard state, navigation, and API hooks
- Contains: `TabNavigation`, `WizardControls`, conditionally `ScheduleSkeleton`
- Events: Handles step changes, calls generate and create APIs
- Props: none (page-level)

### TabNavigation
- Purpose: Renders Shadcn/ui tabs for steps
- Elements: TabList with aria-label="Wizard Steps", TabPanels for each step
- Props:
  - `currentStep: number`
  - `onStepChange(step: number): void`

### NameStep
- Purpose: Capture tournament name
- Elements: `<input>` type="text" with label "Tournament Name"
- Validation: non-empty string
- Props:
  - `value: string`
  - `onChange(name: string): void`
- Events:
  - onBlur triggers inline validation

### TypeStep
- Purpose: Select tournament type
- Elements: RadioGroup or Select for values "singles" | "doubles"
- Validation: required selection
- Props:
  - `value: 'singles' | 'doubles'`
  - `onChange(type): void`

### PlayersStep
- Purpose: Add player entries
- Elements: Dynamic list of rows with text inputs for optional name
- Validation:
  - players.length between 4–24
  - if type === 'doubles', players.length % 4 === 0
- Props:
  - `players: PlayerInputVM[]`
  - `onAdd(): void`, `onRemove(id: string): void`
  - `onUpdate(id: string, name: string): void`

### CourtsStep
- Purpose: Specify number of courts via interactive slider
- Elements: `Slider` component from Shadcn/ui with `min={1}`, `max={6}`, `step={1}`
- Validation: value implicitly constrained between 1 and 6 by slider; ensure value is defined
- Props:
  - `value: number`
  - `onChange(courts: number): void`

### PreviewStep
- Purpose: Display generated schedule
- Elements: Grid or table showing matches by court and order
- Props:
  - `schedule: GeneratedScheduleDTO`
- Behavior: triggers API call when mounted

### WizardControls
- Purpose: Navigation buttons
- Elements: `Button` components for Back, Next, or Submit on last step
- Props:
  - `currentStep: number`, `maxStep: number`
  - `onNext()`, `onBack()`, `onSubmit()`
- Validation: disable Next until current step valid

### ScheduleSkeleton
- Purpose: Show loading state during schedule generation
- Elements: Shimmer placeholders matching preview layout

### ToastHandler
- Purpose: Render `react-hot-toast` container and trigger toasts

## 5. Types

### WizardFormData
```ts
interface WizardFormData {
  name: string;
  type: 'singles' | 'doubles';
  players: { id: string; name?: string; placeholder_name: string }[];
  courts: number;
}
```

### PlayerInputVM
```ts
interface PlayerInputVM {
  id: string;
  name?: string;
  placeholder_name: string;
  error?: string;
}
```

### GenerateScheduleRequestDTO
Imported from `types.ts`:
```ts
{ type: TournamentType; courts: number; players: GenerateSchedulePlayerDTO[]; }
```

### GeneratedScheduleDTO
Imported from `types.ts`:
```ts
{ matches: GenerateScheduleMatchDTO[]; }
```

### CreateTournamentRequestDTO
Imported from `types.ts`:
```ts
{ name: string; type: TournamentType; courts: number; players: CreateTournamentPlayerDTO[]; schedule: CreateTournamentScheduleDTO; }
```

## 6. State Management
- useWizardFormState (custom hook): holds `formData`, `currentStep`, validation errors; persists to `localStorage` via `useEffect`.
- useGenerateSchedule: wraps API call, returns `{ status, data, error, generate }`.
- useCreateTournament: wraps API call, returns `{ create, error }`.

## 7. API Integration
- **Generate Preview**: POST `/api/schedules/generate`
  - Request: `GenerateScheduleRequestDTO` from form data
  - Response: `GeneratedScheduleDTO`
- **Submit Tournament**: POST `/api/tournaments`
  - Request: `CreateTournamentRequestDTO`
  - Response: `TournamentCreatedResponseDTO`

## 8. User Interactions
- **Next**: validates current step; if last step, triggers `generate` or `create`; else advances
- **Back**: decrements `currentStep`
- **Field Change**: updates `formData`; triggers inline validation
- **Refresh**: rehydrates state, retains `currentStep` and form inputs

## 9. Conditions and Validation
- Name non-empty
- Type selected
- Players count 4–24, and if doubles, count mod 4 === 0
- Courts integer 1–6
- Disable Next until validation passes

## 10. Error Handling
- Inline field errors shown under inputs
- API errors shown via toast (`react-hot-toast.error`)
- Network failures retryable on Preview and Submit

## 11. Implementation Steps
1. Create `src/pages/create.astro` importing `TournamentWizard` with `client:load`
2. Implement `TournamentWizard.tsx` with hook state and step switch
3. Build `TabNavigation` using Shadcn/ui Tabs
4. Develop each Step component with props, validation, and ARIA attributes
5. Create `WizardControls` component using Shadcn/ui `Button`
6. Implement `useWizardFormState` hook with `localStorage` persistence
7. Implement `useGenerateSchedule` and `useCreateTournament` hooks in `src/lib/hooks`
8. Integrate API calls in PreviewStep and on Submit
9. Add `ScheduleSkeleton` for loading UX
10. Integrate `react-hot-toast` in `ToastHandler` at root of wizard
11. Write unit tests for validation logic and hooks
12. Ensure accessibility (focus management, ARIA) and responsiveness
