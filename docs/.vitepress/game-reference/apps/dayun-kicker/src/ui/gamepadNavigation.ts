import type { MenuDirection } from "../game/gamepad";

const SELECTOR = "button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex='0']";
function visible(element: HTMLElement) {
  return element.getClientRects().length > 0 && !element.closest(".hidden,[aria-hidden='true'],[inert]")
    && getComputedStyle(element).visibility !== "hidden" && element.getAttribute("aria-disabled") !== "true";
}
function menuScope(): HTMLElement {
  const select = openSelect();
  if (select) return select;
  const modals = [...document.querySelectorAll<HTMLElement>("[role='dialog'][aria-modal='true']")].filter(visible);
  if (modals.length) return modals[modals.length - 1]!;
  const panels = [...document.querySelectorAll<HTMLElement>(".overlay,.pause-scrim,.ride-welcome")].filter(visible);
  return panels[panels.length - 1] ?? document.body;
}
function openSelect() {
  return [...document.querySelectorAll<HTMLElement>("[data-game-select-content]")].filter(visible).at(-1);
}
function selectKey(select: HTMLElement, key: string) {
  const active = document.activeElement instanceof HTMLElement && select.contains(document.activeElement) ? document.activeElement : select;
  active.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}
function controls(scope: HTMLElement) {
  // Reka tablists have their own tab stop. Focusing the group restores the
  // selected tab, so spatial navigation must target its individual buttons.
  // Pointer hotspots can be clipped by a pan/zoom viewport; their accessible
  // list controls provide menu navigation without focusing offscreen pixels.
  const list = [...scope.querySelectorAll<HTMLElement>(SELECTOR)].filter(element => visible(element)
    && !element.hasAttribute("data-gamepad-skip") && element.getAttribute("role") !== "tablist");
  // The race settings button lives in the HUD, outside the ready / pause overlay.
  const settings = document.getElementById("settings-button");
  if (!scope.matches("[aria-modal='true']") && settings && visible(settings) && !list.includes(settings)) list.push(settings);
  return list;
}
function current(scope: HTMLElement, list: HTMLElement[]) {
  return list.includes(document.activeElement as HTMLElement) ? document.activeElement as HTMLElement
    : list.find(element => ["start-button", "resume-button", "district-start"].includes(element.id)) ?? list[0];
}

/** DOM menus use native focus/click/change; never synthesize driving keys. */
export function navigateGamepadMenu(direction: MenuDirection, panel?: HTMLElement | null) {
  const select = openSelect();
  if (select) { selectKey(select, direction === "down" || direction === "right" ? "ArrowDown" : "ArrowUp"); return; }
  const scope = panel && visible(panel) ? panel : menuScope(), list = controls(scope), active = current(scope, list);
  if (!active) return;
  if (direction === "left" || direction === "right") {
    const delta = direction === "right" ? 1 : -1;
    if (active.matches("[data-game-select]")) {
      active.dispatchEvent(new CustomEvent("dayun-select-step", { detail: delta }));
      return;
    }
    if (active instanceof HTMLInputElement && active.type === "range") {
      delta > 0 ? active.stepUp() : active.stepDown();
      active.dispatchEvent(new Event("input", { bubbles: true }));
      active.dispatchEvent(new Event("change", { bubbles: true }));
      active.focus(); return;
    }
    if (active instanceof HTMLSelectElement) {
      const options = [...active.options].filter(o => !o.disabled);
      const index = options.findIndex(o => o.index === active.selectedIndex);
      const next = options[Math.max(0, Math.min(options.length - 1, index + delta))];
      if (next) { active.selectedIndex = next.index; active.dispatchEvent(new Event("change", { bubbles: true })); }
      active.focus(); return;
    }
  }
  const rect = active.getBoundingClientRect();
  const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
  const horizontal = direction === "left" || direction === "right";
  const sign = direction === "right" || direction === "down" ? 1 : -1;
  const next = list.filter(el => el !== active).map(el => {
    const r = el.getBoundingClientRect(), dx = r.x + r.width / 2 - x, dy = r.y + r.height / 2 - y;
    return { el, primary: sign * (horizontal ? dx : dy), cross: Math.abs(horizontal ? dy : dx) };
  }).filter(p => p.primary > 4).sort((a, b) => a.primary + a.cross * 3 - b.primary - b.cross * 3)[0]?.el
    ?? list[(list.indexOf(active) + sign + list.length) % list.length];
  next?.focus(); next?.scrollIntoView({ block: "nearest", inline: "nearest" });
}
export function confirmGamepadMenu(panel?: HTMLElement | null) {
  const select = openSelect();
  if (select) { selectKey(select, "Enter"); return; }
  const scope = panel && visible(panel) ? panel : menuScope(), active = current(scope, controls(scope));
  active?.focus();
  if (active?.matches("[data-game-select]")) active.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  else active?.click();
}
export function cancelGamepadMenu() {
  const scope = menuScope();
  const active = scope.contains(document.activeElement) ? document.activeElement : scope;
  active?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
}

export function switchGamepadSettingsTab(delta: number) {
  const tabs = [...menuScope().querySelectorAll<HTMLElement>("[data-settings-tabs] [role='tab']")].filter(visible);
  if (!tabs.length) return false;
  const index = tabs.findIndex(tab => tab.getAttribute("aria-selected") === "true");
  tabs[(Math.max(0, index) + delta + tabs.length) % tabs.length]?.focus();
  return true;
}
