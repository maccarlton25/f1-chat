import { ExternalLinkIcon, GlobeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WebSearchResultItem {
  title: string;
  url: string;
  pageAge: string | null;
}

export interface WebSearchResultsProps {
  query: string;
  results: WebSearchResultItem[];
  error?: boolean;
  message?: string;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Renders the sources returned by the `web_search` tool as a compact, linked
 * list with favicons — matching the F1 card aesthetic. The model weaves the
 * actual answer into its reply; this card surfaces where the info came from.
 */
export function WebSearchResults({ query, results, error, message }: WebSearchResultsProps) {
  return (
    <div className="flex flex-col w-full max-w-2xl border border-border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 bg-card border-b border-border">
        <GlobeIcon className="size-4 text-muted-foreground" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tighter text-foreground">
          <span className="text-muted-foreground font-normal">Web search: </span>
          {query}
        </h2>
        {!error && results.length > 0 ? (
          <span className="shrink-0 text-xs text-muted-foreground font-mono bg-background px-2 py-0.5 rounded-md border border-border">
            {results.length} {results.length === 1 ? "SOURCE" : "SOURCES"}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="px-3 py-3 text-sm text-muted-foreground">
          Search failed{message ? `: ${message}` : "."}
        </div>
      ) : results.length === 0 ? (
        <div className="px-3 py-3 text-sm text-muted-foreground">No sources found.</div>
      ) : (
        <ul className="divide-y divide-border">
          {results.map((r) => {
            const host = hostname(r.url);
            return (
              <li key={r.url}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40",
                  )}
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
                    alt=""
                    className="size-4 shrink-0 rounded-sm"
                    loading="lazy"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground group-hover:underline">
                      {r.title}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate">{host}</span>
                      {r.pageAge ? (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="shrink-0">{r.pageAge}</span>
                        </>
                      ) : null}
                    </span>
                  </span>
                  <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
