import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import MetricCard from "../../components/dashboard/MetricCard";

const capabilities = [
  {
    title: "Project Evaluation",
    points: ["GitHub analysis", "PDF / PPT / DOC review", "0-100 score", "AI feedback"],
  },
  {
    title: "Screening Round",
    points: ["MCQ questions", "Coding questions", "Skill scoring", "Auto shortlisting"],
  },
  {
    title: "Interview Round",
    points: ["Text interview", "Dynamic questions", "Role-based flow", "Response analysis"],
  },
  {
    title: "Final Actions",
    points: ["Auto email", "Deadline checks", "Admin verify", "Next round unlock"],
  },
];

export default function DTMSWorkflowPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="task-panel overflow-hidden p-6 sm:p-8"
      >
        <p className="text-xs uppercase tracking-[0.32em] text-blue-500">DTMS workflow</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <h1 className="font-display text-4xl font-semibold text-slate-950 sm:text-5xl">What DTMS can do with Hugging Face</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              This page keeps it simple. DTMS uses the Hugging Face API in the backend for AI scoring, feedback, and
              round-based hiring automation.
            </p>
          </div>

          <div className="rounded-[28px] border border-blue-100 bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Hugging Face</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">API key stays in backend env</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Keep the token in `backend/.env` as `HF_TOKEN`. The UI only shows the available features.
            </p>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {capabilities.map((block, index) => (
          <motion.article
            key={block.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="task-panel p-5"
          >
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">{String(index + 1).padStart(2, "0")}</p>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">{block.title}</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {block.points.map((point) => (
                <li key={point} className="rounded-2xl bg-slate-50 px-3 py-2">
                  {point}
                </li>
              ))}
            </ul>
          </motion.article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <MetricCard label="AI scoring" value="0-100" detail="Project evaluation and interview scoring." accent="cyan" />
        <MetricCard label="Automation" value="Enabled" detail="Unlocks emails and next round flow." accent="green" />
      </section>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="task-panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Next step</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Open the task area</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate("/tasks")}
            className="rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
          >
            Open tasks
          </button>
        </div>
      </motion.section>
    </div>
  );
}
