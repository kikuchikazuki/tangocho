import type { Progress } from "../domain/types";
import { nextProgress } from "../domain/progress";
export default function ProgressCycle({
  value,
  onChange,
}: {
  value: Progress;
  onChange: (v: Progress) => void;
}) {
  return (
    <button
      className="progress"
      aria-label={`進捗${value}週目`}
      onClick={() => onChange(nextProgress(value))}
    >
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= value ? "done" : ""}>
          ●
        </span>
      ))}
    </button>
  );
}
