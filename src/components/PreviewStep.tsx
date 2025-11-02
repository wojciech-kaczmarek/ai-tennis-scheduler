import { useEffect } from "react";
import type { WizardFormData } from "@/components/TournamentWizard";
import { useGenerateSchedule } from "@/lib/hooks/useGenerateSchedule";
import { ScheduleSkeleton } from "@/components/ScheduleSkeleton";

interface PreviewStepProps {
  formData: WizardFormData;
  onScheduleGenerated?: (schedule: import("@/types").GeneratedScheduleDTO) => void;
}

export const PreviewStep = ({ formData, onScheduleGenerated }: PreviewStepProps) => {
  const { data: schedule, loading, error, generate } = useGenerateSchedule();

  useEffect(() => {
    const generateSchedulePreview = async () => {
      // Only generate if we have valid data
      if (!formData.type || formData.players.length < 4 || formData.courts < 1) {
        return;
      }

      try {
        const result = await generate({
          type: formData.type as "singles" | "doubles",
          courts: formData.courts,
          players: formData.players.map((p) => ({
            name: p.name ?? null,
            placeholder_name: p.placeholder_name,
          })),
        });

        // Notify parent component of generated schedule
        if (onScheduleGenerated) {
          onScheduleGenerated(result);
        }
      } catch (err) {
        // Error is handled by the hook
        console.error("Failed to generate schedule:", err);
      }
    };

    generateSchedulePreview();
  }, [formData.type, formData.courts, formData.players]);

  if (loading) {
    return <ScheduleSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Schedule Preview</h2>
          <p className="text-muted-foreground">Review the AI-generated tournament schedule</p>
        </div>

        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-lg">
          <h3 className="text-lg font-semibold text-destructive mb-2">Error Generating Schedule</h3>
          <p className="text-sm text-destructive/90">{error}</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Schedule Preview</h2>
          <p className="text-muted-foreground">No schedule available. Please complete the previous steps.</p>
        </div>
      </div>
    );
  }

  // Group matches by court
  const matchesByCourt = schedule.matches.reduce(
    (acc, match) => {
      if (!acc[match.court_number]) {
        acc[match.court_number] = [];
      }
      acc[match.court_number].push(match);
      return acc;
    },
    {} as Record<number, typeof schedule.matches>
  );

  // Sort courts
  const courts = Object.keys(matchesByCourt)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Schedule Preview</h2>
        <p className="text-muted-foreground">Review the AI-generated tournament schedule</p>
      </div>

      <div className="grid gap-6" data-testid="schedule-preview">
        {courts.map((courtNumber) => {
          const courtMatches = matchesByCourt[courtNumber].sort(
            (a, b) => a.match_order_on_court - b.match_order_on_court
          );

          return (
            <div key={courtNumber} className="border rounded-lg overflow-hidden">
              <div className="bg-primary text-primary-foreground px-4 py-3">
                <h3 className="font-semibold text-lg">Court {courtNumber}</h3>
              </div>
              <div className="divide-y">
                {courtMatches.map((match, idx) => {
                  const playerNames = match.players.map((p) => p.placeholder_name);

                  return (
                    <div key={idx} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-muted-foreground mb-1">Match {match.match_order_on_court}</div>
                          <div className="font-medium">
                            {formData.type === "doubles" ? (
                              <>
                                <div className="mb-1">
                                  Team 1: {playerNames[0]} & {playerNames[1]}
                                </div>
                                <div>
                                  Team 2: {playerNames[2]} & {playerNames[3]}
                                </div>
                              </>
                            ) : (
                              <>
                                {playerNames[0]} vs {playerNames[1]}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Total Matches:</strong> {schedule.matches.length}
        </p>
      </div>
    </div>
  );
};
