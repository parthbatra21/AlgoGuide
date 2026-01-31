import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

const years = Array.from({ length: 7 }, (_, i) => 2024 + i);
const statuses = ['College Student', 'Working Professional', 'Job Seeker'];
const educations = ['B.Tech', 'M.Tech', 'BSc', 'MSc', 'PhD', 'Other'];
const languages = ['Java', 'Python', 'C++', 'JavaScript', 'Go', 'Other'];
const techStackOptions = ['React', 'Node.js', 'Spring Boot', 'Express', 'Django', 'Angular', 'Vue', 'Flask', 'Other'];
const topics = ['DSA', 'DBMS', 'OOPs', 'OS', 'CN', 'System Design', 'Other'];
const roles = ['SDE', 'Data Scientist', 'ML Engineer', 'Backend Dev', 'Frontend Dev', 'Full Stack', 'Other'];
const timelines = ['3 months', '6 months', '1 year'];
const resourceTypes = ['Video', 'Blog', 'Docs', 'Problem Sets'];

export default function Onboarding() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    status: '',
    education: '',
    graduationYear: '',
    primaryLanguage: '',
    techStack: [],
    familiarTopics: [],
    weakAreas: '',
    targetCompanies: '', // string, will split by comma on submit
    preferredRole: '',
    targetTimeline: '',
    preferredResources: [],
  });

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name !== 'techStack' && name !== 'familiarTopics' && name !== 'preferredResources') {
      setForm(f => ({ ...f, [name]: checked }));
    } else if (type === 'checkbox' && (name === 'techStack' || name === 'familiarTopics' || name === 'preferredResources')) {
      const prev = form[name];
      if (checked) {
        setForm(f => ({ ...f, [name]: [...prev, value] }));
      } else {
        setForm(f => ({ ...f, [name]: prev.filter(v => v !== value) }));
      }
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const splitList = (val) => val.split(',').map(t => t.trim()).filter(Boolean);

    const answers = [
      {
        question_id: 'onboarding_name',
        question_text: 'What is your name?',
        answer: form.name,
      },
      {
        question_id: 'onboarding_status',
        question_text: 'What is your current status?',
        answer: form.status,
      },
      {
        question_id: 'onboarding_education',
        question_text: 'What is your highest education level?',
        answer: form.education,
      },
      {
        question_id: 'onboarding_graduation_year',
        question_text: 'What is your year of graduation?',
        answer: String(form.graduationYear),
      },
      {
        question_id: 'onboarding_primary_language',
        question_text: 'What is your primary programming language?',
        answer: form.primaryLanguage,
      },
      {
        question_id: 'onboarding_tech_stack',
        question_text: 'Which technologies are in your tech stack?',
        answer: form.techStack.join(', '),
      },
      {
        question_id: 'onboarding_familiar_topics',
        question_text: 'Which topics are you already familiar with?',
        answer: form.familiarTopics.join(', '),
      },
      {
        question_id: 'onboarding_weak_areas',
        question_text: 'Which areas are your weak points or you want to improve?',
        answer: splitList(form.weakAreas).join(', '),
      },
      {
        question_id: 'onboarding_target_companies',
        question_text: 'Which companies are you targeting?',
        answer: splitList(form.targetCompanies).join(', '),
      },
      {
        question_id: 'onboarding_preferred_role',
        question_text: 'What is your preferred role?',
        answer: form.preferredRole,
      },
      {
        question_id: 'onboarding_target_timeline',
        question_text: 'What is your target timeline?',
        answer: form.targetTimeline,
      },
      {
        question_id: 'onboarding_preferred_resources',
        question_text: 'What types of learning resources do you prefer?',
        answer: form.preferredResources.join(', '),
      },
    ];

    const email = user?.primaryEmailAddress?.emailAddress || '';
    const payload = { email, answers };

    try {
      const base = import.meta.env.VITE_ONBOARDING_ENDPOINT || '/api';
      if (base && email) {
        const url = `${String(base).replace(/\/$/, '')}/users/${encodeURIComponent(email)}/answers`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch (err) {
      console.error('Onboarding POST failed', err);
    } finally {
      try {
        await user?.update({ unsafeMetadata: { ...(user?.unsafeMetadata || {}), onboardingCompleted: true } });
        await user?.reload?.();
      } catch (err) {
        console.error('Failed to update user metadata', err);
      }
      setSubmitting(false);
      navigate('/dashboard', { replace: true });
    }
  }

  useEffect(() => {
    const completed = Boolean(user?.unsafeMetadata?.onboardingCompleted);
    if (completed) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow mt-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Onboarding</h2>

      {/* NAME */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Name</label>
        <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
      </div>
      {/* STATUS */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Current Status</label>
        <select name="status" value={form.status} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
          <option value="">Select...</option>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      {/* EDUCATION & GRAD YEAR */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label className="block font-semibold mb-1">Education Level</label>
          <select name="education" value={form.education} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
            <option value="">Select...</option>
            {educations.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">Graduation Year</label>
          <select name="graduationYear" value={form.graduationYear} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
            <option value="">Select...</option>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>
      {/* PRIMARY LANGUAGE */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Primary Programming Language</label>
        <select name="primaryLanguage" value={form.primaryLanguage} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
          <option value="">Select...</option>
          {languages.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>
      {/* TECH STACK */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Tech Stack (select all that apply)</label>
        <div className="flex flex-wrap gap-2">
          {techStackOptions.map(t => (
            <label key={t} className="inline-flex items-center border px-2 py-1 rounded">
              <input type="checkbox" name="techStack" value={t} checked={form.techStack.includes(t)} onChange={handleChange} />
              <span className="ml-2">{t}</span>
            </label>
          ))}
        </div>
      </div>
      {/* FAMILIAR TOPICS */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Familiar Topics (select all)</label>
        <div className="flex flex-wrap gap-2">
          {topics.map(t => (
            <label key={t} className="inline-flex items-center border px-2 py-1 rounded">
              <input type="checkbox" name="familiarTopics" value={t} checked={form.familiarTopics.includes(t)} onChange={handleChange} />
              <span className="ml-2">{t}</span>
            </label>
          ))}
        </div>
      </div>
      {/* WEAK AREAS */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Weak Areas (comma separated)</label>
        <input type="text" name="weakAreas" value={form.weakAreas} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="Dynamic Programming, System Design" />
      </div>
      {/* TARGET COMPANIES */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Target Companies (comma separated)</label>
        <input type="text" name="targetCompanies" value={form.targetCompanies} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="Google, Amazon, ..." />
      </div>
      {/* PREFERRED ROLE */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Preferred Role</label>
        <select name="preferredRole" value={form.preferredRole} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
          <option value="">Select...</option>
          {roles.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>
      {/* TARGET TIMELINE */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Target Timeline</label>
        <select name="targetTimeline" value={form.targetTimeline} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
          <option value="">Select...</option>
          {timelines.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      {/* RESOURCE TYPE */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Preferred Resource Type (select all)</label>
        <div className="flex flex-wrap gap-2">
          {resourceTypes.map(r => (
            <label key={r} className="inline-flex items-center border px-2 py-1 rounded">
              <input type="checkbox" name="preferredResources" value={r} checked={form.preferredResources.includes(r)} onChange={handleChange} />
              <span className="ml-2">{r}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2 mt-4 bg-blue-700 text-white rounded shadow hover:bg-blue-900 transition font-semibold text-lg disabled:opacity-60"
      >
        {submitting ? 'Submitting...' : 'Submit & Generate Roadmap'}
      </button>
    </form>
  );
}
