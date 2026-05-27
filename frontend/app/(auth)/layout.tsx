export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-400 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🛥️</div>
          <h1 className="text-3xl font-bold text-white">জলতরঙ্গ</h1>
          <p className="text-sky-100 text-sm mt-1">Jolotorongo — Tanguar Haor</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6">{children}</div>
      </div>
    </div>
  );
}
