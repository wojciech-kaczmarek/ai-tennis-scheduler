import { Button } from "@/components/ui/button";
import { Trash2Icon, PlusIcon } from "lucide-react";
import type { PlayerInputVM } from "./TournamentWizard";
import type { TournamentType } from "@/types";

interface PlayersStepProps {
  players: PlayerInputVM[];
  tournamentType: TournamentType | "";
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, name: string) => void;
}

export const PlayersStep = ({ players, tournamentType, onAdd, onRemove, onUpdate }: PlayersStepProps) => {
  const playerCount = players.length;
  const minPlayers = 4;
  const maxPlayers = 24;

  const getValidationMessage = (): string | null => {
    if (playerCount < minPlayers) {
      return `Add at least ${minPlayers - playerCount} more player${minPlayers - playerCount > 1 ? "s" : ""}`;
    }
    if (playerCount > maxPlayers) {
      return `Maximum ${maxPlayers} players allowed`;
    }
    if (tournamentType === "doubles" && playerCount % 4 !== 0) {
      return "Doubles tournaments require a multiple of 4 players";
    }
    return null;
  };

  const validationMessage = getValidationMessage();
  const canAddMore = playerCount < maxPlayers;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Players</h2>
        <p className="text-muted-foreground">
          Add between {minPlayers} and {maxPlayers} players to your tournament
          {tournamentType === "doubles" && " (must be a multiple of 4)"}
        </p>
      </div>

      <div className="space-y-4">
        {/* Player count indicator */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">Total Players: {playerCount}</span>
          {validationMessage && (
            <span
              className={`text-sm ${
                playerCount < minPlayers || playerCount > maxPlayers ? "text-destructive" : "text-amber-600"
              }`}
              role="alert"
              aria-live="polite"
            >
              {validationMessage}
            </span>
          )}
        </div>

        {/* Player list */}
        <div className="space-y-2">
          {players.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No players added yet. Click &quot;Add Player&quot; to start.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {players.map((player, index) => (
                <div key={player.id} className="flex items-center gap-3 p-3 border rounded-lg bg-background">
                  <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                  <input
                    type="text"
                    value={player.name || ""}
                    onChange={(e) => onUpdate(player.id, e.target.value)}
                    placeholder={player.placeholder_name}
                    aria-label={`Player ${index + 1} name`}
                    data-testid={`player-input-${index}`}
                    className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(player.id)}
                    aria-label={`Remove ${player.name || player.placeholder_name}`}
                    data-testid={`remove-player-button-${index}`}
                    className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add player button */}
        <Button
          type="button"
          variant="outline"
          onClick={onAdd}
          disabled={!canAddMore}
          data-testid="add-player-button"
          className="w-full"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Player
          {!canAddMore && ` (Maximum ${maxPlayers} reached)`}
        </Button>
      </div>
    </div>
  );
};
