import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function buildInvocation(overrides: Partial<ToolInvocation>): ToolInvocation {
  return {
    toolCallId: "call-1",
    toolName: "str_replace_editor",
    args: {},
    state: "result",
    result: "Success",
    ...overrides,
  } as ToolInvocation;
}

test("shows creating message for str_replace_editor create command", () => {
  const toolInvocation = buildInvocation({
    args: { command: "create", path: "/App.jsx" },
  });

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("shows editing message for str_replace_editor str_replace command", () => {
  const toolInvocation = buildInvocation({
    args: { command: "str_replace", path: "/components/Card.jsx" },
  });

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("Editing Card.jsx")).toBeDefined();
});

test("shows editing message for str_replace_editor insert command", () => {
  const toolInvocation = buildInvocation({
    args: { command: "insert", path: "/components/Card.jsx" },
  });

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("Editing Card.jsx")).toBeDefined();
});

test("shows viewing message for str_replace_editor view command", () => {
  const toolInvocation = buildInvocation({
    args: { command: "view", path: "/App.jsx" },
  });

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("Viewing App.jsx")).toBeDefined();
});

test("shows deleting message for file_manager delete command", () => {
  const toolInvocation = buildInvocation({
    toolName: "file_manager",
    args: { command: "delete", path: "/components/Old.jsx" },
  });

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("Deleting Old.jsx")).toBeDefined();
});

test("shows renaming message for file_manager rename command", () => {
  const toolInvocation = buildInvocation({
    toolName: "file_manager",
    args: {
      command: "rename",
      path: "/components/Old.jsx",
      new_path: "/components/New.jsx",
    },
  });

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("Renaming Old.jsx to New.jsx")).toBeDefined();
});

test("falls back to tool name for unknown tools", () => {
  const toolInvocation = buildInvocation({
    toolName: "some_other_tool",
    args: {},
  });

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("some_other_tool")).toBeDefined();
});

test("shows a spinner while the tool call is in progress", () => {
  const toolInvocation = buildInvocation({
    args: { command: "create", path: "/App.jsx" },
    state: "call",
    result: undefined,
  });

  const { container } = render(
    <ToolInvocationBadge toolInvocation={toolInvocation} />
  );

  expect(container.querySelector(".animate-spin")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows a completion dot once the tool call has a result", () => {
  const toolInvocation = buildInvocation({
    args: { command: "create", path: "/App.jsx" },
    state: "result",
    result: "Success",
  });

  const { container } = render(
    <ToolInvocationBadge toolInvocation={toolInvocation} />
  );

  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
