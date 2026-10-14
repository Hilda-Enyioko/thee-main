import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import LogoutButton from '../../components/LogoutButton';
import './PlanManagement.css';

type CoverageLevel = 'third_party' | 'tp_fire_theft' | 'comprehensive' | 'standard';

interface Category {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface Plan {
  id: string;
  name: string;
  category: string;
  category_name: string;
  coverage_level: CoverageLevel;
  coverage_amount: string;
  premium: string;
  duration_months: number;
  description: string;
  visibility: 'private' | 'public';
  is_active: boolean;
  created_at: string;
}

const MOTOR_LEVELS: { value: CoverageLevel; label: string }[] = [
  { value: 'third_party', label: 'Third Party Only' },
  { value: 'tp_fire_theft', label: 'Third Party, Fire & Theft' },
  { value: 'comprehensive', label: 'Comprehensive' },
];

const emptyForm = {
  name: '',
  category: '',
  coverage_level: '' as CoverageLevel | '',
  coverage_amount: '',
  premium: '',
  duration_months: '12',
  description: '',
  visibility: 'private' as 'private' | 'public',
};

export default function PlanManagement() {
  const { admin } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedCategory = categories.find((c) => c.id === form.category);
  const isMotor = selectedCategory?.name === 'motor';
  const isTravel = selectedCategory?.name === 'travel';

  // Wrapped in useCallback so it's a stable dependency for useEffect
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await api.get('/partner/plans/', { params });
      setPlans(response.data.plans);
    } catch {
      // Best practice to catch background fetch errors
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Wrapped in useCallback to keep identity stable
  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/categories/');
      setCategories(response.data.categories);
    } catch {
      // Quietly fail or handle error
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const openCreateForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormErrors({});
    setShowForm(true);
  };

  const openEditForm = (plan: Plan) => {
    setForm({
      name: plan.name,
      category: plan.category,
      coverage_level: plan.coverage_level,
      coverage_amount: plan.coverage_amount,
      premium: plan.premium,
      duration_months: String(plan.duration_months),
      description: plan.description,
      visibility: plan.visibility,
    });
    setEditingId(plan.id);
    setFormErrors({});
    setShowForm(true);
  };

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'category' ? { coverage_level: '' } : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    const payload = {
      name: form.name,
      category: form.category,
      coverage_level: isTravel ? 'standard' : form.coverage_level,
      coverage_amount: form.coverage_amount,
      premium: form.premium,
      duration_months: Number(form.duration_months),
      description: form.description,
      visibility: form.visibility,
    };

