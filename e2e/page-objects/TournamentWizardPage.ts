import type { Page, Locator } from "@playwright/test";

export class TournamentWizardPage {
  readonly page: Page;

  // Step 1: Name
  readonly tournamentNameInput: Locator;

  // Step 2: Type
  readonly singlesRadioButton: Locator;
  readonly doublesRadioButton: Locator;

  // Step 3: Players
  readonly addPlayerButton: Locator;

  // Step 4: Courts
  readonly courtsSlider: Locator;

  // Controls
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly submitButton: Locator;
  readonly schedulePreview: Locator;

  constructor(page: Page) {
    this.page = page;

    // Step 1
    this.tournamentNameInput = page.getByTestId("tournament-name-input");

    // Step 2
    this.singlesRadioButton = page.getByTestId("singles-radio");
    this.doublesRadioButton = page.getByTestId("doubles-radio");

    // Step 3
    this.addPlayerButton = page.getByTestId("add-player-button");

    // Step 4
    this.courtsSlider = page.getByTestId("courts-slider");

    // Controls
    this.nextButton = page.getByTestId("next-button");
    this.backButton = page.getByTestId("back-button");
    this.submitButton = page.getByTestId("submit-button");
    this.schedulePreview = page.getByTestId("schedule-preview");
  }

  getPlayerInput(index: number): Locator {
    return this.page.getByTestId(`player-input-${index}`);
  }

  async fillNameStep(name: string) {
    await this.page.waitForSelector('[data-testid="tournament-name-input"][data-ready="true"]', {
      state: "visible",
    });
    await this.tournamentNameInput.fill(name);
    await this.nextButton.click();
  }

  async fillTypeStep(type: "singles" | "doubles") {
    if (type === "singles") {
      await this.singlesRadioButton.click();
    } else {
      await this.doublesRadioButton.click();
    }
    await this.nextButton.click();
  }

  async fillPlayersStep(players: string[]) {
    for (let i = 0; i < players.length; i++) {
      await this.addPlayerButton.click();
      await this.getPlayerInput(i).fill(players[i]);
    }
    await this.nextButton.click();
  }

  async fillCourtsStep() {
    await this.nextButton.click();
  }

  async submitForm() {
    await this.schedulePreview.waitFor({ state: "visible" });
    await this.submitButton.click();
  }
}
