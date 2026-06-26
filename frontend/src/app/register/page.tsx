import RegisterWizard from '@/components/auth/RegisterWizard';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Branding / Info */}
        <div className="w-full md:w-1/3 bg-indigo-900 p-8 text-white flex flex-col justify-between hidden md:flex">
          <div>
            <h1 className="text-3xl font-bold mb-4 tracking-tight">SkillGraph</h1>
            <p className="text-indigo-200">
              Your journey to verified skills and top-tier placements begins here.
            </p>
          </div>
          
          <div className="text-sm text-indigo-300">
            <p className="mb-2">✓ AI-Driven Roadmaps</p>
            <p className="mb-2">✓ Verified Skill Scores</p>
            <p>✓ Direct Company Matching</p>
          </div>
        </div>

        {/* Right Side: Wizard */}
        <div className="w-full md:w-2/3 p-8">
          <RegisterWizard />
        </div>
      </div>
    </div>
  );
}
