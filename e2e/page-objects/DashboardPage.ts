import type { Page, Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly createTournamentButton: Locator;
  readonly tournamentsList: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createTournamentButton = page.getByTestId("create-tournament-button");
    this.tournamentsList = page.getByTestId("tournaments-list");
    this.emptyState = page.getByTestId("empty-state");
  }

  async goto() {
    await this.page.goto("/");
  }

  async clickCreateTournament() {
    await this.createTournamentButton.click();
  }
}




