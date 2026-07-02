import { cn } from "@/lib/utils";

interface DriverInfo {
  driverNumber: number;
  fullName: string;
  firstName: string;
  lastName: string;
  acronym: string;
  team: string;
  teamColour: string;
  headshotUrl: string | null;
  countryCode: string | null;
}

interface Props {
  drivers: DriverInfo[];
}

/**
 * Renders F1 driver profiles.
 * Shows a detailed card for a single driver, or a grid of compact cards for multiple drivers.
 */
export function DriverCard({ drivers }: Props) {
  if (!drivers || drivers.length === 0) return null;

  if (drivers.length === 1) {
    const driver = drivers[0];
    const colorHex = driver.teamColour.startsWith('#') ? driver.teamColour : `#${driver.teamColour}`;

    return (
      <div className="flex flex-col sm:flex-row w-full rounded-lg border border-border bg-card overflow-hidden relative">
        {/* Team color accent line */}
        <div 
          className="absolute top-0 left-0 w-full sm:w-1.5 h-1.5 sm:h-full z-10" 
          style={{ backgroundColor: colorHex }}
        />
        
        {/* Headshot Section */}
        <div className="w-full sm:w-1/3 bg-muted/20 flex items-end justify-center pt-6 px-4 relative overflow-hidden min-h-[200px]">
          {/* Large background number */}
          <div 
            className="absolute -bottom-4 -right-4 text-[120px] font-bold leading-none opacity-10 select-none"
            style={{ color: colorHex }}
          >
            {driver.driverNumber}
          </div>
          
          {driver.headshotUrl ? (
            <img 
              src={driver.headshotUrl} 
              alt={driver.fullName} 
              className="w-full max-w-[180px] h-auto object-contain relative z-10 drop-shadow-xl"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-border mb-6 relative z-10">
              <span className="text-2xl font-bold text-muted-foreground">{driver.acronym}</span>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="flex flex-col justify-center p-6 sm:p-8 w-full sm:w-2/3 gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground font-medium tracking-wide">
                {driver.firstName}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground uppercase">
                {driver.lastName}
              </h2>
            </div>
            <div 
              className="flex items-center justify-center w-10 h-10 rounded-md text-card font-bold text-lg"
              style={{ backgroundColor: colorHex }}
            >
              {driver.driverNumber}
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                {driver.acronym}
              </span>
              {driver.countryCode && (
                <span className="text-xs font-medium border border-border px-2 py-1 rounded text-foreground">
                  {driver.countryCode}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorHex }} />
              <span className="text-sm font-medium text-foreground">{driver.team}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multiple drivers grid
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
      {drivers.map((driver) => {
        const colorHex = driver.teamColour.startsWith('#') ? driver.teamColour : `#${driver.teamColour}`;
        
        return (
          <div 
            key={driver.driverNumber} 
            className="flex flex-col rounded-lg border border-border bg-card overflow-hidden relative group hover:border-muted-foreground/30 transition-colors"
          >
            <div 
              className="absolute top-0 left-0 w-full h-1 z-10" 
              style={{ backgroundColor: colorHex }}
            />
            
            <div className="bg-muted/10 pt-4 px-2 flex justify-center items-end h-32 relative overflow-hidden">
              <div 
                className="absolute -bottom-2 -right-2 text-6xl font-bold leading-none opacity-5 select-none"
                style={{ color: colorHex }}
              >
                {driver.driverNumber}
              </div>
              
              {driver.headshotUrl ? (
                <img 
                  src={driver.headshotUrl} 
                  alt={driver.fullName} 
                  className="h-full object-contain relative z-10 drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-border mb-4 relative z-10">
                  <span className="text-sm font-bold text-muted-foreground">{driver.acronym}</span>
                </div>
              )}
            </div>
            
            <div className="p-3 flex flex-col gap-1 border-t border-border bg-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">{driver.acronym}</span>
                <span className="text-[10px] font-bold" style={{ color: colorHex }}>{driver.driverNumber}</span>
              </div>
              <h3 className="text-xs font-bold tracking-tight text-foreground truncate">
                {driver.fullName}
              </h3>
              <span className="text-[10px] text-muted-foreground truncate">
                {driver.team}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
