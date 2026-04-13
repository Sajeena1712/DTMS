import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import MetricCard from "../../components/dashboard/MetricCard";
import { submitFinalSelection } from "../../api/taskApi";
import { showApiError } from "../../api/client";
import { useTasks } from "../../contexts/TaskContext";
import { normalizeTaskStatus } from "../../lib/constants";

function getSelectionLabel(finalSelection, interviewPassed) {
  if (finalSelection?.finalStatus) {
    return String(finalSelection.finalStatus)
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(" ");
  }

  return interviewPassed ? "Selected" : "Pending";
}

export default function FinalSelectionPage() {
  const navigate = useNavigate();
  const { tasks, refetch } = useTasks();
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const approvedTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          normalizeTaskStatus(task.status) === "COMPLETED" || String(task.review?.decision || "").toLowerCase() === "approved",
      ),
    [tasks],
  );

  const latestApprovedTask = approvedTasks[0] || null;
  const screeningResult = latestApprovedTask?.aiEvaluation?.screening || null;
  const interviewResult = latestApprovedTask?.aiEvaluation?.interview || null;
  const finalSelection = latestApprovedTask?.aiEvaluation?.finalSelection || null;
  const interviewPassed = Boolean(interviewResult?.passed);
  const finalStatus = getSelectionLabel(finalSelection, interviewPassed);
  const finalSelectionRecorded = Boolean(finalSelection);
  const finalSelectionLocked = !interviewPassed || finalSelectionRecorded;

  useEffect(() => {
    if (finalSelection) {
      setSubmitted(true);
    }
  }, [finalSelection]);

  async function handleSubmit() {
    if (!latestApprovedTask?.id) {
      toast.error("No approved task is available yet.");
      return;
    }

    if (!interviewPassed) {
      toast.error("Complete the interview pass before final selection.");
      return;
    }

    if (finalSelectionRecorded) {
      toast.success("Final selection is already recorded.");
      return;
    }

    setSaving(true);

    try {
      const result = await submitFinalSelection(latestApprovedTask.id);
      const selection = result?.finalSelection || result?.task?.aiEvaluation?.finalSelection || null;
      setSubmitted(true);
      toast.success(selection?.finalStatus === "selected" ? "Final selection completed" : "Final selection saved");
      await refetch().catch(() => undefined);
    } catch (error) {
      showApiError(error, "Unable to complete final selection");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="task-panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.32em] text-blue-500">Final selection</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-950">Candidate final decision</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          This is the last text-based stage in DTMS. After screening and interview pass, the system records the final
          selection result and sends the decision mail.
        </p>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Screening" value={screeningResult?.passed ? "Passed" : "Pending"} detail="Project evaluation stage." accent={screeningResult?.passed ? "green" : "rose"} />
        <MetricCard label="Interview" value={interviewResult?.passed ? "Passed" : "Pending"} detail="AI interview stage." accent={interviewResult?.passed ? "cyan" : "amber"} />
        <MetricCard label="Final status" value={finalStatus} detail="Recorded selection decision." accent={interviewPassed ? "violet" : "rose"} />
        <MetricCard label="Selected by DTMS" value={submitted || Boolean(finalSelection) ? "Yes" : "Waiting"} detail="Final mail delivery status." accent={submitted || Boolean(finalSelection) ? "green" : "slate"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="task-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Decision</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Final selection status</h2>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || finalSelectionLocked}
              className="rounded-2xl bg-[linear-gradient(90deg,#2563eb_0%,#60a5fa_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving..." : finalSelectionRecorded ? "Final selection recorded" : "Complete final selection"}
            </button>
          </div>

          {finalSelectionLocked ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
              Final selection unlocks after the AI interview is passed.
            </div>
          ) : (
            <div className="mt-6 rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-5">
              <p className="text-sm font-semibold text-emerald-800">Interview passed</p>
              <p className="mt-2 text-sm leading-7 text-emerald-900">
                DTMS has recorded the interview result. Use this step to confirm the final selection and trigger the mail.
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.24em] text-emerald-700">
                Screening score: {Number(screeningResult?.totalScore) || 0}/100 | Interview score: {Number(interviewResult?.interviewScore) || 0}/100
              </p>
            </div>
          )}

          {finalSelectionRecorded ? (
            <div className="mt-6 rounded-[24px] border border-blue-100 bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-blue-500">Saved result</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Final selection has already been recorded for this task.
              </p>
            </div>
          ) : null}
        </article>

        <article className="task-panel p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Result summary</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">Review before decision mail</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            DTMS keeps the final step simple: once the interview passes, the system records the selection and notifies
            the candidate.
          </p>

          <div className="mt-6 grid gap-4">
            <MetricCard
              label="Task"
              value={latestApprovedTask?.title || "No task"}
              detail="Latest approved submission."
              accent="cyan"
            />
            <MetricCard
              label="Interview result"
              value={`${Number(interviewResult?.interviewScore) || 0}/100`}
              detail={interviewPassed ? "Passed the AI interview." : "Waiting for interview pass."}
              accent={interviewPassed ? "green" : "amber"}
            />
            <MetricCard
              label="Email"
              value={finalSelection?.notifiedAt ? "Sent" : "Pending"}
              detail="Final selection notification."
              accent={finalSelection?.notifiedAt ? "green" : "slate"}
            />
            <MetricCard
              label="Selection"
              value={finalStatus}
              detail={submitted || Boolean(finalSelection) ? "Result recorded." : "Ready to record."}
              accent={submitted || Boolean(finalSelection) ? "violet" : "amber"}
            />
          </div>

          <div className="mt-6 rounded-[24px] border border-blue-100 bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-blue-500">Next action</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {finalSelection
                ? "Final selection is complete. You can return to the workflow if needed."
                : "Record the final selection to finish the candidate journey."}
            </p>
            <button
              type="button"
              onClick={() => navigate("/dtms-workflow")}
              className="mt-4 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              View workflow
            </button>
          </div>
        </article>
      </section>

      {latestApprovedTask ? (
        <section className="task-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Candidate</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Latest approved submission</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/ai-interview")}
              className="rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              Open interview
            </button>
          </div>

          <div className="mt-5 rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-5">
            <p className="text-sm font-semibold text-emerald-800">{latestApprovedTask.title}</p>
            <p className="mt-2 text-sm leading-7 text-emerald-900">
              The final selection stage records the outcome after the AI interview pass.
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.24em] text-emerald-700">
              Interview status: {interviewPassed ? "Passed" : "Pending"}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
