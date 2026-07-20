import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Heart, MessageCircle, Bookmark, Share2, Plus, Search, User, Home,
  X, Clock, Users, Flame, Check, Trash2, Loader2, Video as VideoIcon, Send,
  SlidersHorizontal, Camera, Pencil, BarChart3, Eye, TrendingUp, UserPlus
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

// Set VITE_API_BASE_URL in your .env (local) or in Vercel's project settings (production).
// Falls back to localhost so `npm run dev` works out of the box against a local backend.
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://cooktok-backend.onrender.com";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600..900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');`;

const PALETTE = {
  char: "#1C140E", charLight: "#2A1E15", cream: "#F5EEE0", creamDim: "#C9BCA6",
  chili: "#C1442D", herb: "#8CA33A", butter: "#E8B34C",
};

const DISH_THEMES = [
  { emoji: "🍲", from: "#C1442D", to: "#7A2617" },
  { emoji: "🥘", from: "#8CA33A", to: "#4A5A1A" },
  { emoji: "🍰", from: "#E8B34C", to: "#9A6A1E" },
  { emoji: "🍜", from: "#B5563F", to: "#5C2418" },
  { emoji: "🥟", from: "#7A8F4A", to: "#3D4A22" },
  { emoji: "🍤", from: "#D97B4C", to: "#7A3D1E" },
];
function themeFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % DISH_THEMES.length;
  return DISH_THEMES[h];
}
function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n || 0);
}

// ---- API helper -----------------------------------------------------------
function useApi(token) {
  return useCallback(async (path, opts = {}) => {
    const headers = opts.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
  }, [token]);
}

// ---- Auth screen ------------------------------------------------------------
function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const api = useApi(null);

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password };
      const data = await api(path, {
  method: "POST",
  body: JSON.stringify(body)
});

localStorage.setItem("token", data.token);
localStorage.setItem("user", JSON.stringify(data.user));

onAuthed(data.token, data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-emoji">🍳</div>
      <h1 className="auth-title">CookTok</h1>
      <p className="auth-sub">{mode === "login" ? "Welcome back" : "Create your account"}</p>

      {mode === "register" && (
        <input className="field-input" placeholder="Username" value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
      )}
      <input className="field-input" placeholder="Email" type="email" value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
      <input className="field-input" placeholder="Password (8+ characters)" type="password" value={form.password}
        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />

      {error && <p className="auth-error">{error}</p>}

      <button className="btn-primary" style={{ marginTop: 10 }} disabled={loading} onClick={submit}>
        {loading ? <Loader2 size={16} className="spin" /> : (mode === "login" ? "Log in" : "Sign up")}
      </button>
      <button className="btn-ghost-link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
        {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
      </button>
    </div>
  );
}

