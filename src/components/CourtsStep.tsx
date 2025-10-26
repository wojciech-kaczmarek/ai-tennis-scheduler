import { Slider } from "@/components/ui/slider";

interface CourtsStepProps {
  value: number;
  onChange: (courts: number) => void;
}

export const CourtsStep = ({ value, onChange }: CourtsStepProps) => {
  const minCourts = 1;
  const maxCourts = 6;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Courts Available</h2>
        <p className="text-muted-foreground">Specify how many courts are available for the tournament</p>
      </div>

      <div className="space-y-6">
        {/* Courts value display */}
        <div className="flex items-center justify-center p-8 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-6xl font-bold text-primary mb-2">{value}</div>
            <div className="text-lg text-muted-foreground">{value === 1 ? "Court" : "Courts"}</div>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Minimum: {minCourts}</span>
            <span>Maximum: {maxCourts}</span>
          </div>
          <Slider
            value={[value]}
            onValueChange={(values) => onChange(values[0])}
            min={minCourts}
            max={maxCourts}
            step={1}
            aria-label="Number of courts"
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            {Array.from({ length: maxCourts }, (_, i) => i + 1).map((num) => (
              <span key={num} className={`${value === num ? "font-bold text-primary" : ""}`}>
                {num}
              </span>
            ))}
          </div>
        </div>

        {/* Info message */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Note:</strong> More courts allow matches to run in parallel, reducing overall tournament duration.
          </p>
        </div>
      </div>
    </div>
  );
};
