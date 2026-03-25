"use client";

import { useEffect, useState } from "react";

interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  tariff: string;
  status: string;
  createdAt: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchLeads = async (pwd: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        headers: { "x-admin-password": pwd },
      });
      if (!res.ok) throw new Error("Неверный пароль");
      const data = await res.json();
      setLeads(data);
      setAuthed(true);
    } catch {
      setError("Неверный пароль или ошибка сервера");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
    if (saved) fetchLeads(saved);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem("admin_pw", password);
    fetchLeads(password);
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
        <form onSubmit={handleLogin} className="bg-navy-800 border border-white/10 p-8 w-full max-w-sm">
          <h1 className="font-heading font-bold text-2xl mb-6 text-center">Админ-панель</h1>
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-navy-900 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-gold focus:outline-none mb-4"
          />
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gold text-navy-900 font-bold uppercase text-sm cursor-pointer"
          >
            {loading ? "..." : "Войти"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading font-bold text-3xl">
            Заявки <span className="text-gold">({leads.length})</span>
          </h1>
          <button
            onClick={() => fetchLeads(sessionStorage.getItem("admin_pw") || "")}
            className="px-4 py-2 border border-gold text-gold text-sm font-bold uppercase hover:bg-gold hover:text-navy-900 transition-colors cursor-pointer"
          >
            Обновить
          </button>
        </div>

        {leads.length === 0 ? (
          <p className="text-gray-400 text-center py-20">Заявок пока нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-400 uppercase text-xs">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Имя</th>
                  <th className="pb-3 pr-4">Телефон</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Тариф</th>
                  <th className="pb-3 pr-4">Статус</th>
                  <th className="pb-3">Дата</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-white/5 hover:bg-navy-800 transition-colors">
                    <td className="py-3 pr-4 text-gray-500">{lead.id}</td>
                    <td className="py-3 pr-4 font-medium">{lead.name}</td>
                    <td className="py-3 pr-4 text-gold">{lead.phone}</td>
                    <td className="py-3 pr-4 text-gray-400">{lead.email || "—"}</td>
                    <td className="py-3 pr-4">
                      <span className="bg-gold/10 text-gold px-2 py-1 text-xs font-bold uppercase">
                        {lead.tariff}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="bg-green-500/10 text-green-400 px-2 py-1 text-xs font-bold uppercase">
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">
                      {new Date(lead.createdAt).toLocaleString("ru-RU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