// ---- Recipe sheet (detail + comments) --------------------------------------
function RecipeSheet({ recipe, api, token, onClose }) {
  const [checked, setChecked] = useState({});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    api(`/api/recipes/${recipe.id}/comments`)
      .then((d) => setComments(d.comments))
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [recipe.id, api]);

  const postComment = async () => {
    if (!newComment.trim() || !token) return;
    try {
      const d = await api(`/api/recipes/${recipe.id}/comments`, {
        method: "POST", body: JSON.stringify({ body: newComment.trim() }),
      });
      setComments((c) => [...c, { ...d.comment, username: "you" }]);
      setNewComment("");
    } catch { /* surfaced via disabled state, keep it simple */ }
  };

  const toggle = (i) => setChecked((c) => ({ ...c, [i]: !c[i] }));

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-tear" />
        <div className="sheet-content">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="recipe-title-lg">{recipe.title}</h2>
              <p className="text-sm" style={{ color: PALETTE.creamDim }}>@{recipe.creator?.username} · {recipe.cuisine}</p>
            </div>
            <button onClick={onClose} className="icon-btn-sm" style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999 }}>
              <X size={18} color={PALETTE.cream} />
            </button>
          </div>

          <div className="flex gap-4 mb-4 stat-row">
            <div className="stat"><Clock size={15} /><span>{(recipe.prep || 0) + (recipe.cook || 0)} min</span></div>
            <div className="stat"><Users size={15} /><span>{recipe.servings} servings</span></div>
            <div className="stat"><Flame size={15} /><span>{recipe.difficulty}</span></div>
          </div>

          <h3 className="section-label">Ingredients</h3>
          <ul className="mb-4">
            {(recipe.ingredients || []).map((ing, i) => (
              <li key={i} className="ing-row" onClick={() => toggle(i)}>
                <span className={`check-box ${checked[i] ? "checked" : ""}`}>{checked[i] && <Check size={12} color="#1C140E" />}</span>
                <span style={{ textDecoration: checked[i] ? "line-through" : "none", opacity: checked[i] ? 0.5 : 1, fontFamily: "JetBrains Mono, monospace", fontSize: 13.5 }}>{ing}</span>
              </li>
            ))}
          </ul>

          <h3 className="section-label">Steps</h3>
          <ol className="mb-4">
            {(recipe.steps || []).map((s, i) => (
              <li key={i} className="step-row">
                <span className="step-num">{i + 1}</span>
                <span className="text-sm" style={{ color: PALETTE.cream }}>{s}</span>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-2 mb-4">
            {(recipe.tags || []).map((t) => <span key={t} className="tag-chip">{t}</span>)}
          </div>

          <h3 className="section-label">Comments ({comments.length})</h3>
          {loadingComments && <Loader2 size={16} className="spin" />}
          <div className="mb-3">
            {comments.map((c) => (
              <div key={c.id} className="comment-row">
                <span className="comment-user">@{c.username}</span>
                <span className="comment-body">{c.body}</span>
              </div>
            ))}
            {!loadingComments && comments.length === 0 && (
              <p className="text-xs" style={{ color: PALETTE.creamDim }}>No comments yet — be the first.</p>
            )}
          </div>
          {token ? (
            <div className="comment-input-row">
              <input className="field-input flex-1" placeholder="Add a comment"
                value={newComment} onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && postComment()} />
              <button className="icon-btn-sm" onClick={postComment}><Send size={17} color={PALETTE.butter} /></button>
            </div>
          ) : (
            <p className="text-xs" style={{ color: PALETTE.creamDim }}>Log in to comment.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedCard({ recipe, token, onLike, onSave, api }) {
  const [openSheet, setOpenSheet] = useState(false);
  const theme = themeFor(recipe.id);
  const loggedView = useRef(false);

  useEffect(() => {
    if (loggedView.current) return;
    loggedView.current = true;
    api(`/api/recipes/${recipe.id}/view`, { method: "POST" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id]);

  return (
    <div className="feed-card">
      {recipe.videoUrl ? (
        <video className="card-video" src={recipe.videoUrl} poster={recipe.thumbnailUrl} muted loop autoPlay playsInline />
      ) : (
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 30%, ${theme.from}, ${theme.to} 65%, #150F0A 100%)` }}>
          <div className="dish-emoji">{theme.emoji}</div>
        </div>
      )}
      <div className="card-scrim" />

      <div className="action-rail">
        <button className="action-btn" onClick={() => onLike(recipe)} disabled={!token}>
          <Heart size={27} fill={recipe.liked ? PALETTE.chili : "none"} color={recipe.liked ? PALETTE.chili : PALETTE.cream} />
          <span>{formatCount(recipe.likes)}</span>
        </button>
        <button className="action-btn" onClick={() => setOpenSheet(true)}>
          <MessageCircle size={27} color={PALETTE.cream} /><span>{formatCount(recipe.comments)}</span>
        </button>
        <button className="action-btn" onClick={() => onSave(recipe)} disabled={!token}>
          <Bookmark size={27} fill={recipe.saved ? PALETTE.butter : "none"} color={recipe.saved ? PALETTE.butter : PALETTE.cream} />
          <span>Save</span>
        </button>
        <button className="action-btn"><Share2 size={25} color={PALETTE.cream} /><span>Share</span></button>
      </div>

      <div className="card-info" onClick={() => setOpenSheet(true)}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="avatar">{recipe.creator?.username?.[0]?.toUpperCase() || "?"}</div>
          <span className="creator-name">@{recipe.creator?.username}</span>
          <span className="cuisine-pill">{recipe.cuisine}</span>
        </div>
        <h3 className="card-title">{recipe.title}</h3>
      </div>

      {openSheet && <RecipeSheet recipe={recipe} api={api} token={token} onClose={() => setOpenSheet(false)} />}
    </div>
  );
}

// ---- Search & filter screen -------------------------------------------------
const TIME_OPTIONS = [
  { label: "Any time", value: "" },
  { label: "Under 15 min", value: "15" },
  { label: "Under 30 min", value: "30" },
  { label: "Under 60 min", value: "60" },
];

function SearchScreen({ api, token, onOpenRecipe }) {
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({ cuisine: "", country: "", mealCategory: "", difficulty: "", maxTime: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [meta, setMeta] = useState({ mealCategories: [], difficulties: [] });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => { api("/api/recipes/meta").then(setMeta).catch(() => {}); }, [api]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  useEffect(() => {
    const hasQuery = q.trim() || activeFilterCount > 0;
    if (!hasQuery) { setResults([]); setSearched(false); return; }
    setLoading(true); setSearched(true);
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ limit: "20" });
      if (q.trim()) params.set("q", q.trim());
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      api(`/api/recipes/feed?${params.toString()}`)
        .then((d) => setResults(d.recipes))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 350); // debounce so we don't fire a request on every keystroke
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filters, api]);

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: f[k] === v ? "" : v }));

  return (
    <div className="search-screen">
      <div className="search-bar-row">
        <div className="search-input-wrap">
          <Search size={16} color={PALETTE.creamDim} />
          <input
            className="search-input"
            placeholder="Search dish, ingredient, cuisine, creator..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button className={`filter-toggle ${activeFilterCount ? "active" : ""}`} onClick={() => setShowFilters((s) => !s)}>
          <SlidersHorizontal size={16} />
          {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <input className="field-input" placeholder="Cuisine (e.g. West African)" value={filters.cuisine}
            onChange={(e) => setFilters((f) => ({ ...f, cuisine: e.target.value }))} />
          <input className="field-input" placeholder="Country of origin" value={filters.country}
            onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))} />

          <label className="field-label">Meal category</label>
          <div className="chip-wrap">
            {meta.mealCategories.map((m) => (
              <button key={m} className={`filter-chip ${filters.mealCategory === m ? "active" : ""}`} onClick={() => setFilter("mealCategory", m)}>{m}</button>
            ))}
          </div>

          <label className="field-label">Difficulty</label>
          <div className="chip-wrap">
            {meta.difficulties.map((d) => (
              <button key={d} className={`filter-chip ${filters.difficulty === d ? "active" : ""}`} onClick={() => setFilter("difficulty", d)}>{d}</button>
            ))}
          </div>

          <label className="field-label">Cooking time</label>
          <div className="chip-wrap">
            {TIME_OPTIONS.map((t) => (
              <button key={t.label} className={`filter-chip ${filters.maxTime === t.value ? "active" : ""}`}
                onClick={() => setFilters((f) => ({ ...f, maxTime: f.maxTime === t.value ? "" : t.value }))}>{t.label}</button>
            ))}
          </div>

          {activeFilterCount > 0 && (
            <button className="btn-ghost-link" onClick={() => setFilters({ cuisine: "", country: "", mealCategory: "", difficulty: "", maxTime: "" })}>Clear filters</button>
          )}
        </div>
      )}

      <div className="search-results">
        {loading && <div className="center-msg" style={{ height: 120 }}><Loader2 size={20} className="spin" /></div>}
        {!loading && searched && results.length === 0 && (
          <p className="text-sm" style={{ color: PALETTE.creamDim, padding: "20px 4px" }}>No recipes match that search.</p>
        )}
        {!loading && !searched && (
          <p className="text-sm" style={{ color: PALETTE.creamDim, padding: "20px 4px" }}>Search by dish name, ingredient, creator, cuisine, country, hashtag, difficulty, or cooking time.</p>
        )}
        {results.map((r) => {
          const t = themeFor(r.id);
          return (
            <button key={r.id} className="result-row" onClick={() => onOpenRecipe(r)}>
              <div className="result-thumb" style={{ background: `linear-gradient(160deg, ${t.from}, ${t.to})` }}>{t.emoji}</div>
              <div className="result-info">
                <div className="result-title">{r.title}</div>
                <div className="result-meta">@{r.creator?.username} · {r.cuisine || "—"} · {r.difficulty}</div>
                <div className="result-meta">{(r.prep || 0) + (r.cook || 0)} min · {formatCount(r.likes)} likes</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileEditModal({ user, api, onSaved, onClose }) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const onPickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      const fd = new FormData();
      fd.append("displayName", displayName);
      fd.append("bio", bio);
      if (avatarFile) fd.append("avatar", avatarFile);
      const data = await api("/api/users/me", { method: "PATCH", body: fd });
      onSaved(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-tear" />
        <div className="sheet-content">
          <div className="flex items-start justify-between mb-4">
            <h2 className="recipe-title-lg">Edit profile</h2>
            <button onClick={onClose} className="icon-btn-sm" style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999 }}><X size={18} color={PALETTE.cream} /></button>
          </div>

          <div className="avatar-edit-wrap" onClick={() => fileRef.current?.click()}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar preview" className="avatar-edit-img" />
            ) : (
              <div className="avatar" style={{ width: 72, height: 72, fontSize: 26 }}>{user?.username?.[0]?.toUpperCase()}</div>
            )}
            <div className="avatar-edit-badge"><Camera size={13} /></div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />

          <label className="field-label">Display name</label>
          <input className="field-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={user?.username} />

          <label className="field-label">Bio</label>
          <textarea className="field-input" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people what you cook" />

          {error && <p className="auth-error" style={{ textAlign: "left" }}>{error}</p>}

          <button className="btn-primary" style={{ marginTop: 14 }} disabled={saving} onClick={save}>
            {saving ? <Loader2 size={16} className="spin" /> : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Creator dashboard --------------------------------------------------
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ACTIVITY_COPY = {
  like: { icon: Heart, verb: "liked" },
  save: { icon: Bookmark, verb: "saved" },
  comment: { icon: MessageCircle, verb: "commented on" },
  follow: { icon: UserPlus, verb: "followed you" },
};

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="stat-card">
      <Icon size={16} color={accent} />
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

function Dashboard({ api, onClose }) {
  const [summary, setSummary] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true); setError("");
    Promise.all([
      api("/api/dashboard/summary"),
      api("/api/dashboard/recipes"),
      api("/api/dashboard/activity?limit=20"),
    ])
      .then(([s, r, a]) => { setSummary(s); setRecipes(r.recipes); setActivity(a.activity); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [api]);

  const chartData = recipes.slice(0, 6).map((r) => ({
    name: r.title.length > 12 ? r.title.slice(0, 12) + "…" : r.title,
    views: r.views,
  }));

  return (
    <div className="upload-overlay">
      <div className="upload-header">
        <button onClick={onClose} className="icon-btn-sm" style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999 }}><X size={18} color={PALETTE.cream} /></button>
        <span className="upload-title">Your dashboard</span>
        <div style={{ width: 34 }} />
      </div>

      <div className="dashboard-body">
        {loading && <div className="center-msg" style={{ height: 200 }}><Loader2 size={22} className="spin" /></div>}
        {error && <div className="center-msg" style={{ height: 200 }}><p style={{ color: PALETTE.creamDim }}>{error}</p></div>}

        {!loading && !error && summary && (
          <>
            <div className="stat-grid">
              <StatCard icon={Eye} label="Views" value={formatCount(summary.totalViews)} accent={PALETTE.butter} />
              <StatCard icon={Heart} label="Likes" value={formatCount(summary.totalLikes)} accent={PALETTE.chili} />
              <StatCard icon={Bookmark} label="Saves" value={formatCount(summary.totalSaves)} accent={PALETTE.herb} />
              <StatCard icon={MessageCircle} label="Comments" value={formatCount(summary.totalComments)} accent={PALETTE.butter} />
              <StatCard icon={Users} label="Followers" value={formatCount(summary.followerCount)} accent={PALETTE.chili} />
              <StatCard icon={TrendingUp} label="Engagement" value={`${summary.engagementRate}%`} accent={PALETTE.herb} />
            </div>

            {chartData.length > 0 && (
              <>
                <h3 className="section-label">Views by video</h3>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fill: PALETTE.creamDim, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: PALETTE.creamDim, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: PALETTE.charLight, border: "none", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: PALETTE.cream }} />
                      <Bar dataKey="views" fill={PALETTE.butter} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            <h3 className="section-label">Best performing</h3>
            {recipes.slice(0, 5).map((r, i) => (
              <div key={r.id} className="perf-row">
                <span className="perf-rank">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="perf-title">{r.title}</div>
                  <div className="perf-meta">
                    <Eye size={11} /> {formatCount(r.views)}
                    <Heart size={11} style={{ marginLeft: 8 }} /> {formatCount(r.likes)}
                    <Bookmark size={11} style={{ marginLeft: 8 }} /> {formatCount(r.saves)}
                    <span style={{ marginLeft: 8, color: PALETTE.herb }}>{r.engagementRate}% engagement</span>
                  </div>
                </div>
              </div>
            ))}
            {recipes.length === 0 && <p className="text-xs" style={{ color: PALETTE.creamDim }}>Publish a recipe to start seeing performance data.</p>}

            <h3 className="section-label">All videos</h3>
            <div className="mb-2">
              {recipes.map((r) => (
                <div key={r.id} className="perf-row">
                  <div className="flex-1 min-w-0">
                    <div className="perf-title">{r.title}</div>
                    <div className="perf-meta">
                      <Eye size={11} /> {formatCount(r.views)}
                      <Heart size={11} style={{ marginLeft: 8 }} /> {formatCount(r.likes)}
                      <MessageCircle size={11} style={{ marginLeft: 8 }} /> {formatCount(r.comments)}
                      <Bookmark size={11} style={{ marginLeft: 8 }} /> {formatCount(r.saves)}
                    </div>
                  </div>
                  <span className="perf-engagement">{r.engagementRate}%</span>
                </div>
              ))}
            </div>

            <h3 className="section-label">Recent activity</h3>
            {activity.map((a, i) => {
              const copy = ACTIVITY_COPY[a.type] || ACTIVITY_COPY.like;
              const Icon = copy.icon;
              return (
                <div key={i} className="activity-row">
                  <Icon size={14} color={PALETTE.creamDim} />
                  <div className="activity-text">
                    <b>@{a.username}</b> {copy.verb}{a.recipe_title ? <> "{a.recipe_title}"</> : ""}
                  </div>
                  <span className="activity-time">{timeAgo(a.created_at)}</span>
                </div>
              );
            })}
            {activity.length === 0 && <p className="text-xs" style={{ color: PALETTE.creamDim }}>No activity yet.</p>}
          </>
        )}
      </div>
    </div>
  );
}

