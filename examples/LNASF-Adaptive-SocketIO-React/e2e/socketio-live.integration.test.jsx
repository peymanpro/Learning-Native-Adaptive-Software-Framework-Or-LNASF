import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "../src/App.jsx";

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

afterEach(() => cleanup());

test.skipIf(!process.env.LIVE_SOCKETIO_URL)(
  "two React clients join, exchange typing events, and deliver a chat message through the live Express Socket.IO backend",
  async () => {
    const first = render(<App />);
    const second = render(<App />);
    const firstUi = within(first.container);
    const secondUi = within(second.container);

    await waitFor(() => {
      expect(firstUi.getByRole("button", { name: "Join Chat" })).toBeEnabled();
      expect(secondUi.getByRole("button", { name: "Join Chat" })).toBeEnabled();
    });

    fireEvent.change(firstUi.getByPlaceholderText("please enter your name"), {
      target: { value: "AdaIntegration" },
    });
    fireEvent.change(secondUi.getByPlaceholderText("please enter your name"), {
      target: { value: "BenIntegration" },
    });

    fireEvent.click(firstUi.getByRole("button", { name: "Join Chat" }));
    fireEvent.click(secondUi.getByRole("button", { name: "Join Chat" }));

    await waitFor(() => {
      expect(firstUi.getByPlaceholderText("پیام خود را بنویسید...")).toBeTruthy();
      expect(secondUi.getByPlaceholderText("پیام خود را بنویسید...")).toBeTruthy();
    });

    fireEvent.change(firstUi.getByPlaceholderText("پیام خود را بنویسید..."), {
      target: { value: "Live Socket.IO integration message" },
    });

    await waitFor(() => {
      expect(second.container.querySelector(".typing-indicator")?.textContent)
        .toContain("AdaIntegration is typing");
    });

    fireEvent.click(firstUi.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(first.container.textContent).toContain("Live Socket.IO integration message");
      expect(second.container.textContent).toContain("Live Socket.IO integration message");
    });
  },
);
