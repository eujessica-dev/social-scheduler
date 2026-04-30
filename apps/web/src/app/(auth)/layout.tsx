export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-600 text-white text-xl font-bold mb-4">
            S
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Social Scheduler</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie suas redes em um só lugar</p>
        </div>
        {children}
      </div>
    </div>
  )
}
