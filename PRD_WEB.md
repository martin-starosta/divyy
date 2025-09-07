# Product Requirements Document: Divvy Web Interface

**Author:** Gemini
**Date:** September 7, 2025
**Version:** 1.0

## 1. Introduction & Objective
This document outlines the requirements for a web-based interface for the Divvy stock analysis tool. The primary objective is to make Divvy's powerful dividend analysis capabilities accessible to a wider audience who may not be comfortable with a command-line interface (CLI). The web interface will provide the same core functionality as the CLI: a user can enter a stock ticker and receive a detailed dividend analysis.

## 2. Problem Statement
The current Divvy tool is a CLI application. While efficient for developers and technical users, it presents a significant barrier to entry for non-technical users or those who prefer graphical interfaces. A web interface will democratize access to the tool, increasing its potential user base and overall impact.

## 3. Goals & Success Metrics
- **Goal 1: Launch a functional, user-friendly web interface.**
  - **Success Metric:** The web application is successfully deployed to Vercel and is publicly accessible.
- **Goal 2: Achieve feature parity with the CLI's core analysis function.**
  - **Success Metric:** The analysis results for any given stock ticker are identical between the web interface and the CLI tool.
- **Goal 3: Ensure a seamless and maintainable development process.**
  - **Success Metric:** The web interface reuses the existing business logic from the `src` directory without requiring any modification to the core services.

## 4. User Stories
- **As a financial analyst,** I want to enter a stock ticker on a webpage and click a button to get a quick dividend analysis without needing to open a terminal.
- **As a retail investor,** I want to see the analysis results displayed in a clear, easy-to-read format on the page after I submit a ticker.
- **As a developer,** I want to see clear loading and error states, so I understand if the analysis is in progress or if something went wrong.

## 5. Functional Requirements
- **FR1: Single-Page Application:** The interface will be a single page containing the input form and the results display area.
- **FR2: Ticker Input:** The page must have a text input field where a user can enter a stock ticker symbol.
- **FR3: Analysis Trigger:** A button labeled "Analyze" will trigger the analysis process.
- **FR4: Results Display:** An area on the page will display the formatted analysis results. This should include, at a minimum:
  - Ticker Symbol
  - Current Score
  - Dividend Yield
  - Payout Ratio
  - 5-Year Growth Rate
  - Analyst Target Price
- **FR5: Loading State:** The UI must display a loading indicator while the analysis is being fetched.
- **FR6: Error Handling:** If the ticker is invalid or an error occurs during analysis, a clear error message must be displayed to the user.
- **FR7: Backend Logic:** The backend must be a Next.js API route that directly imports and utilizes the existing `DividendAnalysisService` from the project's `src` directory.

## 6. Non-Functional Requirements
- **NFR1: Framework:** The web application will be built using Next.js and React with TypeScript.
- **NFR2: Deployment:** The application will be deployed and hosted on Vercel.
- **NFR3: Performance:** The analysis results should be presented to the user within 5 seconds under normal network and API provider conditions.
- **NFR4: Code Reusability:** The project must not duplicate business logic. It will achieve this by setting up path aliases in `tsconfig.json` to reference the root `src` folder.

## 7. Out of Scope
- User accounts, authentication, or profiles.
- Saving or providing a history of past analyses.
- Advanced interactive charting or data visualization.
- Batch analysis of multiple tickers.
