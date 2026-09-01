import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ApiError, createIntake } from "../api/intakes.js";
import CreateIntakePage from "./CreateIntakePage.jsx";

vi.mock("../api/intakes.js", async (importOriginal) => ({
  ...(await importOriginal()),
  createIntake: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/intakes/new"]}>
      <Routes>
        <Route path="/intakes/new" element={<CreateIntakePage />} />
        <Route path="/intakes/:id" element={<p>Detail destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillValidForm() {
  const values = {
    Title: "Permit review copilot",
    Description: "Review construction permits and building requirements.",
    "Budget min (USD)": "1500",
    "Budget max (USD)": "15000",
    "Timeline min": "2",
    "Timeline max": "4",
    Industry: "Construction",
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

describe("create intake validation", () => {
  it.each([
    ["Budget", "Budget min (USD)", "100", "Budget max (USD)", "50", "Must be greater than or equal to Budget min."],
    ["Timeline", "Timeline min", "8", "Timeline max", "3", "Must be greater than or equal to Timeline min."],
  ])("rejects an invalid %s range", async (_name, minLabel, min, maxLabel, max, message) => {
    renderPage();
    fillValidForm();
    fireEvent.change(screen.getByLabelText(minLabel), { target: { value: min } });
    fireEvent.change(screen.getByLabelText(maxLabel), { target: { value: max } });

    await userEvent.click(screen.getByRole("button", { name: "Create intake" }));

    expect(screen.getByText(message)).toBeVisible();
    expect(createIntake).not.toHaveBeenCalled();
  });

  it("maps backend validation to the relevant field", async () => {
    createIntake.mockRejectedValueOnce(new ApiError("Invalid", 422, [
      { loc: ["body", "industry"], type: "missing", msg: "Field required" },
    ]));
    renderPage();
    fillValidForm();

    await userEvent.click(screen.getByRole("button", { name: "Create intake" }));

    expect(await screen.findByText("Review the highlighted fields")).toBeVisible();
    expect(screen.getByRole("textbox", { name: /Industry/ })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});

it("shows progress, submits numeric ranges, and navigates on success", async () => {
  let resolveCreate;
  createIntake.mockReturnValueOnce(new Promise((resolve) => { resolveCreate = resolve; }));
  renderPage();
  fillValidForm();

  await userEvent.click(screen.getByRole("button", { name: "Create intake" }));

  expect(screen.getByRole("button", { name: "Saving and analyzing intake..." })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("Saving intake and running AI analysis...");
  expect(createIntake).toHaveBeenCalledWith(expect.objectContaining({
    budget_min: 1500,
    budget_max: 15000,
    timeline_min: 2,
    timeline_max: 4,
  }));

  resolveCreate({ id: 27 });
  expect(await screen.findByText("Detail destination")).toBeVisible();
});

it("explains when the intake was saved but AI analysis failed", async () => {
  createIntake.mockRejectedValueOnce(
    new ApiError("Intake 31 was saved, but AI analysis failed.", 502),
  );
  renderPage();
  fillValidForm();

  await userEvent.click(screen.getByRole("button", { name: "Create intake" }));

  expect(await screen.findByText("Intake saved, AI analysis failed")).toBeVisible();
  expect(screen.getByRole("link", { name: "Open the saved intake" })).toHaveAttribute(
    "href",
    "/intakes/31",
  );
  await waitFor(() => expect(screen.getByRole("button", { name: "Create intake" })).toBeEnabled());
});
