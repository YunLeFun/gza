import { COURIER_CAREER_STORAGE_KEY, DELIVERY_RECORD_STORAGE_KEY } from "../config/storage";

export interface CourierCareer { registered: boolean; completedAtRegistration: number }
export interface CourierProgress { registered: boolean; deliveries: number }
type CareerStorage = Pick<Storage, "getItem" | "setItem">;
const validCount = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function parseCourierCareer(raw: string | null): CourierCareer {
  try {
    const saved = JSON.parse(raw ?? "null");
    if (saved?.version === 1 && saved.registered === true && validCount(saved.completedAtRegistration)) {
      return { registered: true, completedAtRegistration: saved.completedAtRegistration };
    }
  } catch { /* Invalid saves keep the career unregistered. */ }
  return { registered: false, completedAtRegistration: 0 };
}

export function courierProgress(career: CourierCareer, completed: number): CourierProgress {
  return { registered: career.registered, deliveries: career.registered && validCount(completed)
    ? Math.max(0, completed - career.completedAtRegistration) : 0 };
}

export function readCourierCareer(storage: Pick<Storage, "getItem">): CourierCareer {
  try { return parseCourierCareer(storage.getItem(COURIER_CAREER_STORAGE_KEY)); }
  catch { return parseCourierCareer(null); }
}

export function readCourierProgress(storage: Pick<Storage, "getItem">): CourierProgress {
  let completed = 0;
  try {
    const saved = JSON.parse(storage.getItem(DELIVERY_RECORD_STORAGE_KEY) ?? "null");
    if (saved?.version === 1 && validCount(saved.completed)) completed = saved.completed;
  } catch { /* Keep a usable session without storage. */ }
  return courierProgress(readCourierCareer(storage), completed);
}

export function registerCourierCareer(storage: CareerStorage, completed: number): CourierCareer {
  const current = readCourierCareer(storage);
  if (current.registered) return current;
  const career = { registered: true, completedAtRegistration: validCount(completed) ? completed : 0 };
  try { storage.setItem(COURIER_CAREER_STORAGE_KEY, JSON.stringify({ version: 1, ...career })); }
  catch { /* The caller retains the registered career for this session. */ }
  return career;
}

export function registerStoredCourierCareer(storage: CareerStorage): CourierCareer {
  let completed = 0;
  try {
    const saved = JSON.parse(storage.getItem(DELIVERY_RECORD_STORAGE_KEY) ?? "null");
    if (saved?.version === 1 && validCount(saved.completed)) completed = saved.completed;
  } catch { /* Start with a fresh delivery count. */ }
  return registerCourierCareer(storage, completed);
}
