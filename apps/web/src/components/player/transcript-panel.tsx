'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

export function TranscriptPanel({ transcript }: { transcript: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Transcript
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-border p-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {transcript}
          </p>
        </div>
      )}
    </div>
  );
}
