import { describe, expect, it } from "vitest";

import { formatBudgetRange } from "./formatBudget.js";
import { formatTimelineRange } from "./formatTimeline.js";

describe.each([
  ["budget", () => formatBudgetRange(1500, 15000), "$1,500 to $15,000"],
  ["timeline", () => formatTimelineRange(2, 6, "months"), "2 to 6 months"],
])("%s formatting", (_name, format, expected) => {
  it("formats a complete range", () => {
    expect(format()).toBe(expected);
  });
});

it.each([
  ["budget", () => formatBudgetRange(null, 100)],
  ["timeline min", () => formatTimelineRange(null, 2, "weeks")],
  ["timeline unit", () => formatTimelineRange(1, 2, null)],
])("returns a fallback for an incomplete %s range", (_name, format) => {
  expect(format()).toBe("Not provided");
});
