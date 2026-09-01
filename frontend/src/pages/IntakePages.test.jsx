import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getIntake, getIntakes } from "../api/intakes.js";
import IntakeDetailPage from "./IntakeDetailPage.jsx";
import IntakeListPage from "./IntakeListPage.jsx";

vi.mock("../api/intakes.js", () => ({
  getIntake: vi.fn(),
  getIntakes: vi.fn(),
}));

const intake = {
  id: 9,
  title: "Permit copilot",
  description: "Review permit requirements.",
  budget_min: 1500,
  budget_max: 15000,
  timeline_min: 2,
  timeline_max: 4,
  timeline_unit: "months",
  industry: "Construction",
  created_at: "2026-08-31T12:00:00Z",
  ai_status: "complete",
  ai_summary: "A concise project summary. It identifies the desired outcome.",
  ai_tags: ["Permits", "Construction", "Compliance"],
  ai_risks: ["Requirements may vary by jurisdiction", "Approvals may delay delivery"],
};

beforeEach(() => vi.clearAllMocks());

describe("intake list", () => {
  it("shows a useful empty state", async () => {
    getIntakes.mockResolvedValueOnce([]);
    render(<MemoryRouter><IntakeListPage /></MemoryRouter>);

    expect(await screen.findByText("No intakes yet")).toBeVisible();
    expect(screen.getByRole("link", { name: "Create intake" })).toHaveAttribute("href", "/intakes/new");
  });

  it("renders identifying data and a detail link", async () => {
    getIntakes.mockResolvedValueOnce([intake]);
    render(<MemoryRouter><IntakeListPage /></MemoryRouter>);

    expect(await screen.findByText("Permit copilot")).toBeVisible();
    expect(screen.getByText("$1,500 to $15,000")).toBeVisible();
    expect(screen.getByText("2 to 4 months")).toBeVisible();
    expect(screen.getByRole("link", { name: /Permit copilot/ })).toHaveAttribute("href", "/intakes/9");
  });

  it("shows a safe load error", async () => {
    getIntakes.mockRejectedValueOnce(new Error("internal detail"));
    render(<MemoryRouter><IntakeListPage /></MemoryRouter>);

    expect(await screen.findByText("We couldn't load intakes. Please try again.")).toBeVisible();
    expect(screen.queryByText("internal detail")).not.toBeInTheDocument();
  });
});

describe("intake detail AI states", () => {
  it.each([
    ["complete", "A concise project summary."],
    ["pending", "Your request is saved. AI analysis is pending."],
    ["failed", "Your request was saved successfully, but AI analysis failed."],
  ])("renders the %s state", async (status, expectedText) => {
    getIntake.mockResolvedValueOnce({ ...intake, ai_status: status });
    render(
      <MemoryRouter initialEntries={["/intakes/9"]}>
        <Routes><Route path="/intakes/:id" element={<IntakeDetailPage />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(new RegExp(expectedText))).toBeVisible();
    expect(getIntake).toHaveBeenCalledWith("9");
  });

  it("shows exactly three tags and the risk checklist for completed analysis", async () => {
    getIntake.mockResolvedValueOnce(intake);
    render(
      <MemoryRouter initialEntries={["/intakes/9"]}>
        <Routes><Route path="/intakes/:id" element={<IntakeDetailPage />} /></Routes>
      </MemoryRouter>,
    );

    await screen.findByText("A concise project summary. It identifies the desired outcome.");
    const tagList = screen.getByRole("heading", { name: "Tags" }).nextElementSibling;
    const riskList = screen.getByRole("heading", { name: "Risk checklist" }).nextElementSibling;
    expect(within(tagList).getAllByRole("listitem")).toHaveLength(3);
    for (const tag of intake.ai_tags) expect(within(tagList).getByText(tag)).toBeVisible();
    for (const risk of intake.ai_risks) expect(within(riskList).getByText(risk)).toBeVisible();
  });
});
