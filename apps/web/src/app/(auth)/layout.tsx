export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — decorativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* círculos decorativos */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-16 w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-8 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative z-10 text-center max-w-sm">
          {/* Logo grande */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-xl">
              <span className="text-violet-700 text-2xl font-black">S</span>
            </div>
            <span className="text-white text-3xl font-bold tracking-tight">Social Scheduler</span>
          </div>

          <h2 className="text-white text-2xl font-semibold leading-snug mb-4">
            Gerencie todas as suas redes sociais em um único lugar
          </h2>
          <p className="text-violet-200 text-sm leading-relaxed">
            Agende posts, acompanhe métricas, colabore com sua equipe e entregue resultados com mais eficiência.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[['+500', 'Agências'], ['98%', 'Satisfação'], ['24/7', 'Suporte']].map(([val, label]) => (
              <div key={label} className="bg-white/10 rounded-xl py-3 px-2">
                <div className="text-white font-bold text-lg">{val}</div>
                <div className="text-violet-200 text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 min-h-screen">
        {/* Logo mobile (só aparece em telas pequenas) */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
            <span className="text-white text-lg font-black">S</span>
          </div>
          <span className="text-gray-900 text-xl font-bold">Social Scheduler</span>
        </div>

        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
