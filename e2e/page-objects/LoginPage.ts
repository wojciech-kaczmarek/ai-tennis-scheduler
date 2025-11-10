import type { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("email-input");
    this.passwordInput = page.getByTestId("password-input");
    this.loginButton = page.getByTestId("login-button");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password_val: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password_val);
    await this.loginButton.click();
    // Wait for navigation to complete after successful login
    await this.page.waitForURL("/", { timeout: 10000 });
  }
}
