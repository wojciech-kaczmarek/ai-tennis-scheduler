flowchart TD
    subgraph "Authentication Pages"
        direction LR
        subgraph "Login"
            LP[/"login.astro"/] --> LFC[LoginForm]
        end
        subgraph "Registration"
            RP[/"register.astro"/] --> RFC[RegisterForm]
        end
        subgraph "Password Recovery"
            FPP[/"forgot-password.astro"/] --> FPC[ForgotPasswordForm]
            RSP[/"reset-password.astro"/] --> RSC[ResetPasswordForm]
        end
        LP & RP & FPP & RSP -- uses --> AL[AuthLayout.astro]
    end
    
    subgraph "Application Core"
        direction TB
        ML[/"Layout.astro"/]
        subgraph "Protected Pages"
            DP[/"index.astro"/]
            CP[/"create.astro"/]
            TP[/"tournaments/[id].astro"/]
        end
        DP & CP & TP -- uses --> ML
    end
    
    subgraph "Shared Components"
        UM[UserMenu.tsx]
    end

    subgraph "Backend"
        direction TB
        MW[/src/middleware/index.ts/]
        subgraph "API Endpoints"
            LoginAPI[/api/auth/login.ts/]
            RegisterAPI[/api/auth/register.ts/]
            LogoutAPI[/api/auth/logout.ts/]
            ForgotPasswordAPI[/api/auth/forgot-password.ts/]
            ResetPasswordAPI[/api/auth/reset-password.ts/]
            CallbackAPI[/api/auth/callback.ts/]
        end
    end
    
    subgraph "External Services"
        SB[Supabase Auth]
    end

    %% Flows
    User -- interacts with --> LFC
    User -- interacts with --> RFC
    User -- interacts with --> FPC
    User -- interacts with --> RSC
    
    LFC --> LoginAPI
    RFC --> RegisterAPI
    FPC --> ForgotPasswordAPI
    RSC --> ResetPasswordAPI
    
    LoginAPI & RegisterAPI & LogoutAPI & ForgotPasswordAPI & ResetPasswordAPI & CallbackAPI -- interacts with --> SB

    User -- navigates to --> DP
    User -- navigates to --> CP
    User -- navigates to --> TP
    
    DP -- handled by --> MW
    CP -- handled by --> MW
    TP -- handled by --> MW
    
    MW -- checks session --> SB
    MW -- redirects to --> LP
    
    ML -- checks auth status --> UM
    UM -- on logout --> LogoutAPI

    classDef page fill:#c9daf8,stroke:#333,stroke-width:2px;
    classDef component fill:#f9e79f,stroke:#333,stroke-width:2px;
    classDef layout fill:#d5a6bd,stroke:#333,stroke-width:2px;
    classDef api fill:#a2d9ce,stroke:#333,stroke-width:2px;
    classDef middleware fill:#f5b7b1,stroke:#333,stroke-width:2px;
    classDef external fill:#d6dbdf,stroke:#333,stroke-width:2px;

    class LP,RP,FPP,RSP,DP,CP,TP page;
    class LFC,RFC,FPC,RSC,UM component;
    class AL,ML layout;
    class LoginAPI,RegisterAPI,LogoutAPI,ForgotPasswordAPI,ResetPasswordAPI,CallbackAPI api;
    class MW middleware;
    class SB external;