function UploadFlow({ api, onPublished, onClose }) {
  const [step, setStep] = useState(0);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "", cuisine: "", country: "", mealCategory: "", difficulty: "Easy", prep: "", cook: "", servings: "",
    ingredients: [""], steps: [""], tags: "",
  });
  const [meta, setMeta] = useState({ mealCategories: [] });
  const fileInputRef = useRef(null);

  useEffect(() => { api("/api/recipes/meta").then(setMeta).catch(() => {}); }, [api]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const updateList = (key, i, v) => { const l = [...form[key]]; l[i] = v; setForm((f) => ({ ...f, [key]: l })); };
  const addToList = (key) => setForm((f) => ({ ...f, [key]: [...f[key], ""] }));
  const removeFromList = (key, i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, idx) => idx !== i) }));

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const canNext0 = form.title.trim() && form.cuisine.trim();
  const canPublish = form.ingredients.filter((x) => x.trim()).length > 0 && form.steps.filter((x) => x.trim()).length > 0;

  const publish = async () => {
    setPublishing(true); setError("");
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("cuisine", form.cuisine);
      fd.append("country", form.country);
      fd.append("mealCategory", form.mealCategory);
      fd.append("difficulty", form.difficulty);
      fd.append("prep", form.prep || 0);
      fd.append("cook", form.cook || 0);
      fd.append("servings", form.servings || 1);
      fd.append("tags", form.tags);
      fd.append("ingredients", JSON.stringify(form.ingredients.filter((x) => x.trim())));
      fd.append("steps", JSON.stringify(form.steps.filter((x) => x.trim())));
      if (videoFile) fd.append("video", videoFile);

      const data = await api("/api/recipes", { method: "POST", body: fd });
      onPublished(data.recipe);
    } catch (e) {
      setError(e.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="upload-overlay">
      <div className="upload-header">
        <button onClick={onClose} className="icon-btn-sm" style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999 }}><X size={18} color={PALETTE.cream} /></button>
        <span className="upload-title">New recipe</span>
        <div style={{ width: 34 }} />
      </div>

      <div className="upload-progress">
        {["Basics", "Video", "Ingredients", "Steps"].map((label, i) => (
          <div key={label} className={`prog-dot ${i <= step ? "active" : ""}`} onClick={() => i < step && setStep(i)}><span>{i + 1}</span></div>
        ))}
      </div>

      <div className="upload-body">
        {step === 0 && (
          <div className="fade-in">
            <label className="field-label">Recipe title</label>
            <input className="field-input" placeholder="e.g. Smoky Jollof Rice" value={form.title} onChange={(e) => set("title", e.target.value)} />
            <label className="field-label">Cuisine / origin</label>
            <input className="field-input" placeholder="e.g. West African" value={form.cuisine} onChange={(e) => set("cuisine", e.target.value)} />
            <label className="field-label">Country</label>
            <input className="field-input" placeholder="e.g. Ghana" value={form.country} onChange={(e) => set("country", e.target.value)} />
            <label className="field-label">Meal category</label>
            <div className="chip-wrap mb-2">
              {(meta.mealCategories.length ? meta.mealCategories : ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Drink"]).map((m) => (
                <button key={m} type="button" className={`filter-chip ${form.mealCategory === m ? "active" : ""}`} onClick={() => set("mealCategory", form.mealCategory === m ? "" : m)}>{m}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="field-label">Prep (min)</label><input type="number" className="field-input" value={form.prep} onChange={(e) => set("prep", e.target.value)} /></div>
              <div><label className="field-label">Cook (min)</label><input type="number" className="field-input" value={form.cook} onChange={(e) => set("cook", e.target.value)} /></div>
              <div><label className="field-label">Servings</label><input type="number" className="field-input" value={form.servings} onChange={(e) => set("servings", e.target.value)} /></div>
            </div>
            <label className="field-label">Difficulty</label>
            <div className="flex gap-2 mb-2">
              {["Easy", "Medium", "Hard"].map((d) => (
                <button key={d} onClick={() => set("difficulty", d)} className={`diff-chip ${form.difficulty === d ? "active" : ""}`}>{d}</button>
              ))}
            </div>
            <label className="field-label">Hashtags</label>
            <input className="field-input" placeholder="#jollof #onepot" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </div>
        )}

        {step === 1 && (
          <div className="fade-in">
            <label className="field-label">Upload your video</label>
            <p className="text-xs mb-3" style={{ color: PALETTE.creamDim }}>MP4, MOV or WebM, up to 200MB. Optional — you can publish with just a cover if you skip this.</p>
            {videoPreview ? (
              <div className="video-preview-wrap">
                <video src={videoPreview} className="video-preview" controls />
                <button className="btn-ghost" style={{ marginTop: 10 }} onClick={() => { setVideoFile(null); setVideoPreview(null); }}>Remove video</button>
              </div>
            ) : (
              <button className="video-drop" onClick={() => fileInputRef.current?.click()}>
                <VideoIcon size={30} color={PALETTE.creamDim} />
                <span>Tap to choose a video</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={onFileChange} />
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <label className="field-label">Ingredients</label>
            {form.ingredients.map((ing, i) => (
              <div key={i} className="list-row">
                <input className="field-input flex-1" placeholder={`Ingredient ${i + 1}`} value={ing} onChange={(e) => updateList("ingredients", i, e.target.value)} />
                {form.ingredients.length > 1 && <button onClick={() => removeFromList("ingredients", i)} className="icon-btn-sm"><Trash2 size={15} color={PALETTE.creamDim} /></button>}
              </div>
            ))}
            <button className="add-row-btn" onClick={() => addToList("ingredients")}><Plus size={14} /> Add ingredient</button>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
            <label className="field-label">Steps</label>
            {form.steps.map((s, i) => (
              <div key={i} className="list-row items-start">
                <span className="step-num" style={{ marginTop: 8 }}>{i + 1}</span>
                <textarea className="field-input flex-1" rows={2} placeholder={`Step ${i + 1}`} value={s} onChange={(e) => updateList("steps", i, e.target.value)} />
                {form.steps.length > 1 && <button onClick={() => removeFromList("steps", i)} className="icon-btn-sm" style={{ marginTop: 8 }}><Trash2 size={15} color={PALETTE.creamDim} /></button>}
              </div>
            ))}
            <button className="add-row-btn" onClick={() => addToList("steps")}><Plus size={14} /> Add step</button>
            {error && <p className="auth-error">{error}</p>}
          </div>
        )}
      </div>

      <div className="upload-footer">
        {step > 0 && <button className="btn-ghost" onClick={() => setStep((s) => s - 1)}>Back</button>}
        {step < 3 && <button className="btn-primary" disabled={step === 0 && !canNext0} onClick={() => setStep((s) => s + 1)}>Continue</button>}
        {step === 3 && (
          <button className="btn-primary" disabled={!canPublish || publishing} onClick={publish}>
            {publishing ? <Loader2 size={16} className="spin" /> : "Publish"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CookTok() {
 const [token, setToken] = useState(() => localStorage.getItem("token"));
const [user, setUser] = useState(() => {
  const savedUser = localStorage.getItem("user");
  return savedUser ? JSON.parse(savedUser) : null;
});
  const [recipes, setRecipes] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [tab, setTab] = useState("feed");
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [searchOpenRecipe, setSearchOpenRecipe] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const api = useApi(token);

  const loadFeed = useCallback(() => {
    setFeedLoading(true); setFeedError("");
    api("/api/recipes/feed?page=1&limit=20")
      .then((d) => setRecipes(d.recipes))
      .catch((e) => setFeedError(e.message))
      .finally(() => setFeedLoading(false));
  }, [api]);

  useEffect(() => { if (token !== null || token === null) loadFeed(); }, [loadFeed]);

  useEffect(() => {
    if (tab === "saved" && token) {
      api("/api/users/me/saved").then((d) => setSavedRecipes(d.recipes)).catch(() => {});
    }
  }, [tab, token, api]);

  const handleAuthed = (tok, u) => { setToken(tok); setUser(u); };

  const toggleLike = async (recipe) => {
    setRecipes((rs) => rs.map((r) => r.id === recipe.id ? { ...r, liked: !r.liked, likes: r.likes + (r.liked ? -1 : 1) } : r));
    try {
      const d = await api(`/api/recipes/${recipe.id}/like`, { method: "POST" });
      setRecipes((rs) => rs.map((r) => r.id === recipe.id ? { ...r, liked: d.liked, likes: d.likes } : r));
    } catch { loadFeed(); }
  };
  const toggleSave = async (recipe) => {
    setRecipes((rs) => rs.map((r) => r.id === recipe.id ? { ...r, saved: !r.saved } : r));
    try { await api(`/api/recipes/${recipe.id}/save`, { method: "POST" }); } catch { loadFeed(); }
  };
  const onPublished = (recipe) => {
    setRecipes((rs) => [recipe, ...rs]);
    setShowUpload(false);
    setTab("feed");
  };

  if (!token) {
    return (
      <div className="app-root">
        <style>{GLOBAL_CSS}</style>
        <AuthScreen onAuthed={handleAuthed} />
      </div>
    );
  }

  return (
    <div className="app-root">
      <style>{GLOBAL_CSS}</style>

      {tab === "feed" && (
        <div className="feed-scroll">
          {feedLoading && <div className="center-msg"><Loader2 size={22} className="spin" /></div>}
          {feedError && (
            <div className="center-msg">
              <p style={{ color: PALETTE.creamDim, marginBottom: 10 }}>Couldn't reach the API at {API_BASE_URL}.<br />{feedError}</p>
              <button className="btn-primary" style={{ width: "auto", padding: "10px 20px" }} onClick={loadFeed}>Retry</button>
            </div>
          )}
          {!feedLoading && !feedError && recipes.length === 0 && (
            <div className="center-msg"><p style={{ color: PALETTE.creamDim }}>No recipes yet — be the first to post one.</p></div>
          )}
          {recipes.map((r) => <FeedCard key={r.id} recipe={r} token={token} api={api} onLike={toggleLike} onSave={toggleSave} />)}
        </div>
      )}

      {tab === "search" && (
        <SearchScreen api={api} token={token} onOpenRecipe={setSearchOpenRecipe} />
      )}
      {searchOpenRecipe && (
        <RecipeSheet recipe={searchOpenRecipe} api={api} token={token} onClose={() => setSearchOpenRecipe(null)} />
      )}

      {tab === "saved" && (
        <div className="feed-scroll" style={{ padding: "20px 16px 80px", overflowY: "auto", scrollSnapType: "none" }}>
          <h2 className="recipe-title-lg mb-4">Saved recipes</h2>
          {savedRecipes.length === 0 && <p className="text-sm" style={{ color: PALETTE.creamDim }}>Nothing saved yet.</p>}
          <div className="grid grid-cols-2 gap-3">
            {savedRecipes.map((r) => {
              const t = themeFor(r.id);
              return (
                <div key={r.id} className="rounded-xl p-3" style={{ background: `linear-gradient(160deg, ${t.from}, ${t.to})` }}>
                  <div className="text-3xl mb-2">{t.emoji}</div>
                  <div className="text-sm font-bold recipe-title-lg" style={{ fontSize: 15 }}>{r.title}</div>
                  <div className="text-xs mt-1" style={{ color: "rgba(245,238,224,0.8)" }}>@{r.username}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "profile" && (
        <div style={{ padding: "24px 20px 80px", overflowY: "auto", height: "100%" }}>
          <div className="flex items-center gap-3 mb-2">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="avatar-edit-img" style={{ width: 56, height: 56 }} />
            ) : (
              <div className="avatar" style={{ width: 56, height: 56, fontSize: 22 }}>{user?.username?.[0]?.toUpperCase()}</div>
            )}
            <div>
              <div className="recipe-title-lg" style={{ fontSize: 18 }}>{user?.displayName || `@${user?.username}`}</div>
              <div className="text-xs" style={{ color: PALETTE.creamDim }}>@{user?.username}</div>
            </div>
          </div>
          {user?.bio && <p className="text-sm mb-4" style={{ color: PALETTE.creamDim }}>{user.bio}</p>}
          <button className="btn-ghost mb-5" onClick={() => setEditingProfile(true)}>
            <Pencil size={13} style={{ marginRight: 6, display: "inline" }} /> Edit profile
          </button>
          <button className="btn-ghost mb-5" style={{ marginLeft: 8 }} onClick={() => setShowDashboard(true)}>
            <BarChart3 size={13} style={{ marginRight: 6, display: "inline" }} /> Analytics
          </button>

          <div className="grid grid-cols-3 gap-2">
            {recipes.filter((r) => r.creator?.username === user?.username).map((r) => {
              const t = themeFor(r.id);
              return <div key={r.id} className="aspect-square rounded-lg flex items-center justify-center text-2xl" style={{ background: `linear-gradient(160deg, ${t.from}, ${t.to})` }}>{t.emoji}</div>;
            })}
          </div>
         <button
  className="btn-ghost"
  style={{ marginTop: 20 }}
  onClick={() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }}
>
  Log out
</button>
        </div>
      )}

      {editingProfile && (
        <ProfileEditModal
          user={user}
          api={api}
          onClose={() => setEditingProfile(false)}
          onSaved={(u) => { setUser(u); setEditingProfile(false); }}
        />
      )}

      {!showUpload && !showDashboard && (
        <div className="bottom-nav">
          <button className={`nav-btn ${tab === "feed" ? "active" : ""}`} onClick={() => setTab("feed")}><Home size={20} /><span>Feed</span></button>
          <button className={`nav-btn ${tab === "search" ? "active" : ""}`} onClick={() => setTab("search")}><Search size={20} /><span>Discover</span></button>
          <button className="nav-upload-btn" onClick={() => setShowUpload(true)}><Plus size={20} color={PALETTE.char} strokeWidth={3} /></button>
          <button className={`nav-btn ${tab === "saved" ? "active" : ""}`} onClick={() => setTab("saved")}><Bookmark size={20} /><span>Saved</span></button>
          <button className={`nav-btn ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}><User size={20} /><span>Profile</span></button>
        </div>
      )}

      {showUpload && <UploadFlow api={api} onPublished={onPublished} onClose={() => setShowUpload(false)} />}
      {showDashboard && <Dashboard api={api} onClose={() => setShowDashboard(false)} />}
    </div>
  );
}

const GLOBAL_CSS = `
  ${FONT_IMPORT}
  * { box-sizing: border-box; }
  .app-root { font-family: 'Space Grotesk', sans-serif; background: ${PALETTE.char}; color: ${PALETTE.cream}; width: 100%; height: 100vh; max-height: 100vh; position: relative; overflow: hidden; }
  .feed-scroll { height: 100%; overflow-y: scroll; scroll-snap-type: y mandatory; }
  .feed-card { height: 100%; scroll-snap-align: start; position: relative; display: flex; align-items: flex-end; overflow: hidden; }
  .card-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .dish-emoji { position: absolute; top: 30%; left: 50%; transform: translate(-50%,-50%); font-size: 120px; }
  .card-scrim { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 45%, transparent 65%); }
  .action-rail { position: absolute; right: 12px; bottom: 110px; display: flex; flex-direction: column; gap: 18px; z-index: 5; }
  .action-btn { display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; color: ${PALETTE.cream}; font-size: 11px; font-weight: 600; }
  .action-btn:disabled { opacity: 0.4; }
  .card-info { position: relative; z-index: 5; padding: 0 68px 22px 16px; width: 100%; }
  .avatar { width: 26px; height: 26px; border-radius: 50%; background: ${PALETTE.chili}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; border: 1.5px solid ${PALETTE.cream}; }
  .creator-name { font-size: 13px; font-weight: 600; }
  .cuisine-pill { font-size: 10.5px; padding: 2px 8px; border-radius: 20px; background: rgba(245,238,224,0.15); color: ${PALETTE.creamDim}; }
  .card-title { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 700; line-height: 1.15; text-shadow: 0 2px 12px rgba(0,0,0,0.5); }
  .recipe-title-lg { font-family: 'Fraunces', serif; font-weight: 700; font-size: 22px; }
  .sheet-backdrop { position: absolute; inset: 0; z-index: 30; background: rgba(0,0,0,0.55); display: flex; align-items: flex-end; }
  .sheet { width: 100%; max-height: 82%; background: ${PALETTE.charLight}; border-radius: 22px 22px 0 0; overflow-y: auto; box-shadow: 0 -10px 40px rgba(0,0,0,0.4); }
  .sheet-tear { height: 14px; width: 100%; background: repeating-linear-gradient(115deg, ${PALETTE.charLight} 0 8px, transparent 8px 10px); }
  .sheet-content { padding: 6px 20px 28px; }
  .stat-row { border-top: 1px dashed rgba(245,238,224,0.2); border-bottom: 1px dashed rgba(245,238,224,0.2); padding: 10px 0; }
  .stat { display: flex; align-items: center; gap: 5px; font-size: 12.5px; color: ${PALETTE.creamDim}; }
  .section-label { font-family: 'Fraunces', serif; font-weight: 700; font-size: 15px; color: ${PALETTE.butter}; margin: 14px 0 8px; }
  .ing-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; cursor: pointer; }
  .check-box { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid ${PALETTE.herb}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .check-box.checked { background: ${PALETTE.herb}; }
  .step-row { display: flex; gap: 10px; padding: 7px 0; align-items: flex-start; }
  .step-num { width: 20px; height: 20px; border-radius: 50%; background: ${PALETTE.chili}; color: ${PALETTE.cream}; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-family: 'JetBrains Mono', monospace; }
  .tag-chip { font-size: 12px; padding: 4px 10px; border-radius: 20px; background: rgba(140,163,58,0.18); color: ${PALETTE.herb}; font-family: 'JetBrains Mono', monospace; }
  .comment-row { padding: 5px 0; font-size: 13px; }
  .comment-user { font-weight: 700; color: ${PALETTE.butter}; margin-right: 6px; }
  .comment-body { color: ${PALETTE.cream}; }
  .comment-input-row { display: flex; gap: 8px; align-items: center; }
  .bottom-nav { position: absolute; bottom: 0; left: 0; right: 0; z-index: 20; height: 62px; background: rgba(28,20,14,0.92); backdrop-filter: blur(10px); border-top: 1px solid rgba(245,238,224,0.08); display: flex; align-items: center; justify-content: space-around; }
  .nav-btn { background: none; border: none; display: flex; flex-direction: column; align-items: center; gap: 2px; color: ${PALETTE.creamDim}; font-size: 9.5px; }
  .nav-btn.active { color: ${PALETTE.butter}; }
  .nav-upload-btn { width: 44px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, ${PALETTE.chili}, ${PALETTE.butter}); display: flex; align-items: center; justify-content: center; border: none; }
  .upload-overlay { position: absolute; inset: 0; z-index: 40; background: ${PALETTE.char}; display: flex; flex-direction: column; }
  .upload-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 8px; }
  .upload-title { font-family: 'Fraunces', serif; font-weight: 700; font-size: 17px; }
  .upload-progress { display: flex; justify-content: center; gap: 8px; padding: 6px 0 14px; }
  .prog-dot { width: 24px; height: 24px; border-radius: 50%; background: rgba(245,238,224,0.1); display: flex; align-items: center; justify-content: center; font-size: 11px; color: ${PALETTE.creamDim}; }
  .prog-dot.active { background: ${PALETTE.chili}; color: ${PALETTE.cream}; }
  .upload-body { flex: 1; overflow-y: auto; padding: 4px 18px 18px; }
  .fade-in { animation: fadeIn 0.25s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .field-label { display: block; font-size: 12px; color: ${PALETTE.creamDim}; margin: 12px 0 5px; font-weight: 600; }
  .field-input { width: 100%; background: ${PALETTE.charLight}; border: 1px solid rgba(245,238,224,0.12); border-radius: 10px; padding: 10px 12px; color: ${PALETTE.cream}; font-size: 14px; font-family: 'Space Grotesk', sans-serif; outline: none; margin-bottom: 8px; }
  .field-input:focus { border-color: ${PALETTE.butter}; }
  .diff-chip { padding: 7px 14px; border-radius: 20px; border: 1px solid rgba(245,238,224,0.15); background: transparent; color: ${PALETTE.creamDim}; font-size: 12.5px; font-weight: 600; }
  .diff-chip.active { background: ${PALETTE.herb}; color: ${PALETTE.char}; border-color: ${PALETTE.herb}; }
  .list-row { display: flex; gap: 8px; margin-bottom: 8px; }
  .icon-btn-sm { background: none; border: none; padding: 8px; flex-shrink: 0; }
  .add-row-btn { display: flex; align-items: center; gap: 6px; background: none; border: 1px dashed rgba(245,238,224,0.25); color: ${PALETTE.creamDim}; border-radius: 10px; padding: 9px 14px; font-size: 13px; width: 100%; justify-content: center; margin-top: 4px; }
  .upload-footer { display: flex; gap: 10px; padding: 14px 18px 20px; border-top: 1px solid rgba(245,238,224,0.08); }
  .btn-ghost { flex: 0 0 auto; padding: 12px 18px; border-radius: 12px; background: rgba(245,238,224,0.08); border: none; color: ${PALETTE.cream}; font-weight: 600; font-size: 14px; }
  .btn-ghost-link { background: none; border: none; color: ${PALETTE.creamDim}; font-size: 13px; margin-top: 14px; text-decoration: underline; }
  .btn-primary { flex: 1; width: 100%; padding: 12px; border-radius: 12px; border: none; font-weight: 700; font-size: 14px; background: linear-gradient(135deg, ${PALETTE.chili}, ${PALETTE.butter}); color: ${PALETTE.char}; display: flex; align-items: center; justify-content: center; }
  .btn-primary:disabled { opacity: 0.35; }
  .video-drop { width: 100%; height: 160px; border-radius: 14px; border: 1px dashed rgba(245,238,224,0.3); background: ${PALETTE.charLight}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: ${PALETTE.creamDim}; font-size: 13px; }
  .video-preview-wrap { display: flex; flex-direction: column; }
  .video-preview { width: 100%; border-radius: 14px; max-height: 260px; }
  .hidden { display: none; }
  .auth-screen { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 28px; }
  .auth-emoji { font-size: 48px; margin-bottom: 6px; }
  .auth-title { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 800; margin-bottom: 4px; }
  .auth-sub { color: ${PALETTE.creamDim}; font-size: 13px; margin-bottom: 22px; }
  .auth-screen .field-input { max-width: 320px; }
  .auth-error { color: ${PALETTE.chili}; font-size: 12.5px; margin-top: 6px; max-width: 320px; text-align: center; }
  .center-msg { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 30px; }
  .search-screen { height: 100%; overflow-y: auto; padding: 16px 16px 80px; }
  .search-bar-row { display: flex; gap: 8px; align-items: center; }
  .search-input-wrap { flex: 1; display: flex; align-items: center; gap: 8px; background: ${PALETTE.charLight}; border: 1px solid rgba(245,238,224,0.12); border-radius: 12px; padding: 10px 12px; }
  .search-input { flex: 1; background: none; border: none; outline: none; color: ${PALETTE.cream}; font-size: 14px; font-family: 'Space Grotesk', sans-serif; }
  .filter-toggle { position: relative; width: 40px; height: 40px; border-radius: 12px; background: ${PALETTE.charLight}; border: 1px solid rgba(245,238,224,0.12); display: flex; align-items: center; justify-content: center; color: ${PALETTE.cream}; }
  .filter-toggle.active { border-color: ${PALETTE.butter}; color: ${PALETTE.butter}; }
  .filter-badge { position: absolute; top: -5px; right: -5px; background: ${PALETTE.chili}; color: ${PALETTE.cream}; font-size: 10px; font-weight: 700; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .filter-panel { margin-top: 12px; padding: 14px; background: ${PALETTE.charLight}; border-radius: 14px; border: 1px solid rgba(245,238,224,0.08); }
  .chip-wrap { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
  .filter-chip { padding: 6px 12px; border-radius: 20px; border: 1px solid rgba(245,238,224,0.15); background: transparent; color: ${PALETTE.creamDim}; font-size: 12px; font-weight: 600; }
  .filter-chip.active { background: ${PALETTE.herb}; color: ${PALETTE.char}; border-color: ${PALETTE.herb}; }
  .search-results { margin-top: 14px; display: flex; flex-direction: column; gap: 10px; }
  .result-row { display: flex; gap: 12px; align-items: center; background: ${PALETTE.charLight}; border: none; border-radius: 14px; padding: 10px; text-align: left; }
  .result-thumb { width: 54px; height: 54px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
  .result-info { flex: 1; min-width: 0; }
  .result-title { font-family: 'Fraunces', serif; font-weight: 700; font-size: 14.5px; color: ${PALETTE.cream}; }
  .result-meta { font-size: 11.5px; color: ${PALETTE.creamDim}; margin-top: 2px; }
  .avatar-edit-wrap { position: relative; width: 72px; height: 72px; margin: 0 auto 18px; cursor: pointer; }
  .avatar-edit-img { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; }
  .avatar-edit-badge { position: absolute; bottom: -2px; right: -2px; background: ${PALETTE.butter}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${PALETTE.char}; border: 2px solid ${PALETTE.charLight}; }
  .dashboard-body { flex: 1; overflow-y: auto; padding: 4px 18px 28px; }
  .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
  .stat-card { background: ${PALETTE.charLight}; border-radius: 12px; padding: 12px 10px; display: flex; flex-direction: column; gap: 4px; }
  .stat-card-value { font-family: 'Fraunces', serif; font-weight: 700; font-size: 19px; color: ${PALETTE.cream}; }
  .stat-card-label { font-size: 10.5px; color: ${PALETTE.creamDim}; }
  .chart-wrap { background: ${PALETTE.charLight}; border-radius: 12px; padding: 10px 6px 0; margin-bottom: 4px; }
  .perf-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid rgba(245,238,224,0.06); }
  .perf-rank { width: 20px; text-align: center; font-family: 'JetBrains Mono', monospace; color: ${PALETTE.butter}; font-weight: 700; font-size: 13px; flex-shrink: 0; }
  .perf-title { font-size: 13.5px; font-weight: 600; color: ${PALETTE.cream}; }
  .perf-meta { display: flex; align-items: center; font-size: 11px; color: ${PALETTE.creamDim}; margin-top: 3px; gap: 3px; }
  .perf-engagement { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: ${PALETTE.herb}; flex-shrink: 0; }
  .activity-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(245,238,224,0.06); }
  .activity-text { flex: 1; font-size: 12.5px; color: ${PALETTE.cream}; }
  .activity-time { font-size: 10.5px; color: ${PALETTE.creamDim}; flex-shrink: 0; }
  .spin { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  ::-webkit-scrollbar { display: none; }
`;
