"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

function getFileName(path: string) {
  return path.split("/").filter(Boolean).pop() || path;
}

function getDescription(toolInvocation: ToolInvocation): string {
  const { toolName, args } = toolInvocation;
  const path = typeof args?.path === "string" ? args.path : undefined;
  const fileName = path ? getFileName(path) : undefined;

  if (toolName === "str_replace_editor") {
    switch (args?.command) {
      case "create":
        return fileName ? `Creating ${fileName}` : "Creating file";
      case "str_replace":
      case "insert":
        return fileName ? `Editing ${fileName}` : "Editing file";
      case "view":
        return fileName ? `Viewing ${fileName}` : "Viewing file";
      case "undo_edit":
        return fileName ? `Reverting changes to ${fileName}` : "Reverting changes";
      default:
        return fileName ? `Updating ${fileName}` : "Updating file";
    }
  }

  if (toolName === "file_manager") {
    const newPath = typeof args?.new_path === "string" ? args.new_path : undefined;
    const newFileName = newPath ? getFileName(newPath) : undefined;

    switch (args?.command) {
      case "rename":
        return fileName && newFileName
          ? `Renaming ${fileName} to ${newFileName}`
          : "Renaming file";
      case "delete":
        return fileName ? `Deleting ${fileName}` : "Deleting file";
      default:
        return fileName ? `Updating ${fileName}` : "Updating file";
    }
  }

  return toolName;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const description = getDescription(toolInvocation);
  const isComplete = toolInvocation.state === "result" && Boolean(toolInvocation.result);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{description}</span>
    </div>
  );
}
