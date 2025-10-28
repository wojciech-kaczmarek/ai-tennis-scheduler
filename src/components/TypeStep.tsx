import type { TournamentType } from "@/types";

interface TypeStepProps {
  value: TournamentType | "";
  onChange: (type: TournamentType) => void;
}

export const TypeStep = ({ value, onChange }: TypeStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Tournament Type</h2>
        <p className="text-muted-foreground">Select whether this is a singles or doubles tournament</p>
      </div>

      <div className="space-y-4" role="radiogroup" aria-label="Tournament type">
        <div
          role="radio"
          aria-checked={value === "singles"}
          tabIndex={0}
          className={`relative flex cursor-pointer rounded-lg border p-4 transition-all hover:border-primary ${
            value === "singles" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-input"
          }`}
          onClick={() => onChange("singles")}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              onChange("singles");
            }
          }}
        >
          <div className="flex items-start space-x-3">
            <input
              type="radio"
              id="type-singles"
              name="tournament-type"
              value="singles"
              checked={value === "singles"}
              onChange={(e) => onChange(e.target.value as TournamentType)}
              className="mt-1 h-4 w-4 border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-describedby="singles-description"
            />
            <div className="flex-1">
              <label htmlFor="type-singles" className="block text-base font-medium cursor-pointer">
                Singles
              </label>
              <p id="singles-description" className="text-sm text-muted-foreground mt-1">
                One player per match, ideal for individual competition
              </p>
            </div>
          </div>
        </div>

        <div
          role="radio"
          aria-checked={value === "doubles"}
          tabIndex={0}
          className={`relative flex cursor-pointer rounded-lg border p-4 transition-all hover:border-primary ${
            value === "doubles" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-input"
          }`}
          onClick={() => onChange("doubles")}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              onChange("doubles");
            }
          }}
        >
          <div className="flex items-start space-x-3">
            <input
              type="radio"
              id="type-doubles"
              name="tournament-type"
              value="doubles"
              checked={value === "doubles"}
              onChange={(e) => onChange(e.target.value as TournamentType)}
              className="mt-1 h-4 w-4 border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-describedby="doubles-description"
            />
            <div className="flex-1">
              <label htmlFor="type-doubles" className="block text-base font-medium cursor-pointer">
                Doubles
              </label>
              <p id="doubles-description" className="text-sm text-muted-foreground mt-1">
                Two players per team, requires teams of 4
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
