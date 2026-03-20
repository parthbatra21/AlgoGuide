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
        // First request: Save user answers
        const url = `${String(base).replace(/\/$/, '')}/users/${encodeURIComponent(email)}/answers`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload),
        });

        // Second request: Generate resources by email
        const generateResourcesUrl = `${String(base).replace(/\/$/, '')}/generate-resources-by-email/${encodeURIComponent(email)}`;
        await fetch(generateResourcesUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        });

        // Third request: Get home data by email
        const homeUrl = `http://localhost:8000/home-by-email/${encodeURIComponent(email)}`;
        await fetch(homeUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
      }
      
      // Only mark onboarding as completed if all requests succeeded
      console.log('All onboarding requests completed successfully');
      
      try {
        console.log('Updating user metadata: onboardingCompleted = true');
        await user?.update({ 
          unsafeMetadata: { 
            ...(user?.unsafeMetadata || {}), 
            onboardingCompleted: true 
          } 
        });
        await user?.reload?.();
        console.log('User metadata updated successfully');
        
        // Only navigate after successful metadata update
        setSubmitting(false);
        navigate('/dashboard', { replace: true });
      } catch (metadataErr) {
        console.error('Failed to update user metadata', metadataErr);
        setSubmitting(false);
        // Don't navigate if metadata update failed
      }
    } catch (err) {
      console.error('Onboarding request sequence failed', err);
      setSubmitting(false);
      // Don't update metadata or navigate if requests failed
    }
  }

  useEffect(() => {
    const completed = Boolean(user?.unsafeMetadata?.onboardingCompleted);
    if (completed) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950 px-8 py-8">
          <div className="text-sm uppercase tracking-widest text-zinc-500">AlgoGuide</div>
          <h2 className="mt-2 text-4xl font-semibold text-zinc-100">Onboarding</h2>
          <p className="mt-2 text-lg text-zinc-400">Answer once. Get a clean, trackable prep sheet.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">

      {/* NAME */}
      <div>
        <label className="block text-lg font-medium text-zinc-200 mb-2">Name</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-lg text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          required
        />
      </div>
      {/* STATUS */}
      <div>
        <label className="block text-lg font-medium text-zinc-200 mb-2">Current Status</label>
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-lg text-white focus:outline-none focus:border-zinc-600"
          required
        >
          <option value="">Select...</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {/* EDUCATION & GRAD YEAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-lg font-medium text-zinc-200 mb-2">Education Level</label>
          <select
            name="education"
            value={form.education}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-lg text-white focus:outline-none focus:border-zinc-600"
            required
          >
            <option value="">Select...</option>
            {educations.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-lg font-medium text-zinc-200 mb-2">Graduation Year</label>
          <select
            name="graduationYear"
            value={form.graduationYear}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-lg text-white focus:outline-none focus:border-zinc-600"
            required
          >
            <option value="">Select...</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      {/* PRIMARY LANGUAGE */}
      <div>
        <label className="block text-lg font-medium text-zinc-200 mb-2">Primary Programming Language</label>
        <select
          name="primaryLanguage"
          value={form.primaryLanguage}
          onChange={handleChange}
          className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-lg text-white focus:outline-none focus:border-zinc-600"
          required
        >
          <option value="">Select...</option>
          {languages.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      {/* TECH STACK */}
      <div>
        <label className="block text-lg font-medium text-zinc-200 mb-3">Tech Stack (select all that apply)</label>
        <div className="flex flex-wrap gap-3">
          {techStackOptions.map(t => (
            <label key={t} className="inline-flex items-center gap-3 rounded-xl border border-zinc-800 bg-black px-4 py-3">
              <input type="checkbox" name="techStack" value={t} checked={form.techStack.includes(t)} onChange={handleChange} className="h-5 w-5" />
              <span className="text-lg text-zinc-200">{t}</span>
            </label>
          ))}
        </div>
      </div>
      {/* FAMILIAR TOPICS */}
      <div>
        <label className="block text-lg font-medium text-zinc-200 mb-3">Familiar Topics (select all)</label>
        <div className="flex flex-wrap gap-3">
          {topics.map(t => (
            <label key={t} className="inline-flex items-center gap-3 rounded-xl border border-zinc-800 bg-black px-4 py-3">
              <input type="checkbox" name="familiarTopics" value={t} checked={form.familiarTopics.includes(t)} onChange={handleChange} className="h-5 w-5" />
              <span className="text-lg text-zinc-200">{t}</span>
            </label>
          ))}
        </div>
      </div>
      {/* WEAK AREAS */}
      <div>
        <label className="block text-lg font-medium text-zinc-200 mb-2">Weak Areas (comma separated)</label>
        <input
          type="text"
          name="weakAreas"
          value={form.weakAreas}
          onChange={handleChange}
          className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-lg text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          placeholder="Dynamic Programming, System Design"
        />
      </div>
      {/* TARGET COMPANIES */}
      <div>
        <label className="block text-lg font-medium text-zinc-200 mb-2">Target Companies (comma separated)</label>
        <input
          type="text"
          name="targetCompanies"
          value={form.targetCompanies}
          onChange={handleChange}
          className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-lg text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          placeholder="Google, Amazon, ..."
        />
      </div>
      {/* PREFERRED ROLE */}
      <div>
        <label className="block text-lg font-medium text-zinc-200 mb-2">Preferred Role</label>
        <select
          name="preferredRole"
          value={form.preferredRole}
          onChange={handleChange}
          className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-lg text-white focus:outline-none focus:border-zinc-600"
          required
        >
          <option value="">Select...</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      {/* TARGET TIMELINE */}
      <div>
        <label className="block text-lg font-medium text-zinc-200 mb-2">Target Timeline</label>
        <select
          name="targetTimeline"
          value={form.targetTimeline}
          onChange={handleChange}
          className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-lg text-white focus:outline-none focus:border-zinc-600"
          required
        >
          <option value="">Select...</option>
          {timelines.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {/* RESOURCE TYPE */}
      <div>
        <label className="block text-lg font-medium text-zinc-200 mb-3">Preferred Resource Type (select all)</label>
        <div className="flex flex-wrap gap-3">
          {resourceTypes.map(r => (
            <label key={r} className="inline-flex items-center gap-3 rounded-xl border border-zinc-800 bg-black px-4 py-3">
              <input type="checkbox" name="preferredResources" value={r} checked={form.preferredResources.includes(r)} onChange={handleChange} className="h-5 w-5" />
              <span className="text-lg text-zinc-200">{r}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 mt-2 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition font-semibold text-xl disabled:opacity-60"
      >
        {submitting ? 'Submitting...' : 'Submit & Generate Roadmap'}
      </button>
          </form>
        </div>
      </div>
    </div>
  );
}
