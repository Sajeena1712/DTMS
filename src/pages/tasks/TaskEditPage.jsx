import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import TaskComposer from "../../components/tasks/TaskComposer";
import { useTasks } from "../../contexts/TaskContext";
import { showApiError } from "../../api/client";

export default function TaskEditPage() {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const { tasks, updateTask } = useTasks();

  const task = useMemo(() => tasks.find((entry) => entry.id === taskId), [tasks, taskId]);

  async function handleUpdate(values) {
    try {
      await updateTask(taskId, values);
      toast.success("Task updated");
      navigate("/tasks");
    } catch (error) {
      showApiError(error, "Failed to update task");
      throw error;
    }
  }

  if (!task) {
    return (
      <div className="task-panel flex min-h-[50vh] items-center justify-center p-6 text-center sm:p-8">
        <div className="max-w-md">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Task not found</p>
          <h1 className="mt-4 font-display text-3xl font-semibold text-slate-950">This task is unavailable</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            It may have been deleted or your task data has not loaded yet.
          </p>
          <button type="button" onClick={() => navigate("/tasks")} className="btn-primary mt-6">
            Back to tasks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="task-panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Edit task</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-950">Refine the active workflow</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          Update the brief, assignment, and status while keeping the live preview aligned with the final delivery card.
        </p>
      </section>

      <TaskComposer
        mode="edit"
        initialValues={task}
        onSubmit={handleUpdate}
        onCancel={() => navigate("/tasks")}
        idleLabel="Save changes"
        savingLabel="Saving..."
      />
    </div>
  );
}
