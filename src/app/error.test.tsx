import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RouteError from "./error";

function crash(message: string, digest?: string): Error & { digest?: string } {
  const error: Error & { digest?: string } = new Error(message);
  if (digest !== undefined) error.digest = digest;
  return error;
}

describe("route error boundary", () => {
  it("shows the failure, the server reference, and retries the segment", async () => {
    const reset = vi.fn();
    render(<RouteError error={crash("render blew up", "a1b2c3")} reset={reset} />);

    expect(screen.getByRole("alert")).toHaveTextContent("render blew up");
    expect(screen.getByRole("alert")).toHaveTextContent("a1b2c3");
    expect(screen.getByRole("link", { name: "Back to overview" })).toHaveAttribute("href", "/");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("falls back to its own wording when the error carries no message", () => {
    render(<RouteError error={crash("")} reset={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("This page stopped while rendering.");
    expect(screen.queryByText(/Reference:/)).toBeNull();
  });
});
