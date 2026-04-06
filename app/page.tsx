export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <section className="text-center py-20 px-6">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Controla tu jornada sin libreta
        </h1>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Tacoplan es la app para camioneros que registra conducción, descansos, viajes y dietas automáticamente.
        </p>

        <div className="flex justify-center gap-4">
          <a href="/registro" className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg">
            Registrarse
          </a>

          <a href="/planes" className="border border-gray-300 px-6 py-3 rounded-xl">
            Ver planes
          </a>
        </div>
      </section>
    </main>
  );
}
