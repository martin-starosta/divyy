# Implementation Plan: Divvy Web Interface

**Author:** Gemini
**Date:** September 7, 2025
**Version:** 1.0

This document provides the technical steps to create, test, and deploy a Next.js web interface for the Divvy tool, reusing the existing core business logic.

## Phase 1: Project Setup & Scaffolding

1.  **Create Next.js Application:**
    - We will create a new Next.js project in a `web` subdirectory to keep it isolated from the core CLI tool.
    - Command: `npx create-next-app@latest web --ts --tailwind --eslint --app --src-dir --import-alias "@/*"`

2.  **Configure Path Aliases for Code Reuse:**
    - To reuse the existing `src` directory from the root of the project, we will modify the `web/tsconfig.json`.
    - Add a new path alias to the `compilerOptions.paths` object:
      ```json
      {
        "compilerOptions": {
          "paths": {
            "@/*": ["./src/*"],
            "@/src/*": ["../src/*"]
          }
        }
      }
      ```
    - This allows us to import core services like `import { DividendAnalysisService } from '@/src/services/DividendAnalysisService';` directly in our Next.js app.

## Phase 2: Backend Development (API Route)

1.  **Create API Route File:**
    - Create a new file at `web/src/app/api/analyze/route.ts`.

2.  **Implement API Logic:**
    - This API route will handle `GET` requests.
    - It will extract the `ticker` from the URL query parameters.
    - It will import `DividendAnalysisService` and other required services from the root `src` directory.
    - It will instantiate and run the analysis service, wrapping the call in a `try...catch` block for error handling.
    - **On Success:** Return a JSON response with the analysis data and a `200` status code.
    - **On Error:** Return a JSON response with an error message and an appropriate status code (`400` for invalid input, `500` for server-side errors).

## Phase 3: Frontend Development (UI)

1.  **Modify the Homepage:**
    - Clear the boilerplate content from `web/src/app/page.tsx`.

2.  **Implement React Component:**
    - Use React hooks (`useState`, `useEffect`) to manage component state for:
      - `ticker` (string)
      - `analysis` (object | null)
      - `isLoading` (boolean)
      - `error` (string | null)

3.  **Build the Form:**
    - Create a form with an `<input>` for the ticker and a `<button>` to submit.
    - The input will be tied to the `ticker` state.
    - The button's `onClick` or form's `onSubmit` handler will trigger the API call.

4.  **Implement API Call Logic:**
    - The submit handler will set `isLoading` to `true` and `error` to `null`.
    - It will use the `fetch` API to make a request to `/api/analyze?ticker=<ticker>`.
    - It will handle the response, updating the `analysis` state on success or the `error` state on failure.
    - Finally, it will set `isLoading` to `false`.

5.  **Conditional Rendering:**
    - The component will render different UI based on the current state:
      - If `isLoading` is `true`, show a loading spinner or message.
      - If `error` is not `null`, display the error message.
      - If `analysis` is not `null`, display the formatted analysis data.

## Phase 4: Deployment to Vercel

1.  **Push to GitHub:**
    - Ensure the entire project, including the new `web` directory, is committed and pushed to a GitHub repository.

2.  **Create Vercel Project:**
    - Log in to Vercel and create a new project, importing the GitHub repository.

3.  **Configure Project Settings:**
    - **Root Directory:** Set the root directory to `web` in the Vercel project settings. This is crucial for Vercel to correctly locate and build the Next.js application.
    - **Environment Variables:** Add any necessary environment variables (e.g., `ALPHA_VANTAGE_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`) to the Vercel project settings. These will be securely passed to the build and runtime environments.

4.  **Deploy:**
    - Trigger a deployment. Vercel will automatically build and deploy the application. Subsequent pushes to the main branch will trigger automatic redeployments.

## Phase 5: Testing

1.  **Local Testing:**
    - Run `npm run dev` inside the `web` directory to start the local development server.
    - Test with valid tickers (e.g., `AAPL`, `MSFT`).
    - Test with invalid or garbage tickers to ensure error handling works.
    - Test with no ticker to verify input validation.

2.  **Production Testing:**
    - Once deployed, perform the same set of tests on the live Vercel URL to ensure the production environment and environment variables are configured correctly.
