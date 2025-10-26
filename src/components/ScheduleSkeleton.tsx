export const ScheduleSkeleton = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Schedule Preview</h2>
        <p className="text-muted-foreground">Generating your schedule...</p>
      </div>

      <div className="grid gap-6">
        {[1, 2, 3].map((court) => (
          <div key={court} className="border rounded-lg overflow-hidden">
            {/* Court header skeleton */}
            <div className="bg-muted px-4 py-3">
              <div className="h-6 w-24 bg-muted-foreground/20 rounded animate-pulse" />
            </div>

            {/* Match skeletons */}
            <div className="divide-y">
              {[1, 2, 3].map((match) => (
                <div key={match} className="p-4 space-y-2">
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-full max-w-md bg-muted rounded animate-pulse" />
                  <div className="h-5 w-full max-w-sm bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="h-4 w-48 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
};


