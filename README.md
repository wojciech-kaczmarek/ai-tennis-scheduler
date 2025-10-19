# AI Tennis Scheduler

## Table of Contents

1. [Project Description](#project-description)
2. [Tech Stack](#tech-stack)
3. [Getting Started Locally](#getting-started-locally)
4. [Available Scripts](#available-scripts)
5. [Project Scope (MVP)](#project-scope-mvp)
6. [Project Status](#project-status)
7. [License](#license)

## Project Description

The AI Tennis Scheduler is a web application designed to automate and optimize the creation of match schedules for amateur tennis tournaments. It addresses the challenges of manual scheduling, which is often time-consuming, prone to errors, and can result in unfair matchups. The application provides a simple, efficient tool for organizers, typically groups of friends, to generate fair and logical schedules for both singles and doubles play, saving time and enhancing the tournament experience for all participants.

## Tech Stack

The project is built with a modern, robust technology stack:

- **Frontend:**
  - [Astro 5](https://astro.build/) for fast, content-focused websites.
  - [React 19](https://react.dev/) for interactive UI components.
  - [TypeScript 5](https://www.typescriptlang.org/) for static type-checking.
  - [Tailwind CSS 4](https://tailwindcss.com/) for utility-first styling.
  - [Shadcn/ui](https://ui.shadcn.com/) for accessible and reusable components.

- **Backend:**
  - [Supabase](https://supabase.io/) as a comprehensive backend-as-a-service solution, providing:
    - PostgreSQL Database
    - User Authentication
    - Auto-generated APIs

- **AI Integration:**
  - [OpenRouter.ai](https://openrouter.ai/) to leverage a wide range of AI models (from OpenAI, Anthropic, Google, etc.) for schedule generation and optimization.

- **CI/CD & Hosting:**
  - [GitHub Actions](https://github.com/features/actions) for continuous integration and deployment pipelines.
  - [DigitalOcean](https://www.digitalocean.com/) for application hosting via Docker containers.

## Getting Started Locally

To set up and run the project on your local machine, follow these steps:

### Prerequisites

- **Node.js:** Version `22.14.0` is required. We recommend using a version manager like [nvm](https://github.com/nvm-sh/nvm).
  ```bash
  nvm use
  ```

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/wojciech-kaczmarek/ai-tennis-scheduler.git
    cd ai-tennis-scheduler
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying the example file:

    ```bash
    cp .env.example .env
    ```

    Update the `.env` file with your credentials for Supabase and OpenRouter.

    ```env
    # Supabase
    PUBLIC_SUPABASE_URL="your-supabase-url"
    PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

    # OpenRouter
    OPENROUTER_API_KEY="your-openrouter-api-key"
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:4321`.

## Available Scripts

The following scripts are available in the `package.json`:

- `npm run dev`: Starts the development server with hot-reloading.
- `npm run build`: Builds the application for production.
- `npm run preview`: Serves the production build locally for previewing.
- `npm run lint`: Lints the codebase for errors and style issues.
- `npm run lint:fix`: Automatically fixes linting issues.
- `npm run format`: Formats the code using Prettier.

## Project Scope (MVP)

### Key Features

- **Tournament Management:** Create, view, and delete tournaments.
- **User Authentication:** Simple email and password-based registration and login.
- **Schedule Generation:**
  - Supports **singles** (round-robin) and **doubles** tournaments.
  - The doubles algorithm maximizes unique player interactions (partners and opponents).
  - Accommodates 2 to 24 players and 1 to 6 courts.
- **Schedule Optimization:**
  - The generation algorithm prioritizes avoiding back-to-back matches for players and maximizing court utilization.
- **Manual Adjustments:** Users can preview the generated schedule and make minor edits (change court number, reorder matches).

### Out of Scope for MVP

- Storing match results or scores.
- Factoring in estimated match duration for scheduling.
- Sharing schedules between different users.
- Native mobile applications (the project is web-only).
- Exporting schedules to file formats like PDF or CSV.
- Auto-saving tournament drafts.

## Project Status

**In Development:** The project is currently in the development phase, focusing on delivering the Minimum Viable Product (MVP) features.

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
