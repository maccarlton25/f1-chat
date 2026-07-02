import { cn } from "@/lib/utils";

interface Props {
  circuitImage: string;
  circuit: string;
  circuitType: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  location: string;
  meetingName: string;
  officialName: string;
}

/**
 * Renders a circuit info card showing the track layout image, circuit name, type, location, and country.
 */
export function CircuitMap({
  circuitImage,
  circuit,
  circuitType,
  country,
  countryCode,
  countryFlag,
  location,
  meetingName,
  officialName,
}: Props) {
  return (
    <div className="flex flex-col w-full rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex flex-col gap-1">
        <h3 className="text-sm font-medium tracking-tight text-foreground">
          {meetingName}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {officialName}
        </p>
      </div>
      
      <div className="p-6 bg-muted/20 flex items-center justify-center min-h-[200px]">
        {circuitImage ? (
          <img 
            src={circuitImage} 
            alt={`${circuit} layout`} 
            className="max-w-full max-h-[200px] object-contain dark:invert opacity-90"
          />
        ) : (
          <div className="text-sm text-muted-foreground flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border">
              <span className="text-xs font-medium">{countryCode || "F1"}</span>
            </div>
            <span>No circuit map available</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 p-4 border-t border-border bg-card/50">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Circuit</span>
          <span className="text-xs font-medium text-foreground truncate" title={circuit}>{circuit}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</span>
          <span className="text-xs font-medium text-foreground truncate" title={circuitType}>{circuitType}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Location</span>
          <div className="flex items-center gap-1.5">
            {countryFlag ? (
              <img 
                src={countryFlag} 
                alt={country} 
                className="w-4 h-3 object-cover rounded-[2px] border border-border/50"
              />
            ) : null}
            <span className="text-xs font-medium text-foreground truncate" title={`${location}, ${country}`}>
              {location}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
