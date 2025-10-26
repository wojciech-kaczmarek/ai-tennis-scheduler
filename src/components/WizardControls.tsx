import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from "lucide-react";

interface WizardControlsProps {
  currentStep: number;
  maxStep: number;
  isStepValid: boolean;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export const WizardControls = ({
  currentStep,
  maxStep,
  isStepValid,
  onNext,
  onBack,
  onSubmit,
  isSubmitting = false,
}: WizardControlsProps) => {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === maxStep;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-6 sm:mt-8 pt-6 border-t">
      {/* Back Button */}
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep}
        aria-label="Go to previous step"
        className="w-full sm:w-auto"
      >
        <ChevronLeftIcon className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Step indicator */}
      <div
        className="flex items-center justify-center gap-2 order-first sm:order-none"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {maxStep + 1}
        </span>
      </div>

      {/* Next/Submit Button */}
      {isLastStep ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!isStepValid || isSubmitting}
          aria-label="Submit tournament"
          className="w-full sm:w-auto"
        >
          <CheckIcon className="mr-2 h-4 w-4" />
          {isSubmitting ? "Creating..." : "Create Tournament"}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={!isStepValid}
          aria-label="Go to next step"
          className="w-full sm:w-auto"
        >
          Next
          <ChevronRightIcon className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
