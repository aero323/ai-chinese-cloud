import { create } from "zustand";
import { platform } from "../lib/platform";
import type { PlatformState, Role, StoreResult } from "../domain/types";

interface ToastState {
  id: number;
  tone: "success" | "error" | "info";
  message: string;
}

interface PlatformStore {
  state: PlatformState;
  toast: ToastState | null;
  refresh: (state?: PlatformState) => void;
  run: <T>(operation: () => StoreResult<T>, successMessage?: string) => StoreResult<T>;
  showToast: (message: string, tone?: ToastState["tone"]) => void;
  clearToast: () => void;
  switchUser: (userId: string) => StoreResult<unknown>;
  reset: () => void;
}

const initialState = platform.getState();

export const usePlatformStore = create<PlatformStore>((set, get) => ({
  state: initialState,
  toast: null,
  refresh: (nextState) => set({ state: nextState ?? platform.getState() }),
  run: (operation, successMessage) => {
    const result = operation();
    get().refresh();
    if (!result.ok) {
      get().showToast(result.error || "操作未完成", "error");
    } else if (successMessage) {
      get().showToast(successMessage, "success");
    }
    return result;
  },
  showToast: (message, tone = "info") => set({ toast: { id: Date.now(), tone, message } }),
  clearToast: () => set({ toast: null }),
  switchUser: (userId) => {
    const result = platform.setCurrentUser(userId);
    get().refresh();
    return result;
  },
  reset: () => {
    platform.resetDemo();
    get().refresh();
    get().showToast("演示数据已重置", "success");
  }
}));

export function roleHome(role: Role) {
  if (role === "student") return "/student";
  if (role === "teacher") return "/teacher";
  return "/operator";
}
