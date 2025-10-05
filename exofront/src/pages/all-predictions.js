import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";

export default function Exoplanets() {
  const router = useRouter();
  const [planets, setPlanets] = useState([]);
  const [mode, setMode] = useState("Professional");
  const [loading, setLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);

  const fetchPlanets = async () => {
    setLoading(true);
    try {
      const endpoint =
        mode === "Professional"
          ? "http://127.0.0.1:8000/api/users/exoplanets/"
          : "http://127.0.0.1:8000/api/users/exoplanets_noob/";
      const res = await fetch(endpoint, { credentials: "include" });
      const data = await res.json();
      setPlanets(data);
    } catch (err) {
      console.error("Ошибка загрузки:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanets();
  }, [mode]);

  return (
    <div className="relative w-full min-h-screen bg-black text-white overflow-hidden">
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gradient-to-b from-black/70 to-black/30">
        <div className="flex items-center space-x-6">
          <div className="text-2xl font-bold cursor-pointer" onClick={() => router.push("/main")}>Main</div>
          <div className="text-sm cursor-pointer" onClick={() => router.push("/all-predictions")}>All Predictions</div>
          <div className="text-sm cursor-pointer" onClick={() => router.push("/my-predictions")}>My Predictions</div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-300">
            Mode: <span className="font-medium">{mode}</span>
          </div>
          <button
            onClick={() =>
              setMode(mode === "Professional" ? "Amateur" : "Professional")
            }
            className="px-3 py-2 bg-purple-800/80 hover:bg-purple-700 rounded-md text-sm"
          >
            Switch
          </button>
          <button
            onClick={() => setShowInstructions(true)}
            className="px-3 py-2 bg-purple-800/80 hover:bg-purple-700 rounded-md text-sm"
          >
            Instructions
          </button>
        </div>
      </header>

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

      <main className="relative z-10 p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <p className="text-center col-span-full">Loading...</p>
        ) : (
          planets.map((planet) => (
            <motion.div
              key={planet.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-black/50 border border-purple-800 backdrop-blur-lg rounded-2xl p-6 shadow-lg hover:shadow-purple-700/30 transition"
            >
              <h2 className="text-lg font-bold mb-2">
                Exoplanet #{planet.id}
              </h2>
              <div className="text-sm text-gray-300 space-y-1">
                <p>Period: {planet.period}</p>
                <p>Duration: {planet.duration}</p>
                <p>Depth: {planet.depth}</p>
                {planet.prad && <p>Prad: {planet.prad}</p>}
                {planet.steff && <p>Teff: {planet.steff}</p>}
                {planet.srad && <p>Srad: {planet.srad}</p>}
                <p>Mag: {planet.mag}</p>
                <p>Disposition: {planet.disposition}</p>
              </div>
            </motion.div>
          ))
        )}
      </main>
    </div>
  );
}
