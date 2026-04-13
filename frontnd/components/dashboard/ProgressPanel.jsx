import { formatPercent } from "../../lib/utils";

export default function ProgressPanel({ title, body, value }) {
  return (
    <div className="glass-panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
          {formatPercent(value)}
        </span>
      </div>
      <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#111827_0%,#6d7cff_50%,#70e1d0_100%)]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
