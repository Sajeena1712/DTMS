import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import MetricCard from "../../components/dashboard/MetricCard";
import { submitInterviewRound } from "../../api/taskApi";
import { showApiError } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { useTasks } from "../../contexts/TaskContext";
import { normalizeTaskStatus } from "../../lib/constants";

const strengthOptions = [
  "Problem solving",
  "Communication",
  "Documentation",
  "Consistency",
  "Ownership",
  "Teamwork",
];

function buildInterviewQuestions(task) {
  const title = task?.title || "the project";
  const description = task?.description || "the submission";
  return [
    `Walk us through how you handled ${title}.`,
    `What was the hardest part of ${description} and how did you solve it?`,
    `How do you make sure your work stays clear for reviewers and teammates?`,
    `If we gave you another day on ${title}, what would you improve first?`,
  ];
}

const interviewCapabilities = [
  {
    title: "Text interview",
    points: ["4 written prompts", "No video required", "Dynamic based on task", "Saved to backend"],
  },
  {
    title: "AI scoring",
    points: ["Answer depth", "Reflection score", "Strength bonus", "Pass / fail result"],
  },
  {
    title: "Next step unlock",
    points: ["Screening pass", "Interview pass", "Final selection", "Auto email flow"],
  },
];

export default function AIInterviewPage() {
  const { user } = useAuth();
  const { tasks, refetch } = useTasks();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState(["", "", "", ""]);
  const [reflection, setReflection] = useState("");
  const [strengths, setStrengths] = useState([]);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [interviewScore, setInterviewScore] = useState(0);
  const [interviewPassed, setInterviewPassed] = useState(false);

  const approvedTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          normalizeTaskStatus(task.status) === "COMPLETED" || String(task.review?.decision || "").toLowerCase() === "approved",
      ),
    [tasks],
  );

  const latestApprovedTask = approvedTasks[0] || null;
  const screeningPassed = Boolean(latestApprovedTask?.aiEvaluation?.screening?.passed);
  const interviewResult = latestApprovedTask?.aiEvaluation?.interview || null;
  const questions = useMemo(() => buildInterviewQuestions(latestApprovedTask), [latestApprovedTask]);
  const finalSelectionReady = Boolean(interviewResult?.passed || interviewPassed || latestApprovedTask?.aiEvaluation?.finalSelection);

  useEffect(() => {
    if (interviewResult) {
      setSubmitted(true);
      setInterviewScore(Number(interviewResult.interviewScore) || 0);
      setInterviewPassed(Boolean(interviewResult.passed));
    }
  }, [interviewResult]);

  function toggleStrength(item) {
    setStrengths((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  }

  async function handleSubmit() {
    if (!latestApprovedTask?.id) {
      toast.error("No approved task is available yet.");
      return;
    }

    setSaving(true);

    try {
      const result = await submitInterviewRound(latestApprovedTask.id, {
        answers,
        reflections: reflection,
        strengths,
      });

      const interview = result?.interview || result?.task?.aiEvaluation?.interview || null;
      const scoreFromServer = Number(interview?.interviewScore);
      setSubmitted(true);
      setInterviewScore(Number.isFinite(scoreFromServer) ? scoreFromServer : 0);
      setInterviewPassed(Boolean(interview?.passed));
      toast.success(interview?.passed ? "Interview passed. Final selection unlocked." : "Interview saved");
      await refetch().catch(() => undefined);
      if (interview?.passed) {
        navigate("/final-selection");
      }
    } catch (error) {
      showApiError(error, "Unable to save AI interview");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="task-panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.32em] text-blue-500">AI interview</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-950">What DTMS AI interview can do</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          DTMS runs a text-only interview stage, scores the answers, and unlocks the next round when the candidate passes.
        </p>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Mode" value="Text only" detail="No chat video or webcam." accent="cyan" />
        <MetricCard label="Scoring" value="0-100" detail="Answers are scored in backend." accent="green" />
        <MetricCard label="Unlock" value={finalSelectionReady ? "Final stage" : "Pending"} detail="Pass to move forward." accent="violet" />
        <MetricCard label="Candidate" value={user?.name || "User"} detail="Logged-in applicant." accent="indigo" />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {interviewCapabilities.map((block, index) => (
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

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="task-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Interview</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Start the text interview</h2>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !screeningPassed}
              className="rounded-2xl bg-[linear-gradient(90deg,#2563eb_0%,#60a5fa_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving..." : "Submit interview"}
            </button>
          </div>

          {!screeningPassed ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
              You need a passed screening round before the AI interview unlocks.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {questions.map((question, index) => (
                <div key={question} className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    Interview {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-slate-950">{question}</h3>
                  <textarea
                    value={answers[index]}
                    onChange={(event) => {
                      const next = [...answers];
                      next[index] = event.target.value;
                      setAnswers(next);
                    }}
                    placeholder="Write your answer here..."
                    className="mt-4 min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-blue-300"
                  />
                </div>
              ))}

              <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Reflection</p>
                <textarea
                  value={reflection}
                  onChange={(event) => setReflection(event.target.value)}
                  placeholder="Short reflection about what you learned and how you work with a team."
                  className="mt-4 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-blue-300"
                />
              </div>

              <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Strengths</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {strengthOptions.map((item) => {
                    const active = strengths.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleStrength(item)}
                        className={[
                          "rounded-full px-4 py-2 text-sm font-semibold transition",
                          active
                            ? "bg-[linear-gradient(90deg,#2563eb_0%,#60a5fa_100%)] text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50",
                        ].join(" ")}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </article>

        <article className="task-panel p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Score preview</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">Simple AI scoring</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            DTMS scores answer depth, reflection, and strengths, then unlocks the final stage when you pass.
          </p>

          <div className="mt-6 grid gap-4">
            <MetricCard
              label="Answer depth"
              value={`${Math.min(25, answers.reduce((sum, answer) => sum + Math.min(25, Math.round(String(answer || "").split(/\s+/).filter(Boolean).length / 3)), 0))}/25`}
              detail="Longer, structured answers score better."
              accent="cyan"
            />
            <MetricCard
              label="Reflection"
              value={`${Math.min(25, Math.round(String(reflection || "").split(/\s+/).filter(Boolean).length / 4))}/25`}
              detail="Short self-review and learning mindset."
              accent="violet"
            />
            <MetricCard
              label="Strength bonus"
              value={`${Math.min(10, strengths.length * 2)}/10`}
              detail="Selected strengths improve the score."
              accent="green"
            />
            <MetricCard
              label="Interview total"
              value={`${submitted ? interviewScore : "Preview"}/100`}
              detail={submitted ? "Saved result." : "Live estimate before submit."}
              accent={submitted && interviewPassed ? "green" : "amber"}
            />
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Pass rule</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Interview pass threshold is `70/100`. Passing this step unlocks the final selection stage.
            </p>
          </div>

          {submitted ? (
            <div
              className={[
                "mt-6 rounded-[24px] p-5",
                interviewPassed ? "border border-emerald-200 bg-emerald-50" : "border border-rose-200 bg-rose-50",
              ].join(" ")}
            >
              <p className={`text-xs uppercase tracking-[0.24em] ${interviewPassed ? "text-emerald-600" : "text-rose-600"}`}>
                Interview result
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{interviewScore}/100</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {interviewPassed
                  ? "Passed. Final selection is now unlocked."
                  : "Not passed yet. Improve your interview answers and try again if allowed."}
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
              Submit the interview to get a score and next-step result.
            </div>
          )}

          <div className="mt-6 rounded-[24px] border border-blue-100 bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-blue-500">Next step</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {finalSelectionReady
                ? "Interview complete. Final selection stage is ready."
                : "Finish the interview to unlock the final selection stage."}
            </p>
            <button
              type="button"
              onClick={() => navigate(finalSelectionReady ? "/final-selection" : "/dtms-workflow")}
              className="mt-4 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              {finalSelectionReady ? "Open final selection" : "View workflow"}
            </button>
          </div>
        </article>
      </section>

      {latestApprovedTask ? (
        <section className="task-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Interview source</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Latest approved submission</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/tasks")}
              className="rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              Open tasks
            </button>
          </div>

          <div className="mt-5 rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-5">
            <p className="text-sm font-semibold text-emerald-800">{latestApprovedTask.title}</p>
            <p className="mt-2 text-sm leading-7 text-emerald-900">
              This task passed evaluation and screening, so the AI interview round is available.
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.24em] text-emerald-700">
              Screening status: {screeningPassed ? "Passed" : "Pending"}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
