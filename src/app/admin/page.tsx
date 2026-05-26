"use client";

import { useEffect, useState } from "react";

interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  tariff: string;
  comment: string | null;
  status: string;
  createdAt: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

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

  const handleLogout = () => {
    sessionStorage.removeItem("admin_pw");
    setAuthed(false);
    setLeads([]);
    setPassword("");
  };

  const filteredLeads = filter === "all" ? leads : leads.filter((l) => l.tariff === filter);

  const stats = {
    total: leads.length,
    today: leads.filter((l) => {
      const d = new Date(l.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
    tariffs: leads.reduce(
      (acc, l) => {
        acc[l.tariff] = (acc[l.tariff] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
        <form onSubmit={handleLogin} className="bg-navy-800 border border-white/10 p-8 w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gold flex items-center justify-center font-heading font-bold text-navy-900 text-lg">
              L
            </div>
            <span className="font-heading font-bold text-xl tracking-wider">
              AI<span className="text-gold">LEGAL</span>
            </span>
          </div>
          <h1 className="font-heading font-bold text-xl mb-6 text-center text-gray-400">Админ-панель</h1>
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-navy-900 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-gold focus:outline-none mb-4"
          />
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/5 border border-red-400/20 px-3 py-2 mb-4">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gold text-navy-900 font-bold uppercase text-sm cursor-pointer hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {loading ? "Загрузка..." : "Войти"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gold flex items-center justify-center font-heading font-bold text-navy-900 text-sm">
                L
              </div>
              <span className="font-heading font-bold text-lg tracking-wider">
                AI<span className="text-gold">LEGAL</span>
              </span>
            </div>
            <span className="text-gray-600">|</span>
            <h1 className="font-heading font-bold text-xl text-gray-400">Админ-панель</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchLeads(sessionStorage.getItem("admin_pw") || "")}
              className="px-4 py-2 border border-gold text-gold text-xs font-bold uppercase hover:bg-gold hover:text-navy-900 transition-colors cursor-pointer"
            >
              Обновить
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-white/10 text-gray-400 text-xs font-bold uppercase hover:border-red-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              Выйти
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-navy-800 border border-white/10 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">Всего заявок</p>
            <p className="text-3xl font-heading font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-navy-800 border border-white/10 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">Сегодня</p>
            <p className="text-3xl font-heading font-bold text-gold">{stats.today}</p>
          </div>
          {Object.entries(stats.tariffs).map(([tariff, count]) => (
            <div key={tariff} className="bg-navy-800 border border-white/10 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">{tariff}</p>
              <p className="text-3xl font-heading font-bold text-white">{count}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-mono mr-2">Фильтр:</span>
          {["all", ...Object.keys(stats.tariffs)].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors cursor-pointer ${
                filter === t
                  ? "bg-gold text-navy-900"
                  : "bg-navy-800 border border-white/10 text-gray-400 hover:border-gold hover:text-gold"
              }`}
            >
              {t === "all" ? "Все" : t}
            </button>
          ))}
        </div>

        {filteredLeads.length === 0 ? (
          <p className="text-gray-400 text-center py-20">Заявок пока нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-500 uppercase text-[10px] tracking-wider font-mono">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Имя</th>
                  <th className="pb-3 pr-4">Телефон</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Тариф</th>
                  <th className="pb-3 pr-4">Статус</th>
                  <th className="pb-3 pr-4">Комментарий</th>
                  <th className="pb-3">Дата</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-white/5 hover:bg-navy-800 transition-colors">
                    <td className="py-3 pr-4 text-gray-600 font-mono text-xs">{lead.id}</td>
                    <td className="py-3 pr-4 font-medium">{lead.name}</td>
                    <td className="py-3 pr-4">
                      <a href={`tel:${lead.phone}`} className="text-gold hover:text-gold-light transition-colors">
                        {lead.phone}
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-gray-400">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="hover:text-gold transition-colors">
                          {lead.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="bg-gold/10 text-gold px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                        {lead.tariff}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          lead.status === "new"
                            ? "bg-green-500/10 text-green-400"
                            : lead.status === "contacted"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {lead.status === "new" ? "Новая" : lead.status === "contacted" ? "Связались" : lead.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-500 text-xs max-w-[150px] truncate">
                      {lead.comment || "—"}
                    </td>
                    <td className="py-3 text-gray-500 text-xs font-mono whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
