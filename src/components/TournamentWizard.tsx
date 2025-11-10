import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { TabNavigation } from "@/components/TabNavigation";
import { WizardControls } from "@/components/WizardControls";
import { useWizardFormState } from "@/lib/hooks/useWizardFormState";
import { useCreateTournament } from "@/lib/hooks/useCreateTournament";
import type { TournamentType, GeneratedScheduleDTO } from "@/types";

export interface PlayerInputVM {
  id: string;
  name?: string;
  placeholder_name: string;
  error?: string;
}

export interface WizardFormData {
  name: string;
  type: TournamentType | "";
  players: PlayerInputVM[];
  courts: number;
}

export const TournamentWizard = () => {
  const { formData, setFormData, currentStep, setCurrentStep, clearFormData } = useWizardFormState();
  const { loading: isSubmitting, create } = useCreateTournament();
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedScheduleDTO | null>(null);

  const steps = [
    { id: 0, label: "Name", value: "name" },
    { id: 1, label: "Type", value: "type" },
    { id: 2, label: "Players", value: "players" },
    { id: 3, label: "Courts", value: "courts" },
    { id: 4, label: "Preview", value: "preview" },
  ];

  const handleStepChange = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Handle final submission
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate that we have a generated schedule
    if (!generatedSchedule) {
      toast.error("Please wait for the schedule to be generated");
      return;
    }

    // Validate form data
    if (!formData.type) {
      toast.error("Tournament type is required");
      return;
    }

    try {
      // Map form data to CreateTournamentRequestDTO
      const tournamentData = {
        name: formData.name,
        type: formData.type as "singles" | "doubles",
        courts: formData.courts,
        players: formData.players.map((p) => ({
          name: p.name ?? null,
          placeholder_name: p.placeholder_name,
        })),
        schedule: {
          matches: generatedSchedule.matches.map((match) => ({
            court_number: match.court_number,
            match_order_on_court: match.match_order_on_court,
            players: match.players.map((player) => ({
              placeholder_name: player.placeholder_name,
              team: player.team,
            })),
          })),
        },
      };

      // Create the tournament
      const result = await create(tournamentData);

      // Show success message
      toast.success(`Tournament "${result.name}" created successfully!`);

      // Clear form data
      clearFormData();

      // Redirect to home page after a short delay
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.assign("/");
        }
      }, 1500);
    } catch (error) {
      // Error toast is shown here since the hook throws the error
      const errorMessage = error instanceof Error ? error.message : "Failed to create tournament";
      toast.error(errorMessage);
    }
  };

  const handleScheduleGenerated = (schedule: GeneratedScheduleDTO) => {
    setGeneratedSchedule(schedule);
  };

  const isStepValid = (): boolean => {
    switch (currentStep) {
      case 0: {
        // Name step
        const isNameValid = formData.name.trim().length > 0;
        console.log("isNameValid", isNameValid);
        return isNameValid;
      }
      case 1: // Type step
        return formData.type === "singles" || formData.type === "doubles";
      case 2: {
        // Players step
        const playerCount = formData.players.length;
        if (playerCount < 4 || playerCount > 24) return false;
        if (formData.type === "doubles" && playerCount % 4 !== 0) return false;
        return true;
      }
      case 3: // Courts step
        return formData.courts >= 1 && formData.courts <= 6;
      case 4: // Preview step
        return true; // Preview step is always valid once reached
      default:
        return false;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Create New Tournament</h1>
        <p className="text-muted-foreground">Follow the steps to set up your tennis tournament</p>
      </div>

      <TabNavigation
        steps={steps}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        formData={formData}
        setFormData={setFormData}
        onScheduleGenerated={handleScheduleGenerated}
      />

      <WizardControls
        currentStep={currentStep}
        maxStep={steps.length - 1}
        isStepValid={isStepValid()}
        onNext={handleNext}
        onBack={handleBack}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <Toaster position="top-right" />
    </div>
  );
};
