import { useState, useEffect } from "react";
import type { WizardFormData } from "@/components/TournamentWizard";

const STORAGE_KEY = "tournament_wizard_form_data";
const STORAGE_STEP_KEY = "tournament_wizard_current_step";

interface UseWizardFormStateReturn {
  formData: WizardFormData;
  setFormData: (data: WizardFormData | ((prev: WizardFormData) => WizardFormData)) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  clearFormData: () => void;
}

const getInitialFormData = (): WizardFormData => {
  if (typeof window === "undefined") {
    return {
      name: "",
      type: "",
      players: [],
      courts: 1,
    };
  }

  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      // Validate that the parsed data has the expected structure
      if (
        parsed &&
        typeof parsed === "object" &&
        "name" in parsed &&
        "type" in parsed &&
        "players" in parsed &&
        "courts" in parsed
      ) {
        return parsed as WizardFormData;
      }
    }
  } catch (error) {
    console.error("Error loading form data from localStorage:", error);
  }

  return {
    name: "",
    type: "",
    players: [],
    courts: 1,
  };
};

const getInitialStep = (): number => {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const savedStep = localStorage.getItem(STORAGE_STEP_KEY);
    if (savedStep) {
      const step = parseInt(savedStep, 10);
      if (!isNaN(step) && step >= 0) {
        return step;
      }
    }
  } catch (error) {
    console.error("Error loading step from localStorage:", error);
  }

  return 0;
};

export const useWizardFormState = (): UseWizardFormStateReturn => {
  const [formData, setFormData] = useState<WizardFormData>(getInitialFormData);
  const [currentStep, setCurrentStep] = useState<number>(getInitialStep);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize on mount
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Persist form data to localStorage
  useEffect(() => {
    if (!isInitialized) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    } catch (error) {
      console.error("Error saving form data to localStorage:", error);
    }
  }, [formData, isInitialized]);

  // Persist current step to localStorage
  useEffect(() => {
    if (!isInitialized) return;

    try {
      localStorage.setItem(STORAGE_STEP_KEY, currentStep.toString());
    } catch (error) {
      console.error("Error saving step to localStorage:", error);
    }
  }, [currentStep, isInitialized]);

  const clearFormData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_STEP_KEY);
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }

    setFormData({
      name: "",
      type: "",
      players: [],
      courts: 1,
    });
    setCurrentStep(0);
  };

  return {
    formData,
    setFormData,
    currentStep,
    setCurrentStep,
    clearFormData,
  };
};
