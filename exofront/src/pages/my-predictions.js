// pages/my-predictions.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";

export default function MyPredictions() {
  const router = useRouter();
  const [planets, setPlanets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/users/give_my_exoplanets/", {
        credentials: "include",
      });
      const data = await res.json();

      // Объединяем и добавляем тип карточки
      const pro = (data.exoplanets || []).map((p) => ({ ...p, type: "Professional" }));
      const noob = (data.exoplanets_noob || []).map((p) => ({ ...p, type: "Amateur" }));
      setPlanets([...pro, ...noob]);
    } catch (err) {
      console.error("Ошибка загрузки:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-black text-white overflow-hidden">
      {/* ===== HEADER ===== */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gradient-to-b from-black/70 to-black/30">
        <div className="flex items-center space-x-6">
          <div
            className="text-2xl font-bold cursor-pointer"
            onClick={() => router.push("/main")}
          >
            Main
          </div>
          <div
            className="text-sm cursor-pointer"
            onClick={() => router.push("/all-predictions")}
          >
            All Predictions
          </div>
          <div
            className="text-sm cursor-pointer"
            onClick={() => router.push("/my-predictions")}
          >
            My Predictions
          </div>
        </div>

        <button
          onClick={() => setShowInstructions(true)}
          className="px-3 py-2 bg-purple-800/80 hover:bg-purple-700 rounded-md text-sm"
        >
          Instructions
        </button>
      </header>

      {/* ===== BACKGROUND STARS ===== */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-70"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="relative z-10 p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <p className="text-center col-span-full">Loading...</p>
        ) : planets.length === 0 ? (
          <p className="text-center col-span-full text-gray-400">No predictions found.</p>
        ) : (
          planets.map((planet) => (
            <motion.div
              key={`${planet.type}-${planet.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className={`bg-black/50 border backdrop-blur-lg rounded-2xl p-6 shadow-lg transition ${
                planet.type === "Professional"
                  ? "border-purple-800 hover:shadow-purple-700/30"
                  : "border-blue-800 hover:shadow-blue-700/30"
              }`}
            >
              <h2 className="text-lg font-bold mb-2">
                {planet.type} — #{planet.id}
              </h2>
              <div className="text-sm text-gray-300 space-y-1">
                <p>Period: {planet.period}</p>
                <p>Duration: {planet.duration}</p>
                <p>Depth: {planet.depth}</p>
                {planet.type === "Professional" ? (
                  <>
                    <p>Prad: {planet.prad}</p>
                    <p>Teff: {planet.steff}</p>
                    <p>Srad: {planet.srad}</p>
                    <p>Mag: {planet.mag}</p>
                  </>
                ) : (
                  <p>Mag: {planet.kepmag}</p>
                )}
                <p>Disposition: {planet.disposition}</p>
              </div>
            </motion.div>
          ))
        )}
      </main>
    </div>
  );
}
