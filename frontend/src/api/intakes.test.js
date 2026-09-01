import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, createIntake, getIntake, getIntakes } from "./intakes.js";

afterEach(() => vi.unstubAllGlobals());

it.each([
  ["getIntakes", () => getIntakes(), "/api/intakes", undefined],
  ["getIntake", () => getIntake(12), "/api/intakes/12", undefined],
  ["createIntake", () => createIntake({ title: "Build" }), "/api/intakes", "POST"],
])("%s sends the expected request", async (_name, call, path, method) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ id: 12 }),
  });
  vi.stubGlobal("fetch", fetchMock);

  await expect(call()).resolves.toEqual({ id: 12 });
  expect(fetchMock).toHaveBeenCalledWith(
    `http://localhost:8000${path}`,
    expect.objectContaining(method ? { method } : {}),
  );
});

it("preserves backend validation details", async () => {
  const details = [{ loc: ["body", "title"], type: "missing", msg: "Required" }];
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false,
    status: 422,
    json: vi.fn().mockResolvedValue({ detail: details }),
  }));

  await expect(createIntake({})).rejects.toMatchObject({
    name: "ApiError",
    status: 422,
    details,
  });
});

it("returns a safe message when the server cannot be reached", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network detail")));

  await expect(getIntakes()).rejects.toEqual(
    new ApiError("Unable to reach the server. Please try again.", 0),
  );
});
