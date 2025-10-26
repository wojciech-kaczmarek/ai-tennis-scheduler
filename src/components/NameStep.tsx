import { useState } from "react";

interface NameStepProps {
  value: string;
  onChange: (name: string) => void;
}

export const NameStep = ({ value, onChange }: NameStepProps) => {
  const [error, setError] = useState<string>("");

  const handleBlur = () => {
    if (value.trim().length === 0) {
      setError("Tournament name is required");
    } else {
      setError("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (error) {
      setError("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Tournament Name</h2>
        <p className="text-muted-foreground">Choose a name for your tournament</p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="tournament-name"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Name
        </label>
        <input
          id="tournament-name"
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g., Summer Tennis Championship 2024"
          aria-invalid={!!error}
          aria-describedby={error ? "name-error" : undefined}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
        {error && (
          <p id="name-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
