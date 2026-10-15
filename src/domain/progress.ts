import type { Progress } from "./types";
export const nextProgress = (value: Progress): Progress =>
  value === 3 ? 0 : ((value + 1) as Progress);
