import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });
export default {
  testDir: "./e2e",
  webServer: {
    command: "npm run dev:e2e",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:4321",
  },
};
