"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 border border-white/10 text-gray-400 text-xs font-bold uppercase hover:border-red-400 hover:text-red-400 transition-colors cursor-pointer rounded-lg disabled:opacity-50"
    >
      {loading ? "Выход…" : "Выйти"}
    </button>
  );
}
