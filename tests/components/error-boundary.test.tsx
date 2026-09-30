import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ErrorPage from "@/app/(en)/error";

afterEach(cleanup);

describe("route error boundary", () => {
  it("recovers via the framework's retry(), not reset()", () => {
    const retry = vi.fn();
    const reset = vi.fn();
    render(<ErrorPage error={new Error("server detail")} retry={retry} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(retry).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
  });

  it("does not show error details to users", () => {
    render(<ErrorPage error={new Error("server detail")} retry={vi.fn()} reset={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).not.toContain("server detail");
  });
});
