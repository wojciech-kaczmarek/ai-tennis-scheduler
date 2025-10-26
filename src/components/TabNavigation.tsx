import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NameStep } from "@/components/NameStep";
import { TypeStep } from "@/components/TypeStep";
import { PlayersStep } from "@/components/PlayersStep";
import { CourtsStep } from "@/components/CourtsStep";
import { PreviewStep } from "@/components/PreviewStep";
import type { WizardFormData } from "@/components/TournamentWizard";

interface TabNavigationProps {
  steps: { id: number; label: string; value: string }[];
  currentStep: number;
  onStepChange: (step: number) => void;
  formData: WizardFormData;
  setFormData: (data: WizardFormData | ((prev: WizardFormData) => WizardFormData)) => void;
  onScheduleGenerated?: (schedule: import("@/types").GeneratedScheduleDTO) => void;
}

export const TabNavigation = ({
  steps,
  currentStep,
  onStepChange,
  formData,
  setFormData,
  onScheduleGenerated,
}: TabNavigationProps) => {
  const currentStepValue = steps[currentStep]?.value || "name";

  return (
    <Tabs
      value={currentStepValue}
      onValueChange={(value) => {
        const stepIndex = steps.findIndex((s) => s.value === value);
        if (stepIndex !== -1) {
          onStepChange(stepIndex);
        }
      }}
      className="w-full"
    >
      <TabsList aria-label="Wizard Steps" className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
        {steps.map((step) => (
          <TabsTrigger key={step.id} value={step.value} disabled={step.id > currentStep}>
            {step.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="mt-8">
        <TabsContent value="name">
          <NameStep value={formData.name} onChange={(name: string) => setFormData({ ...formData, name })} />
        </TabsContent>

        <TabsContent value="type">
          <TypeStep
            value={formData.type}
            onChange={(type: "singles" | "doubles") => setFormData({ ...formData, type })}
          />
        </TabsContent>

        <TabsContent value="players">
          <PlayersStep
            players={formData.players}
            tournamentType={formData.type}
            onAdd={() => {
              // Find the highest player number used in placeholder_name
              const existingNumbers = formData.players
                .map((p) => {
                  const match = p.placeholder_name?.match(/^Player (\d+)$/);
                  return match ? parseInt(match[1], 10) : 0;
                })
                .filter((n) => !isNaN(n));

              const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
              const nextNumber = maxNumber + 1;

              const newPlayer = {
                id: crypto.randomUUID(),
                placeholder_name: `Player ${nextNumber}`,
              };
              setFormData({
                ...formData,
                players: [...formData.players, newPlayer],
              });
            }}
            onRemove={(id: string) => {
              setFormData({
                ...formData,
                players: formData.players.filter((p) => p.id !== id),
              });
            }}
            onUpdate={(id: string, name: string) => {
              setFormData({
                ...formData,
                players: formData.players.map((p) => (p.id === id ? { ...p, name } : p)),
              });
            }}
          />
        </TabsContent>

        <TabsContent value="courts">
          <CourtsStep value={formData.courts} onChange={(courts: number) => setFormData({ ...formData, courts })} />
        </TabsContent>

        <TabsContent value="preview">
          <PreviewStep formData={formData} onScheduleGenerated={onScheduleGenerated} />
        </TabsContent>
      </div>
    </Tabs>
  );
};
