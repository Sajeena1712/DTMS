import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import TaskComposer from "../../components/tasks/TaskComposer";
import { useTasks } from "../../contexts/TaskContext";
import { showApiError } from "../../api/client";

export default function TaskCreatePage() {
  const navigate = useNavigate();
  const { createTask } = useTasks();

  async function handleCreate(values) {
    try {
      const result = await createTask(values);
      toast.success(
        result?.count && result.count > 1
          ? `Task assigned to ${result.count} students`
          : "Task created",
      );
      navigate("/tasks");
    } catch (error) {
      showApiError(error, "Failed to create task");
      throw error;
    }
  }

  return (
    <div className="space-y-4">
      <section className="task-panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Create task</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-950">Premium task composer</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          Build a production-ready task with a clean floating-label form on the left and a live preview panel on the right.
        </p>
      </section>

      <TaskComposer
        onSubmit={handleCreate}
        onCancel={() => navigate("/tasks")}
        idleLabel="Publish task"
        savingLabel="Publishing..."
      />
    </div>
  );
}
