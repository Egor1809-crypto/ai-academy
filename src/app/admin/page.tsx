"use client";

import { useEffect, useState, useCallback } from "react";

interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  tariff: string;
  comment: string | null;
  status: string;
  source: string | null;
  createdAt: string;
}

interface AdminUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  telegramUsername: string | null;
  telegramId: string | null;
  tariff: string | null;
  role: string;
  createdAt: string;
  _count: { leads: number };
}

interface Broadcast {
  id: number;
  message: string;
  status: string;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  sentAt: string | null;
}

type Tab = "leads" | "users" | "broadcast";

const STATUS_OPTIONS = [
  { value: "new", label: "Новая" },
  { value: "contacted", label: "Связались" },
  { value: "paid", label: "Оплачено" },
  { value: "rejected", label: "Отказ" },
];

function statusCls(status: string): string {
  switch (status) {
    case "new":
      return "bg-green-500/10 text-green-400";
    case "contacted":
      return "bg-blue-500/10 text-blue-400";
    case "paid":
      return "bg-gold/10 text-gold";
    case "rejected":
      return "bg-red-500/10 text-red-400";
    default:
      return "bg-gray-500/10 text-gray-400";
  }
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState<Tab>("leads");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastNote, setBroadcastNote] = useState("");

  const pw = () => sessionStorage.getItem("admin_pw") || "";

  const fetchLeads = useCallback(async (password: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads", { headers: { "x-admin-password": password } });
      if (!res.ok) throw new Error("auth");
      setLeads(await res.json());
      setAuthed(true);
    } catch {
      setError("Неверный пароль или ошибка сервера");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users", { headers: { "x-admin-password": pw() } });
      if (res.ok) setUsers(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  const fetchBroadcasts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/broadcast", { headers: { "x-admin-password": pw() } });
      if (res.ok) setBroadcasts(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
    if (saved) fetchLeads(saved);
  }, [fetchLeads]);

  useEffect(() => {
    if (!authed) return;
    if (tab === "users") fetchUsers();
    if (tab === "broadcast") fetchBroadcasts();
  }, [authed, tab, fetchUsers, fetchBroadcasts]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem("admin_pw", password);
    fetchLeads(password);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_pw");
    setAuthed(false);
    setLeads([]);
    setUsers([]);
    setBroadcasts([]);
    setPassword("");
  };

  const changeStatus = async (id: number, status: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": pw() },
        body: JSON.stringify({ id, status }),
      });
    } catch {
      /* revert on failure */
      fetchLeads(pw());
    }
  };

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = broadcastMsg.trim();
    if (!message) return;
    setBroadcastSending(true);
    setBroadcastNote("");
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw() },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        setBroadcastMsg("");
        setBroadcastNote("Рассылка поставлена в очередь — бот отправит её в течение минуты.");
        fetchBroadcasts();
      } else {
        const d = await res.json();
        setBroadcastNote(d.error || "Ошибка при постановке в очередь.");
      }
    } catch {
      setBroadcastNote("Не удалось связаться с сервером.");
    } finally {
      setBroadcastSending(false);
    }
  };

  const filteredLeads = filter === "all" ? leads : leads.filter((l) => l.tariff === filter);

  const stats = {
    total: leads.length,
    today: leads.filter((l) => new Date(l.createdAt).toDateString() === new Date().toDateString())
      .length,
    paid: leads.filter((l) => l.status === "paid").length,
    users: users.length,
  };

  const tariffKeys = Array.from(new Set(leads.map((l) => l.tariff)));

  // ── Login screen ──
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
        <form onSubmit={handleLogin} className="bg-navy-800 border border-white/10 p-8 w-full max-w-sm rounded-xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gold flex items-center justify-center font-heading font-bold text-navy-900 text-lg">
              L
            </div>
            <span className="font-heading font-bold text-xl tracking-wider text-white">
              AI<span className="text-gold">LEGAL</span>
            </span>
          </div>
          <h1 className="font-heading font-bold text-xl mb-6 text-center text-gray-400">Админ-панель</h1>
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-navy-900 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-gold focus:outline-none mb-4 rounded-lg"
          />
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/5 border border-red-400/20 px-3 py-2 mb-4 rounded-lg">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gold text-navy-900 font-bold uppercase text-sm cursor-pointer hover:bg-gold-light transition-colors disabled:opacity-50 rounded-lg"
          >
            {loading ? "Загрузка..." : "Войти"}
          </button>
        </form>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="min-h-screen bg-navy-900 p-6 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
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
              onClick={() => {
                fetchLeads(pw());
                if (tab === "users") fetchUsers();
                if (tab === "broadcast") fetchBroadcasts();
              }}
              className="px-4 py-2 border border-gold text-gold text-xs font-bold uppercase hover:bg-gold hover:text-navy-900 transition-colors cursor-pointer rounded-lg"
            >
              Обновить
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-white/10 text-gray-400 text-xs font-bold uppercase hover:border-red-400 hover:text-red-400 transition-colors cursor-pointer rounded-lg"
            >
              Выйти
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-navy-800 border border-white/10 p-5 rounded-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">Всего заявок</p>
            <p className="text-3xl font-heading font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-navy-800 border border-white/10 p-5 rounded-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">Сегодня</p>
            <p className="text-3xl font-heading font-bold text-gold">{stats.today}</p>
          </div>
          <div className="bg-navy-800 border border-white/10 p-5 rounded-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">Оплачено</p>
            <p className="text-3xl font-heading font-bold text-white">{stats.paid}</p>
          </div>
          <div className="bg-navy-800 border border-white/10 p-5 rounded-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">Пользователи</p>
            <p className="text-3xl font-heading font-bold text-white">{stats.users || "—"}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-white/10">
          {([
            ["leads", "Заявки"],
            ["users", "Пользователи"],
            ["broadcast", "Рассылка"],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 -mb-px ${
                tab === key
                  ? "border-gold text-gold"
                  : "border-transparent text-gray-400 hover:text-gold"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── LEADS TAB ── */}
        {tab === "leads" && (
          <>
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-mono mr-2">Фильтр:</span>
              {["all", ...tariffKeys].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors cursor-pointer rounded ${
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
                      <th className="pb-3 pr-4">Источник</th>
                      <th className="pb-3 pr-4">Статус</th>
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
                          <span className="bg-gold/10 text-gold px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded">
                            {lead.tariff}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-500 text-xs">
                          {lead.source === "telegram_bot" || lead.source === "telegram_bot_guide"
                            ? "Telegram"
                            : lead.source
                              ? "Сайт"
                              : "Сайт"}
                        </td>
                        <td className="py-3 pr-4">
                          <select
                            value={lead.status}
                            onChange={(e) => changeStatus(lead.id, e.target.value)}
                            className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider rounded cursor-pointer border-0 focus:outline-none ${statusCls(lead.status)}`}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value} className="bg-navy-800 text-white">
                                {s.label}
                              </option>
                            ))}
                          </select>
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
          </>
        )}

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <>
            {users.length === 0 ? (
              <p className="text-gray-400 text-center py-20">Зарегистрированных пользователей пока нет</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-gray-500 uppercase text-[10px] tracking-wider font-mono">
                      <th className="pb-3 pr-4">#</th>
                      <th className="pb-3 pr-4">Имя</th>
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">Телефон</th>
                      <th className="pb-3 pr-4">Telegram</th>
                      <th className="pb-3 pr-4">Тариф</th>
                      <th className="pb-3 pr-4">Заявок</th>
                      <th className="pb-3">Регистрация</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-navy-800 transition-colors">
                        <td className="py-3 pr-4 text-gray-600 font-mono text-xs">{u.id}</td>
                        <td className="py-3 pr-4 font-medium">
                          {u.name}
                          {u.role === "admin" && (
                            <span className="ml-2 bg-gold/10 text-gold px-1.5 py-0.5 text-[9px] font-bold uppercase rounded">
                              admin
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-gray-400">{u.email || "—"}</td>
                        <td className="py-3 pr-4 text-gray-400">{u.phone || "—"}</td>
                        <td className="py-3 pr-4 text-gray-400">
                          {u.telegramUsername ? `@${u.telegramUsername}` : u.telegramId ? "привязан" : "—"}
                        </td>
                        <td className="py-3 pr-4">
                          {u.tariff ? (
                            <span className="bg-gold/10 text-gold px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded">
                              {u.tariff}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 pr-4 text-gray-300">{u._count.leads}</td>
                        <td className="py-3 text-gray-500 text-xs font-mono whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── BROADCAST TAB ── */}
        {tab === "broadcast" && (
          <div className="max-w-2xl">
            <form onSubmit={sendBroadcast} className="bg-navy-800 border border-white/10 rounded-xl p-6 mb-8">
              <h2 className="font-heading font-bold text-lg mb-2">Рассылка пользователям бота</h2>
              <p className="text-gray-400 text-sm mb-4">
                Сообщение получат все пользователи Telegram-бота. Поддерживается HTML-разметка
                (<code className="text-gold">&lt;b&gt;</code>, <code className="text-gold">&lt;i&gt;</code>).
              </p>
              <textarea
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="Текст рассылки…"
                rows={5}
                maxLength={4000}
                className="w-full bg-navy-900 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-gold focus:outline-none rounded-lg mb-3 resize-y"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 font-mono">{broadcastMsg.length}/4000</span>
                <button
                  type="submit"
                  disabled={broadcastSending || !broadcastMsg.trim()}
                  className="px-6 py-2.5 bg-gold text-navy-900 font-bold uppercase text-sm rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {broadcastSending ? "Отправка…" : "Отправить"}
                </button>
              </div>
              {broadcastNote && <p className="text-sm text-gold mt-3">{broadcastNote}</p>}
            </form>

            <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-gray-400 mb-4">
              История рассылок
            </h3>
            {broadcasts.length === 0 ? (
              <p className="text-gray-500 text-sm">Рассылок ещё не было.</p>
            ) : (
              <div className="space-y-3">
                {broadcasts.map((b) => (
                  <div key={b.id} className="bg-navy-800 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${
                          b.status === "sent"
                            ? "bg-green-500/10 text-green-400"
                            : b.status === "sending"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {b.status === "sent"
                          ? "Отправлено"
                          : b.status === "sending"
                            ? "Отправляется"
                            : "В очереди"}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {new Date(b.createdAt).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{b.message}</p>
                    {b.status === "sent" && (
                      <p className="text-xs text-gray-500 mt-2 font-mono">
                        ✅ {b.sentCount} · ❌ {b.failedCount}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
