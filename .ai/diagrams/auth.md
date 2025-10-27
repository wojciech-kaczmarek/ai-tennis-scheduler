<authentication_analysis>
1.  **Authentication Flows:** The authentication process includes the following user flows:
    -   User registration via an email and password.
    -   User login with credentials.
    -   User logout to terminate the session.
    -   Password recovery for users who have forgotten their password.
    -   Session validation for accessing protected routes.
    -   Automatic token refresh to maintain an active session.

2.  **Actors and Interactions:** The key actors in the system are:
    -   **Browser:** The client-side interface where the user interacts with the application.
    -   **Middleware:** Server-side logic in Astro that intercepts requests to validate user sessions before they reach a protected page.
    -   **Astro API:** A set of server-side endpoints that handle the logic for registration, login, logout, and other authentication-related actions.
    -   **Supabase Auth:** The external authentication provider that manages user identities, sessions, and token issuance.

3.  **Token Verification and Refresh:**
    -   Token verification is handled by the Astro Middleware on every request to a protected page. It inspects the session cookies to ensure the user is authenticated.
    -   The Supabase client library automatically manages token refreshing. When an access token expires, the library uses the securely stored refresh token to obtain a new set of tokens from Supabase Auth without interrupting the user.

4.  **Authentication Step Descriptions:**
    -   **Registration:** The user submits their details, which are sent to the Astro API. The API validates the data and instructs Supabase Auth to create a new user. The user is then redirected to the login page.
    -   **Login:** The user provides credentials, which the Astro API validates against Supabase Auth. Upon success, Supabase issues JWTs (access and refresh tokens), which are stored in cookies, and the user is redirected to the dashboard.
    -   **Accessing Protected Pages:** When a user requests a protected page, the Middleware checks for a valid session in the cookies. If valid, access is granted. If not, the user is redirected to the login page.
    -   **Logout:** A request is sent to the Astro API, which calls Supabase Auth to invalidate the user's session tokens. The session cookies are cleared, and the user is redirected to the login page.
</authentication_analysis>

<mermaid_diagram>
```mermaid
sequenceDiagram
    autonumber

    participant Browser
    participant Middleware
    participant Astro API
    participant Supabase Auth

    %% User Registration Flow
    Browser->>Astro API: POST /api/auth/register (email, password)
    activate Astro API
    Astro API->>Supabase Auth: Create user with credentials
    activate Supabase Auth
    Supabase Auth-->>Astro API: User created successfully
    deactivate Supabase Auth
    Astro API-->>Browser: Redirect to /login with success message
    deactivate Astro API

    %% User Login Flow
    Browser->>Astro API: POST /api/auth/login (email, password)
    activate Astro API
    Astro API->>Supabase Auth: Sign in with credentials
    activate Supabase Auth
    Supabase Auth-->>Astro API: Authentication successful, returns tokens
    deactivate Supabase Auth
    Astro API-->>Browser: Set session cookies (access/refresh tokens)
    Astro API-->>Browser: Redirect to / (Dashboard)
    deactivate Astro API

    %% Accessing Protected Page (Authenticated)
    Browser->>Middleware: GET /tournaments (with session cookie)
    activate Middleware
    Middleware->>Supabase Auth: Validate session from cookie
    activate Supabase Auth
    Supabase Auth-->>Middleware: Session is valid
    deactivate Supabase Auth
    Middleware-->>Browser: Allow request to proceed to page
    deactivate Middleware

    %% Accessing Protected Page (Unauthenticated)
    Browser->>Middleware: GET /tournaments (no/invalid cookie)
    activate Middleware
    Middleware->>Supabase Auth: Validate session from cookie
    activate Supabase Auth
    Supabase Auth-->>Middleware: Session is invalid or missing
    deactivate Supabase Auth
    Middleware-->>Browser: Redirect to /login
    deactivate Middleware

    %% Token Refresh (Automatic)
    Note over Browser, Supabase Auth: When access token expires...
    Browser->>Astro API: API request to a protected endpoint
    activate Astro API
    Astro API->>Supabase Auth: Request with expired access token
    activate Supabase Auth
    alt Token is expired
        Supabase Auth-->>Astro API: Invalid token error
        Astro API->>Supabase Auth: Use refresh token to get new tokens
        Supabase Auth-->>Astro API: New access and refresh tokens
        Astro API-->>Browser: Update session cookies
        Astro API-->>Browser: Fulfill original API request
    else Token is valid
        Supabase Auth-->>Astro API: Data from protected endpoint
        Astro API-->>Browser: Return data
    end
    deactivate Supabase Auth
    deactivate Astro API

    %% User Logout Flow
    Browser->>Astro API: POST /api/auth/logout
    activate Astro API
    Astro API->>Supabase Auth: Sign out user
    activate Supabase Auth
    Supabase Auth-->>Astro API: User session invalidated
    deactivate Supabase Auth
    Astro API-->>Browser: Clear session cookies
    Astro API-->>Browser: Redirect to /login
    deactivate Astro API

```
</mermaid_diagram>
