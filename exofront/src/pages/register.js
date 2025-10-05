import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== repeatPassword) {
      setError("Пароли не совпадают");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/users/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, username, password }),
      });

      if (res.ok) {
        router.push("/");
      } else {
        setError("Error");
      }
    } catch {
      setError("Server Error");
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
            className="absolute w-[28rem] h-[28rem] rounded-full"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{
                background: "radial-gradient(circle, #FFD700 0%, #FF8C00 60%, transparent 100%)",
                boxShadow: "0 0 150px 50px rgba(255,180,0,0.6)",
            }}
        />

      <div className="relative z-10 bg-black/50 backdrop-blur-lg border border-yellow-600 rounded-2xl p-8 shadow-2xl w-96">
        <form onSubmit={handleRegister} className="flex flex-col space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 rounded-xl bg-black/60 border border-yellow-600 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          />
          <input
            type="text"
            placeholder="Имя пользователя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-3 rounded-xl bg-black/60 border border-yellow-600 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 rounded-xl bg-black/60 border border-yellow-600 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          />
          <input
            type="password"
            placeholder="Повторите пароль"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            className="p-3 rounded-xl bg-black/60 border border-yellow-600 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            className="p-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold shadow-lg transition"
          >
            Register
          </button>

          <p
            onClick={() => router.push("/")}
            className="text-sm text-gray-300 mt-4 text-center cursor-pointer hover:text-yellow-400 transition"
          >
            Already have an account? <span className="underline">Login</span>
          </p>
        </form>
      </div>
    </div>
  );
}