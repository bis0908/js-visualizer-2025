import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CodeExample } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ExampleSidebarProps {
  examples: CodeExample[];
  selectedId: string | null;
  onSelect: (example: CodeExample) => void;
  isOpen: boolean;
}

const groupLabels = {
  basic: "Basic Concepts",
  eventloop: "Event Loop & Queues",
  complex: "Complex Async",
};

const difficultyColors = {
  beginner: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function ExampleSidebar({ examples, selectedId, onSelect, isOpen }: ExampleSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredExamples = examples.filter((example) =>
    example.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    example.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedExamples = {
    basic: filteredExamples.filter((e) => e.group === "basic"),
    eventloop: filteredExamples.filter((e) => e.group === "eventloop"),
    complex: filteredExamples.filter((e) => e.group === "complex"),
  };

  return (
    <aside
      className={cn(
        "bg-sidebar border-r transition-all duration-300 ease-in-out overflow-hidden",
        isOpen ? "w-80" : "w-0"
      )}
      aria-hidden={!isOpen}
    >
      <div className="h-full flex flex-col">
        {/* Search */}
        <div className="h-12 px-3 border-b flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search examples..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 bg-transparent"
            data-testid="input-search-examples"
          />
          {searchQuery && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              data-testid="button-clear-search"
              className="shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Examples grouped by category */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {Object.entries(groupedExamples).map(([groupKey, groupExamples]) => {
              if (groupExamples.length === 0) return null;

              return (
                <div key={groupKey} className="mb-4">
                  <h3 className="text-xs uppercase font-semibold py-3 px-4 text-sidebar-foreground">
                    {groupLabels[groupKey as keyof typeof groupLabels]}
                  </h3>
                  <div className="space-y-1">
                    {groupExamples.map((example) => (
                      <button
                        key={example.id}
                        onClick={() => onSelect(example)}
                        className={cn(
                          "w-full text-left px-4 py-3 cursor-pointer hover:translate-x-1 transition-transform rounded-lg border",
                          selectedId === example.id
                            ? "bg-sidebar-accent border-primary shadow-sm"
                            : "border-transparent hover-elevate"
                        )}
                        data-testid={`button-example-${example.id}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-medium text-sm">{example.title}</h4>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                              difficultyColors[example.difficulty]
                            )}
                          >
                            {example.difficulty}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {example.description}
                        </p>
                        <div className="mt-2 text-xs font-mono text-muted-foreground truncate">
                          → {example.expectedOutput[0]}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredExamples.length === 0 && (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                No examples found
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
