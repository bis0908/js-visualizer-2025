import type { CodeExample } from "@shared/schema";
import { BookOpen, Search, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ExampleModalProps {
  examples: CodeExample[];
  selectedId: string | null;
  onSelect: (example: CodeExample) => void;
}

const groupLabels = {
  basic: "Basic Concepts",
  eventloop: "Event Loop & Queues",
  complex: "Complex Async",
};

const difficultyColors = {
  beginner:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  intermediate:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function ExampleModal({
  examples,
  selectedId,
  onSelect,
}: ExampleModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filteredExamples = examples.filter(
    (example) =>
      example.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      example.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const groupedExamples = {
    basic: filteredExamples.filter((e) => e.group === "basic"),
    eventloop: filteredExamples.filter((e) => e.group === "eventloop"),
    complex: filteredExamples.filter((e) => e.group === "complex"),
  };

  const handleSelectExample = (example: CodeExample) => {
    onSelect(example);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          data-testid="button-open-examples"
        >
          <BookOpen className="w-4 h-4" />
          <span>Examples</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Code Examples</DialogTitle>
        </DialogHeader>

        {/* 검색 */}
        <div className="h-12 px-4 border-b flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="예제 검색..."
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
              aria-label="검색 초기화"
              data-testid="button-clear-search"
              className="shrink-0 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* 카테고리별 그리드 */}
        <ScrollArea className="flex-1 px-4 pb-4">
          {Object.entries(groupedExamples).map(([groupKey, groupExamples]) => {
            if (groupExamples.length === 0) return null;

            return (
              <section key={groupKey} className="mt-4">
                <h3 className="text-xs uppercase font-semibold text-muted-foreground mb-3">
                  {groupLabels[groupKey as keyof typeof groupLabels]}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {groupExamples.map((example) => (
                    <button
                      type="button"
                      key={example.id}
                      onClick={() => handleSelectExample(example)}
                      className={cn(
                        "text-left p-4 rounded-lg border cursor-pointer transition-all",
                        "hover:border-primary/50 hover:bg-zinc-700/50",
                        selectedId === example.id
                          ? "bg-primary/10 border-primary/50 shadow-sm"
                          : "bg-zinc-800 border-zinc-700",
                      )}
                      data-testid={`button-example-${example.id}`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h4 className="font-medium text-sm leading-tight">
                          {example.title}
                        </h4>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-1.5 py-0 rounded-full font-medium shrink-0",
                            difficultyColors[example.difficulty],
                          )}
                        >
                          {example.difficulty}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {example.description}
                      </p>
                      <div className="text-[10px] font-mono text-muted-foreground truncate">
                        → {example.expectedOutput[0]}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}

          {filteredExamples.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              검색 결과가 없습니다
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
