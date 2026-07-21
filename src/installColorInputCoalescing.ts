const COLOR_EVENT_DELAY_MS = 120;
const COALESCED_EVENT_FLAG = "__glyftCoalescedColorEvent";

type PendingColorEvent = {
  timer: number;
  eventType: "input" | "change";
};

type CoalescedEvent = Event & {
  [COALESCED_EVENT_FLAG]?: boolean;
};

const pendingEvents = new WeakMap<HTMLInputElement, PendingColorEvent>();

function isColorInput(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement && target.type === "color";
}

function dispatchCoalescedEvent(
  input: HTMLInputElement,
  eventType: "input" | "change",
) {
  const event = new Event(eventType, {
    bubbles: true,
    composed: true,
  }) as CoalescedEvent;

  Object.defineProperty(event, COALESCED_EVENT_FLAG, {
    value: true,
  });

  input.dispatchEvent(event);
}

function flushPendingEvent(input: HTMLInputElement) {
  const pending = pendingEvents.get(input);
  if (!pending) return;

  window.clearTimeout(pending.timer);
  pendingEvents.delete(input);
  dispatchCoalescedEvent(input, pending.eventType);
}

function handleColorEvent(event: Event) {
  const coalescedEvent = event as CoalescedEvent;
  if (coalescedEvent[COALESCED_EVENT_FLAG]) return;
  if (!isColorInput(event.target)) return;

  event.stopImmediatePropagation();

  const input = event.target;
  const existing = pendingEvents.get(input);
  if (existing) window.clearTimeout(existing.timer);

  const eventType = event.type === "change" ? "change" : "input";
  const timer = window.setTimeout(() => {
    pendingEvents.delete(input);
    dispatchCoalescedEvent(input, eventType);
  }, COLOR_EVENT_DELAY_MS);

  pendingEvents.set(input, { timer, eventType });
}

function handleColorBlur(event: FocusEvent) {
  if (!isColorInput(event.target)) return;
  flushPendingEvent(event.target);
}

export function installColorInputCoalescing() {
  document.addEventListener("input", handleColorEvent, true);
  document.addEventListener("change", handleColorEvent, true);
  document.addEventListener("blur", handleColorBlur, true);

  return () => {
    document.removeEventListener("input", handleColorEvent, true);
    document.removeEventListener("change", handleColorEvent, true);
    document.removeEventListener("blur", handleColorBlur, true);
  };
}
