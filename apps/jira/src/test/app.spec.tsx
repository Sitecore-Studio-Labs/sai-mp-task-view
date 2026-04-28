import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "../app/page";

describe("Application should start", () => {
  it("should visible home page heading", () => {
    render(<Home />);

    const heading = screen.getByTestId("home-page-title");

    expect(heading).toBeInTheDocument();
    expect(heading).toBeVisible();
    expect(heading).toHaveTextContent("To get started, edit the page.tsx file.");
  });
});
