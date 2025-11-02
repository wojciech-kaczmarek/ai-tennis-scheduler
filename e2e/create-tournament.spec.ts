import { test, expect } from "@playwright/test";
import { LoginPage } from "./page-objects/LoginPage";
import { DashboardPage } from "./page-objects/DashboardPage";
import { TournamentWizardPage } from "./page-objects/TournamentWizardPage";

test.describe("Tournament Creation Flow", () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let wizardPage: TournamentWizardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    wizardPage = new TournamentWizardPage(page);

    await loginPage.goto();
    const username = process.env.E2E_USERNAME;
    const password = process.env.E2E_PASSWORD;

    if (!username || !password) {
      throw new Error("E2E_USERNAME and E2E_PASSWORD must be set");
    }

    await loginPage.login(username, password);
    await expect(page).toHaveURL("/");
  });

  test("should allow a user to create a new tournament", async ({ page }) => {
    // 1. Użytkownik otwiera stronę i loguje się - handled in beforeEach

    // 2. Lista turniejów jest pusta
    await expect(dashboardPage.emptyState).toBeVisible();
    await expect(dashboardPage.tournamentsList).not.toBeVisible();

    // 3. Użytkownik klika w przycisk do tworzenia turnieju
    await dashboardPage.clickCreateTournament();
    await expect(page).toHaveURL("/create");

    // 4. Użytkownik wypełnia dane za pomocą wizarda
    const tournamentName = `E2E Test Tournament ${new Date().getTime()}`;
    const players = ["Player 1", "Player 2", "Player 3", "Player 4"];

    await wizardPage.fillNameStep(tournamentName);
    await wizardPage.fillTypeStep("singles");
    await wizardPage.fillPlayersStep(players);
    await wizardPage.fillCourtsStep();

    // 5. Użytkownik tworzy turniej - handled by wizardPage.fillCourtsStep() which clicks submit

    // 6. Turniej pojawia się na liście
    await expect(page).toHaveURL("/");
    await expect(dashboardPage.tournamentsList).toBeVisible();
    await expect(dashboardPage.emptyState).not.toBeVisible();

    const newTournamentCard = page.locator(`[data-testid="tournaments-list"] >> text=${tournamentName}`);
    await expect(newTournamentCard).toBeVisible();
  });
});
