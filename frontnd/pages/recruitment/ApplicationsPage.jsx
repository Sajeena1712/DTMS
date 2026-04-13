import { useState } from 'react';
import { useApplications } from '../../contexts/ApplicationsContext';
import { toast } from 'react-hot-toast';
import ApplicationCard from '../../components/recruitment/ApplicationCard';
import { motion } from 'framer-motion';
import MetricCard from '../../components/dashboard/MetricCard';

export default function ApplicationsPage() {
  const { applications, loading, createApplication, deleteApplication, updateApplication } = useApplications();
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    role: '',
    salary: '',
    location: '',
    status: 'Applied',
    date: new Date().toISOString().split('T')[0],
    image: 'https://source.unsplash.com/featured/?corporate,office',
  });

  const total = applications.length;
  const byStatus = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  const handleEdit = (app) => {
    setFormData(app);
    setEditingId(app.id);
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this application?')) {
      deleteApplication(id);
      toast.success('Application deleted');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateApplication(editingId, formData);
        toast.success('Application updated');
      } else {
        await createApplication(formData);
        toast.success('Application created');
      }
      setModalOpen(false);
      setEditingId(null);
      setFormData({ company: '', role: '', salary: '', location: '', status: 'Applied', date: new Date().toISOString().split('T')[0], image: '' });
    } catch (error) {
      toast.error('Error saving application');
    }
  };

  const statusKeys = Object.keys(byStatus);

  if (loading) {
    return <div className="glass-panel p-12 text-center">Loading applications...</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <section className="glass-panel p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Recruitment Pipeline</p>
            <h1 className="mt-2 text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {total} Applications
            </h1>
          </div>
          <motion.button
            onClick={() => {
              setEditingId(null);
              setFormData({ company: '', role: '', salary: '', location: '', status: 'Applied', date: new Date().toISOString().split('T')[0], image: '' });
              setModalOpen(true);
            }}
            className="btn-primary px-8"
          >
            + New Application
          </motion.button>
        </div>
      </section>

      {total === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-16 text-center"
        >
          <div className="mx-auto h-24 w-24 rounded-3xl bg-gradient-to-br from-slate-200 to-slate-300 p-6">
            <svg className="h-12 w-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="mt-8 text-2xl font-bold text-slate-900">No applications yet</h2>
          <p className="mt-2 text-slate-600">Track your job applications and stay organized.</p>
        </motion.div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {statusKeys.map((status) => (
              <MetricCard
                key={status}
                label={status}
                value={byStatus[status]}
                detail={`${Math.round((byStatus[status] / total) * 100)}% of pipeline`}
                accent="indigo"
              />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onEdit={() => handleEdit(application)}
                onDelete={() => handleDelete(application.id)}
              />
            ))}
          </section>
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                {editingId ? 'Edit Application' : 'New Application'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Company"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
                <input
                  type="text"
                  placeholder="Role"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Salary"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    className="p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option>Applied</option>
                  <option>Interview</option>
                  <option>Selected</option>
                  <option>Rejected</option>
                </select>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg"
                  >
                    {editingId ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

