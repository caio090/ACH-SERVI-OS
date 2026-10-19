import { describe, expect, it } from "vitest";
import {
  getRequestStatusTone,
  getRequestTimeline,
  isRequestTerminal,
} from "@/lib/request-status";

describe("service request status mapping", () => {
  it("separates active and finished requests", () => {
    expect(isRequestTerminal("open")).toBe(false);
    expect(isRequestTerminal("in_service")).toBe(false);
    expect(isRequestTerminal("completed")).toBe(true);
    expect(isRequestTerminal("cancelled")).toBe(true);
    expect(isRequestTerminal("expired")).toBe(true);
  });

  it("marks the real current status and leaves future events disabled", () => {
    const timeline = getRequestTimeline("scheduled");
    expect(timeline.find((item) => item.status === "scheduled")?.state).toBe("current");
    expect(timeline.find((item) => item.status === "open")?.state).toBe("complete");
    expect(timeline.find((item) => item.status === "in_service")?.state).toBe("upcoming");
  });

  it("uses an explicit terminal event for cancelled requests", () => {
    const timeline = getRequestTimeline("cancelled");
    expect(timeline.at(-1)).toMatchObject({ status: "cancelled", state: "current" });
  });

  it("maps tones without introducing new database statuses", () => {
    expect(getRequestStatusTone("open")).toBe("brand");
    expect(getRequestStatusTone("accepted")).toBe("warning");
    expect(getRequestStatusTone("completed")).toBe("neutral");
  });
});
