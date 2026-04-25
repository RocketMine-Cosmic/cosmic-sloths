// SDK handles callback automatically—this is just a loading screen
export default function AuthCallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}