    try {
      if (editingId) {
        await api.patch(`/partner/plans/${editingId}/`, payload);
      } else {
        await api.post('/partner/plans/', payload);
      }
      setShowForm(false);
      fetchPlans();
    } catch (err: unknown) {
      // Replaced 'any' with structural type validation or safe handling
      if (err && typeof err === 'object' && 'response' in err) {
        const responseData = (err as { response?: { data?: Record<string, string> } }).response?.data;
        if (responseData && typeof responseData === 'object') {
          setFormErrors(responseData);
          return;
        }
      }
      setFormErrors({ general: 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (plan: Plan) => {
    await api.patch(`/partner/plans/${plan.id}/`, { is_active: !plan.is_active });
    fetchPlans();
  };

  const handleDeactivate = async (plan: Plan) => {
    if (!confirm(`Deactivate "${plan.name}"? Customers will no longer be able to subscribe to it.`)) return;
    await api.delete(`/partner/plans/${plan.id}/`);
    fetchPlans();
  };

  return (
    <div className="plan-management">
      <header className="dashboard-header">
        <div className="logo">
          <span className="logo-mark">the</span>e<span className="logo-accent">insurance</span>
        </div>
        <div className="header-right">
          <span className="partner-name">{admin?.partnerName}</span>
          <LogoutButton />
        </div>
      </header>

      <div className="dashboard-body">
        <div className="dashboard-toolbar">
          <div>
            <h1>Plans</h1>
            <p className="toolbar-subtext">Manage the policies you offer through theeinsurance.</p>
          </div>
          <button className="btn-primary" onClick={openCreateForm}>
            + New plan
          </button>
        </div>

        <div className="filter-tabs">
          {((['all', 'active', 'inactive'] as const)).map((f) => (
            <button
              key={f}
              className={`filter-tab ${statusFilter === f ? 'active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Published' : 'Draft'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="empty-state">
            <p>No plans here yet.</p>
            <button className="btn-primary" onClick={openCreateForm}>Create your first plan</button>
          </div>
        ) : (
          <div className="plan-grid">
            {plans.map((plan) => (
              <div className="plan-card" key={plan.id}>
                <div className="plan-card-top">
                  <span className={`status-pill ${plan.is_active ? 'live' : 'draft'}`}>
                    {plan.is_active ? 'Published' : 'Draft'}
                  </span>
                  <span className="category-pill">{plan.category_name}</span>
                  <span className="category-pill">{plan.visibility === 'public' ? 'Marketplace' : 'Private'}</span>
                </div>
                <h3>{plan.name}</h3>
                <p className="plan-description">{plan.description}</p>
                <div className="plan-figures">
                  <div>
                    <span className="figure-label">Premium</span>
                    <span className="figure-value">₦{Number(plan.premium).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="figure-label">Coverage</span>
                    <span className="figure-value">₦{Number(plan.coverage_amount).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="figure-label">Duration</span>
                    <span className="figure-value">{plan.duration_months} mo</span>
                  </div>
                </div>
                <div className="plan-actions">
                  <button className="btn-ghost" onClick={() => openEditForm(plan)}>Edit</button>
                  <button className="btn-ghost" onClick={() => handleTogglePublish(plan)}>
                    {plan.is_active ? 'Unpublish' : 'Publish'}
                  </button>
                  {plan.is_active && (
                    <button className="btn-danger" onClick={() => handleDeactivate(plan)}>Deactivate</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Edit plan' : 'New plan'}</h2>

            {formErrors.general && <div className="form-error-banner">{formErrors.general}</div>}

            <form onSubmit={handleSubmit} className="plan-form">
              <label>
                Plan name
                <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
                {formErrors.name && <span className="field-error">{formErrors.name}</span>}
              </label>

              <div className="field-row">
                <label>
                  Category
                  <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.description || c.name}</option>
                    ))}
                  </select>
                  {formErrors.category && <span className="field-error">{formErrors.category}</span>}
                </label>

                {isMotor && (
                  <label>
                    Coverage level
                    <select
                      value={form.coverage_level}
                      onChange={(e) => updateField('coverage_level', e.target.value)}
                    >
                      <option value="">Select level</option>
                      {MOTOR_LEVELS.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                    {formErrors.coverage_level && <span className="field-error">{formErrors.coverage_level}</span>}
                  </label>
                )}
              </div>

              <div className="field-row">
                <label>
                  Premium (₦)
                  <input type="number" step="0.01" value={form.premium} onChange={(e) => updateField('premium', e.target.value)} />
                  {formErrors.premium && <span className="field-error">{formErrors.premium}</span>}
                </label>
                <label>
                  Coverage amount (₦)
                  <input type="number" step="0.01" value={form.coverage_amount} onChange={(e) => updateField('coverage_amount', e.target.value)} />
                  {formErrors.coverage_amount && <span className="field-error">{formErrors.coverage_amount}</span>}
                </label>
              </div>

              <label>
                Duration (months)
                <input type="number" value={form.duration_months} onChange={(e) => updateField('duration_months', e.target.value)} />
                {formErrors.duration_months && <span className="field-error">{formErrors.duration_months}</span>}
              </label>

              <label>
                Description
                <textarea rows={3} value={form.description} onChange={(e) => updateField('description', e.target.value)} />
                {formErrors.description && <span className="field-error">{formErrors.description}</span>}
              </label>

              <label>
                Distribution visibility
                <select value={form.visibility} onChange={(e) => updateField('visibility', e.target.value)}>
                  <option value="private">Private — only our direct customers</option>
                  <option value="public">Marketplace — distributors can request access</option>
                </select>
                <span className="form-subtext">Public plans still require your approval before a distributor can sell them.</span>
              </label>

              <div className="step-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingId ? 'Save changes' : 'Create plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
