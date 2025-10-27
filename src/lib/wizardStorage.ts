/**
 * Utility functions for managing Tournament Wizard localStorage
 */

const STORAGE_KEY = "tournament_wizard_form_data";
const STORAGE_STEP_KEY = "tournament_wizard_current_step";

/**
 * Clear wizard form data from localStorage
 * Ensures the wizard starts fresh when creating a new tournament
 * 
 * This should be called when:
 * - User explicitly clicks "Create Tournament" button
 * - User successfully creates a tournament
 */
export const clearWizardStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_STEP_KEY);
  } catch (error) {
    console.error("Error clearing wizard storage:", error);
  }
};



