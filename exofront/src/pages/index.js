import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/users/user-info/", {
          credentials: "include",
        });
        if (res.ok) {
          router.push("/main");
        }
      } catch {
        console.log("Not authorized");
      }
    };
    checkAuth();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/users/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/main");
      } else {
        setError("Неверный email или пароль");
      }
    } catch {
      setError("Ошибка сервера");
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0018] to-black">
        {[...Array(40)].map((_, i) => (
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

      <motion.div
        className="absolute w-[28rem] h-[28rem] rounded-full bg-gradient-radial from-[#000] via-[#120030] to-transparent"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
        style={{ boxShadow: "0 0 120px 40px rgba(100,0,200,0.35)" }}
      />

      <div className="relative z-10 bg-black/50 backdrop-blur-lg border border-purple-800 rounded-2xl p-8 shadow-2xl w-96">
        <form onSubmit={handleLogin} className="flex flex-col space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 rounded-xl bg-black/60 border border-purple-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 rounded-xl bg-black/60 border border-purple-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="p-3 rounded-xl bg-purple-800 hover:bg-purple-600 text-white font-bold shadow-lg transition"
          >
            Login
          </button>

          <p
            onClick={() => router.push("/register")}
            className="text-sm text-gray-300 mt-4 text-center cursor-pointer hover:text-purple-400 transition"
          >
            Do not have an account? <span className="underline">Зарегистрироваться</span>
          </p>
          <p
            onClick={() => router.push("/main")}
            className="text-sm text-gray-300 mt-4 text-center cursor-pointer hover:text-purple-400 transition"
          >
            <span className="underline">Work without account!</span>
          </p>
        </form>
      </div>
    </div>
  );
}
