"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Waves,
  LayoutDashboard,
  Map,
  GitCompareArrows,
  ChartNoAxesCombined,
  FlaskConical,
  BrainCircuit,
  Images,
  BookOpen,
  ArrowUpRight,
  ArrowRight,
  Satellite,
  Globe,
  ChevronRight,
  Menu,
  X,
  Sun,
  Moon,
  Download,
  Search,
  Cloud,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Send,
  Plus,
  ShieldCheck,
  ExternalLink,
  Database,
  Clock,
  Activity,
  LogIn,
  Trash2,
  FileText,
  Leaf,
  Focus,
  Radio,
  Layers,
  Compass,
} from "lucide-react";
import { words, Lang } from "@/lib/i18n";
import { regions, photos, sources, Analysis } from "@/lib/data";
import { browserDB } from "@/lib/supabase";
import { methodology } from "@/lib/methodology";
const BrowseCompare = dynamic(() => import("./browse-compare"), { ssr: false });
const AnalyticsChart = dynamic(() => import("./analytics-chart"), {
  ssr: false,
  loading: () => <div className="empty-inline">Loading chart…</div>,
});
const SatelliteMap = dynamic(() => import("./satellite-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <Satellite />
      Карта жүктелуде…
    </div>
  ),
});
const routes = [
  ["home", "/", LayoutDashboard],
  ["explorer", "/explorer", Map],
  ["compare", "/compare", GitCompareArrows],
  ["analytics", "/analytics", ChartNoAxesCombined],
  ["research", "/research", FlaskConical],
  ["ai", "/ai-assistant", BrainCircuit],
  ["gallery", "/gallery", Images],
] as const;
const labelKey = (page: string) =>
  page === "ai-assistant" ? "ai" : page === "research/new" ? "new" : page;
async function api(path: string, body?: unknown) {
  const db = browserDB(),
    session = db ? await db.auth.getSession() : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.data.session)
    headers.Authorization = `Bearer ${session.data.session.access_token}`;
  const r = await fetch("/api/" + path, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const j: any = await r.json();
    throw new Error(j.error || "Сұрау орындалмады");
  }
  return r;
}
async function calculate(input: unknown): Promise<Analysis> {
  const queued: any = await (await api("analyze", input)).json();
  for (let i = 0; i < 180; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const job: any = await (await api("jobs/" + queued.job_id)).json();
    if (job.status === "completed") return job.result as Analysis;
    if (job.status === "failed")
      throw new Error(job.error || "Өңдеу орындалмады.");
  }
  throw new Error("Өңдеу ұзақ уақыт алуда. Жұмыс ID: " + queued.job_id);
}
function download(name: string, data: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function readResults(): Analysis[] {
  try {
    return JSON.parse(localStorage.getItem("cw-results") || "[]");
  } catch {
    return [];
  }
}
export default function Platform({ page }: { page: string }) {
  const [lang, setLang] = useState<Lang>("kk"),
    [light, setLight] = useState(false),
    [menu, setMenu] = useState(false),
    [status, setStatus] = useState<any>(null),
    [results, setResults] = useState<Analysis[]>([]);
  const t = words[lang];
  useEffect(() => {
    const l = localStorage.getItem("cw-lang");
    if (l === "en" || l === "ru") setLang(l);
    setLight(localStorage.getItem("cw-theme") === "light");
    setResults(readResults());
    api("status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ error: true }));
    const db = browserDB();
    if (db) {
      const refresh = () =>
        api("projects")
          .then((r) => r.json())
          .then((j: any) => {
            const cloud = (j.projects || [])
              .filter((p: any) => p.result)
              .map((p: any) => p.result as Analysis);
            setResults([
              ...new globalThis.Map(
                [...readResults(), ...cloud].map((r) => [r.id, r]),
              ).values(),
            ]);
          })
          .catch(() => {});
      refresh();
      const { data } = db.auth.onAuthStateChange(() => {
        setTimeout(refresh, 0);
      });
      return () => data.subscription.unsubscribe();
    }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = light ? "light" : "dark";
    localStorage.setItem("cw-theme", light ? "light" : "dark");
  }, [light]);
  function language(value: Lang) {
    setLang(value);
    localStorage.setItem("cw-lang", value);
    document.documentElement.lang = value;
  }
  function addResult(a: Analysis) {
    const next = [a, ...readResults()].slice(0, 30);
    localStorage.setItem("cw-results", JSON.stringify(next));
    setResults(next);
  }
  const name = (t as any)[labelKey(page)] || t.home;
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (menu ? "mobile-open" : "")}>
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Waves size={25} />
          </span>
          <span>
            CaspianWatch <b>AI</b>
            <small>EARTH OBSERVATION PLATFORM</small>
          </span>
        </Link>
        <button
          className="mobile-close"
          onClick={() => setMenu(false)}
          aria-label="Close menu"
        >
          <X />
        </button>
        <div className="sidebar-label">
          {lang === "en"
            ? "WORKSPACE"
            : lang === "ru"
              ? "РАБОЧЕЕ ПРОСТРАНСТВО"
              : "ЗЕРТТЕУ КЕҢІСТІГІ"}
        </div>
        <nav>
          {routes.map(([key, url, Icon]) => (
            <Link
              onClick={() => setMenu(false)}
              key={key}
              href={url}
              className={(labelKey(page) === key ? "active " : "") + "nav-link"}
            >
              <Icon size={19} />
              <span>{t[key]}</span>
              {key === "ai" && <span className="ai-tag">AI</span>}
              {labelKey(page) === key && <span className="nav-indicator" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-label secondary">
          {lang === "en" ? "RESOURCES" : lang === "ru" ? "РЕСУРСЫ" : "АҚПАРАТ"}
        </div>
        <nav>
          <Link
            className={"nav-link " + (page === "methodology" ? "active" : "")}
            href="/methodology"
          >
            <BookOpen size={18} />
            {t.methodology}
          </Link>
          <Link
            className={"nav-link " + (page === "sources" ? "active" : "")}
            href="/sources"
          >
            <Database size={18} />
            {t.sources}
          </Link>
          <Link
            className={"nav-link " + (page === "about" ? "active" : "")}
            href="/about"
          >
            <Globe size={18} />
            {t.about}
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="mission">
            <span className="mission-icon">
              <Leaf size={21} />
            </span>
            <b>
              {lang === "en"
                ? "One sea. A shared future."
                : lang === "ru"
                  ? "Одно море. Общее будущее."
                  : "Бір теңіз. Ортақ болашақ."}
            </b>
            <p>{t.footer}</p>
            <div>
              <span>SDG 13</span>
              <span>SDG 14</span>
              <span>SDG 9</span>
            </div>
          </div>
          <Link className="profile" href="/dashboard">
            <span className="avatar">CW</span>
            <span>
              {t.dashboard}
              <small>
                {lang === "en"
                  ? "Research workspace"
                  : lang === "ru"
                    ? "Пространство исследователя"
                    : "Зерттеуші кеңістігі"}
              </small>
            </span>
            <ChevronRight size={17} />
          </Link>
        </div>
      </aside>
      {menu && <div className="menu-backdrop" onClick={() => setMenu(false)} />}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="hamburger"
              aria-label="Menu"
              onClick={() => setMenu(true)}
            >
              <Menu size={22} />
            </button>
            <span>CaspianWatch</span>
            <ChevronRight size={13} />
            <b>{name}</b>
          </div>
          <div className="top-actions">
            <span className="data-state">
              <span className={status?.copernicus ? "live-dot" : "muted-dot"} />
              {status?.copernicus
                ? "COPERNICUS CONNECTED"
                : lang === "en"
                  ? "OPEN DATA PLATFORM"
                  : lang === "ru"
                    ? "ПЛАТФОРМА ОТКРЫТЫХ ДАННЫХ"
                    : "АШЫҚ ДЕРЕКТЕР ПЛАТФОРМАСЫ"}
            </span>
            <select
              aria-label="Language"
              value={lang}
              onChange={(e) => language(e.target.value as Lang)}
            >
              <option value="kk">ҚАЗ</option>
              <option value="ru">РУС</option>
              <option value="en">ENG</option>
            </select>
            <button
              className="icon-button"
              aria-label="Toggle theme"
              onClick={() => setLight(!light)}
            >
              {light ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <Link href="/dashboard" className="top-avatar">
              CW
            </Link>
          </div>
        </header>
        <main>
          {page === "home" ? (
            <Home lang={lang} results={results} />
          ) : (
            <div
              className={
                "page-content " +
                (["explorer", "compare"].includes(page) ? "wide" : "")
              }
            >
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    CASPIANWATCH / {page.toUpperCase()}
                  </div>
                  <h1>{name}</h1>
                  <p>{descriptions(page, lang)}</p>
                </div>
                {["research", "analytics", "dashboard"].includes(page) && (
                  <Link className="button primary" href="/research/new">
                    <Plus size={17} />
                    {t.new}
                  </Link>
                )}
              </div>
              {page === "explorer" && (
                <Explorer lang={lang} onResult={addResult} />
              )}{" "}
              {page === "compare" && (
                <Compare lang={lang} onResult={addResult} />
              )}{" "}
              {page === "analytics" && (
                <Analytics lang={lang} results={results} />
              )}{" "}
              {page === "research" && <Research lang={lang} />}{" "}
              {page === "research/new" && <NewResearch lang={lang} />}{" "}
              {page === "ai-assistant" && <Assistant lang={lang} />}{" "}
              {page === "gallery" && <Gallery lang={lang} />}{" "}
              {page === "methodology" && <Methodology lang={lang} />}{" "}
              {page === "sources" && <Sources />}{" "}
              {page === "about" && <About lang={lang} />}{" "}
              {page === "dashboard" && (
                <Dashboard lang={lang} status={status} results={results} />
              )}
            </div>
          )}
        </main>
        <footer className="footer">
          <span>
            <Waves size={16} />
            CaspianWatch AI <span className="footer-year">© 2026</span>
          </span>
          <span>{t.science}</span>
          <Link href="/sources">
            {t.sources}
            <ArrowUpRight size={13} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
function descriptions(page: string, lang: Lang) {
  const kk: Record<string, string> = {
    explorer: "Нақты спутниктік деректер. Сіздің зерттеу аумағыңыз.",
    compare: "Бір жағалау. Екі кезең. Өзгерісті деректер арқылы көріңіз.",
    analytics: "Есептелген нәтижелерге сүйенген ғылыми аналитика.",
    research: "Сұрақтан — ғылыми қорытындыға дейін.",
    "research/new": "Зерттеу аумағы мен уақыт кезеңдерін таңдаңыз.",
    "ai-assistant": "Деректерді түсінуге көмектесетін ғылыми серіктес.",
    gallery: "Ғарыштан көрінген Каспий. Тек шынайы түсірілімдер.",
    methodology: "Әр өлшемнің артында — тексерілетін әдіс.",
    sources: "Ашық дереккөздер және материалдардың шығу тегі.",
    about: "Каспийдің бүгінін бақылап, ертеңін зерттейміз.",
    dashboard: "Сіздің зерттеулеріңіз және платформа қосылымдары.",
  };
  const en: Record<string, string> = {
    explorer: "Real satellite data. Your area of interest.",
    compare: "One coastline. Two moments. Observe change through data.",
    analytics: "Scientific analytics from calculated results.",
    research: "From a question to a scientific conclusion.",
    "research/new": "Choose your study area and observation periods.",
    "ai-assistant": "Your scientific partner for understanding the data.",
    gallery: "The Caspian from space. Only real observations.",
    methodology: "A reproducible method behind every measurement.",
    sources: "Open data sources and material provenance.",
    about: "Watching the Caspian today. Studying its tomorrow.",
    dashboard: "Your research and platform connections.",
  };
  const ru: Record<string, string> = {
    explorer: "Реальные спутниковые данные. Ваша область исследования.",
    compare: "Один берег. Два периода. Изучайте изменения по данным.",
    analytics: "Научная аналитика рассчитанных результатов.",
    research: "От вопроса к научному заключению.",
    "research/new": "Выберите область и периоды наблюдения.",
    "ai-assistant": "Научный партнёр для понимания данных.",
    gallery: "Каспий из космоса. Только реальные снимки.",
    methodology: "Проверяемый метод за каждым измерением.",
    sources: "Открытые источники и происхождение материалов.",
    about: "Наблюдаем за Каспием сегодня, исследуем его завтра.",
    dashboard: "Ваши исследования и подключения платформы.",
  };
  return (lang === "en" ? en : lang === "ru" ? ru : kk)[page];
}
function Home({ lang, results }: { lang: Lang; results: Analysis[] }) {
  const t = words[lang];
  return (
    <div className="home-content">
      <motion.section
        className="hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <img
          src="/images/caspian-2026-preview.jpg"
          alt="Caspian Sea, NASA Terra MODIS daily imagery, 11 October 2026"
          className="hero-image"
        />
        <div className="hero-shade" />
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="hero-badge">
            <span className="live-dot" />
            {t.eyebrow}
          </div>
          <h1>
            {t.hero.split("\n").map((line, i) => (
              <span key={i} className={i === 1 ? "cyan-text" : ""}>
                {line}
              </span>
            ))}
          </h1>
          <p>{t.subtitle}</p>
          <div className="hero-buttons">
            <Link className="button primary" href="/explorer">
              <Map size={18} />
              {t.open}
              <ArrowUpRight size={17} />
            </Link>
            <Link className="button glass" href="/compare">
              <GitCompareArrows size={18} />
              {t.shoreCompare}
            </Link>
            <Link href="/research/new" className="hero-research-link">
              {t.start}
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="hero-trust">
            <ShieldCheck size={15} />
            <span>NASA · Copernicus · OpenStreetMap</span>
            <i />
            <span>Sentinel-2 / NDWI</span>
          </div>
        </div>
        <div className="hero-coordinate">
          <Focus size={24} />
          <span>
            CASPIAN SEA<small>42°00′ N / 50°30′ E</small>
          </span>
        </div>
        <a
          className="hero-credit"
          href={photos.find((p) => p.id === "caspian-2026")!.url}
          target="_blank"
          rel="noreferrer"
        >
          <Satellite size={14} />
          Terra / MODIS · 11.10.2026 · NASA GIBS
          <ArrowUpRight size={12} />
        </a>
      </motion.section>
      <div className="stats-grid">
        {[
          [
            Satellite,
            lang === "en"
              ? "Latest processed scene"
              : lang === "ru"
                ? "Последний обработанный снимок"
                : "Соңғы өңделген түсірілім",
            results[0]?.after || "—",
          ],
          [
            MapPin,
            lang === "en"
              ? "Areas analyzed"
              : lang === "ru"
                ? "Исследованные области"
                : "Зерттелген аумақтар",
            results.length ? new Set(results.map((x) => x.region)).size : "—",
          ],
          [
            Layers,
            lang === "en"
              ? "Scenes processed"
              : lang === "ru"
                ? "Обработанные снимки"
                : "Өңделген түсірілімдер",
            results.length
              ? new Set(
                  results.flatMap((r) => [
                    ...r.before_scene.split(";"),
                    ...r.after_scene.split(";"),
                  ]),
                ).size
              : "—",
          ],
          [
            Activity,
            t.exposed,
            results.length ? `${results[0].exposed_km2.toFixed(3)} км²` : "—",
          ],
        ].map(([Icon, label, value], i) => {
          const I = Icon as typeof Satellite;
          return (
            <div className="stat-card" key={i}>
              <div className="stat-label">
                {String(label)}
                <I size={17} />
              </div>
              <strong>{String(value)}</strong>
              <small>
                {results.length
                  ? lang === "en"
                    ? "Calculated research results"
                    : lang === "ru"
                      ? "Рассчитанные результаты исследований"
                      : "Есептелген зерттеу нәтижелері"
                  : t.unavailable}
              </small>
            </div>
          );
        })}
      </div>
      <div className="update-line">
        <Clock size={12} />
        {lang === "en"
          ? "Last calculated update"
          : lang === "ru"
            ? "Последнее обновление расчётов"
            : "Соңғы есептеу жаңартуы"}
        :{" "}
        {results.length
          ? new Date(results[0].created_at).toLocaleString(
              lang === "kk" ? "kk-KZ" : lang === "ru" ? "ru-RU" : "en-GB",
              { timeZone: "Asia/Aqtau" },
            )
          : t.unavailable}
      </div>
      <section className="section">
        <div className="section-title">
          <div>
            <span className="eyebrow">EXPLORE THE CASPIAN</span>
            <h2>
              {lang === "en"
                ? "A new perspective on a changing coast"
                : lang === "ru"
                  ? "Новый взгляд на меняющийся берег"
                  : "Өзгерген жағалауға жаңа көзқарас"}
            </h2>
          </div>
          <Link href="/research/new">
            {t.start}
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="feature-grid">
          <Link className="feature-card feature-map" href="/explorer">
            <div className="feature-icon">
              <Map size={23} />
            </div>
            <div className="feature-art">
              <img
                src="/images/north-2024-preview.jpg"
                alt="NASA MODIS North Caspian, September 29 2024"
              />
              <span className="crosshair-mark">+</span>
            </div>
            <div className="feature-number">01 / OBSERVE</div>
            <h3>{t.explorer}</h3>
            <p>
              {lang === "en"
                ? "Find satellite scenes, draw a study area and explore spectral layers."
                : lang === "ru"
                  ? "Находите снимки, выделяйте область и изучайте спектральные слои."
                  : "Түсірілімді табыңыз, аумақты белгілеңіз, спектрлік қабаттарды зерттеңіз."}
            </p>
            <span className="feature-link">
              {t.open}
              <ArrowUpRight size={18} />
            </span>
          </Link>
          <Link className="feature-card" href="/compare">
            <div className="feature-icon">
              <GitCompareArrows size={23} />
            </div>
            <div className="feature-art compare-art">
              <img
                src="/images/north-2006-preview.jpg"
                alt="2006 satellite observation"
              />
              <img
                src="/images/north-2024-preview.jpg"
                alt="2024 satellite observation"
              />
              <span>2006</span>
              <span>2024</span>
              <i>
                <GitCompareArrows size={16} />
              </i>
            </div>
            <div className="feature-number">02 / COMPARE</div>
            <h3>{t.compare}</h3>
            <p>
              {lang === "en"
                ? "Compare aligned observations and calculate water–land changes."
                : lang === "ru"
                  ? "Сравнивайте снимки и рассчитывайте изменения границы воды и суши."
                  : "Екі кезеңді салыстырып, су мен құрлық шекарасының өзгерісін есептеңіз."}
            </p>
            <span className="feature-link">
              {lang === "en"
                ? "Compare periods"
                : lang === "ru"
                  ? "Сравнить периоды"
                  : "Кезеңдерді салыстыру"}
              <ArrowUpRight size={18} />
            </span>
          </Link>
          <Link className="feature-card ai-feature" href="/ai-assistant">
            <div className="feature-icon">
              <BrainCircuit size={23} />
            </div>
            <div className="ai-orbit">
              <div />
              <div />
              <div />
              <BrainCircuit size={48} />
              <span>DATA → INSIGHT</span>
            </div>
            <div className="feature-number">03 / UNDERSTAND</div>
            <h3>{t.ai}</h3>
            <p>
              {lang === "en"
                ? "Ask scientific questions. Understand results and their limitations."
                : lang === "ru"
                  ? "Задавайте научные вопросы. Изучайте результаты и ограничения измерений."
                  : "Ғылыми сұрақ қойыңыз. Нәтижелер мен өлшеу шектеулерін түсініңіз."}
            </p>
            <span className="feature-link">
              {lang === "en"
                ? "Ask Caspian AI"
                : lang === "ru"
                  ? "Спросить Caspian AI"
                  : "AI көмекшіге сұрақ қою"}
              <ArrowUpRight size={18} />
            </span>
          </Link>
        </div>
      </section>
      <section className="region-section">
        <div className="region-intro">
          <span className="eyebrow">OUR FOCUS</span>
          <h2>
            {lang === "en"
              ? "Research starts\nwith a place."
              : lang === "ru"
                ? "Исследование начинается\nс места."
                : "Зерттеу нақты\nаумақтан басталады."}
          </h2>
          <p>
            {lang === "en"
              ? "From the coast of Aktau to the wider Caspian basin. Choose where your research begins."
              : lang === "ru"
                ? "От побережья Актау до всего Каспийского бассейна. Выберите начало своего исследования."
                : "Ақтау жағалауынан бүкіл Каспий бассейніне дейін. Зерттеуіңіз басталатын аумақты таңдаңыз."}
          </p>
          <Link href="/explorer">
            {t.open}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="region-cards">
          {regions.slice(0, 3).map((r, i) => (
            <Link
              href={"/explorer?region=" + r.id}
              className="region-card"
              key={r.id}
            >
              <img
                src={
                  i === 0
                    ? "/images/aktau-preview.jpg"
                    : "/images/north-2024-preview.jpg"
                }
                alt="Caspian satellite archive"
              />
              <span className="region-overlay" />
              <span className="region-tag">
                {i === 0
                  ? "PRIORITY AREA"
                  : i === 1
                    ? "NORTH-EAST"
                    : "NORTH CASPIAN"}
              </span>
              <div>
                <MapPin size={15} />
                <h3>{lang === "en" ? r.en : lang === "ru" ? r.ru : r.name}</h3>
                <small>
                  {r.center[1].toFixed(2)}° N · {r.center[0].toFixed(2)}° E
                </small>
              </div>
              <ArrowUpRight size={19} />
            </Link>
          ))}
        </div>
        <small className="region-note">
          {lang === "en"
            ? "Illustrations: NASA Caspian archives; cards do not depict each city."
            : lang === "ru"
              ? "Иллюстрации: архив NASA по Каспию; снимки не изображают каждый город."
              : "Иллюстрациялар: NASA Каспий архиві; суреттер әр қаланың нақты көрінісі емес."}
        </small>
      </section>
      <section className="science-banner">
        <div className="science-symbol">
          <ShieldCheck size={32} />
        </div>
        <div>
          <h3>{t.science}</h3>
          <p>
            {lang === "en"
              ? "Every result has a source, a method and a stated uncertainty. Shoreline change does not directly measure sea level."
              : lang === "ru"
                ? "Каждый результат имеет источник, метод и оценку неопределённости. Изменение береговой линии не является прямым измерением уровня моря."
                : "Әр нәтиженің дереккөзі, әдісі және белгісіздік бағасы бар. Жағалау өзгерісі теңіз деңгейінің тікелей өлшемі емес."}
          </p>
        </div>
        <Link className="button secondary" href="/methodology">
          {t.methodology}
          <ArrowUpRight size={17} />
        </Link>
      </section>
    </div>
  );
}
function Notice({
  text,
  success = false,
}: {
  text: string;
  success?: boolean;
}) {
  return (
    <div
      role={success ? "status" : "alert"}
      className={"notice " + (success ? "success" : "")}
    >
      {success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span>{text}</span>
    </div>
  );
}
function RegionSelect({
  value,
  onChange,
  lang,
}: {
  value: string;
  onChange: (s: string) => void;
  lang: Lang;
}) {
  return (
    <label className="field">
      {words[lang].region}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {regions.map((r) => (
          <option key={r.id} value={r.id}>
            {lang === "en" ? r.en : lang === "ru" ? r.ru : r.name}
          </option>
        ))}
      </select>
    </label>
  );
}
function Explorer({
  lang,
  onResult,
}: {
  lang: Lang;
  onResult: (r: Analysis) => void;
}) {
  const t = words[lang];
  const [region, setRegion] = useState("aktau"),
    [start, setStart] = useState("2026-10-01"),
    [end, setEnd] = useState("2026-10-11"),
    [cloud, setCloud] = useState(20),
    [scenes, setScenes] = useState<any[]>([]),
    [selected, setSelected] = useState<any>(null),
    [layer, setLayer] = useState("true"),
    [image, setImage] = useState<{ url: string; bbox: number[] }>(),
    [busy, setBusy] = useState(false),
    [searched, setSearched] = useState(false),
    [error, setError] = useState(""),
    [polygon, setPolygon] = useState<any>(null),
    [preview, setPreview] = useState<string | undefined>();
  const reg = regions.find((x) => x.id === region)!;
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("region");
    if (regions.some((x) => x.id === r)) setRegion(r!);
  }, []);
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function search() {
    setBusy(true);
    setError("");
    setSelected(null);
    setPreview(undefined);
    setImage(undefined);
    try {
      const j: any = await (
        await api("scenes", { bbox: reg.bbox, start, end, cloud })
      ).json();
      setScenes(j.scenes);
      setSearched(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function show(scene: any, mode = layer) {
    setBusy(true);
    setError("");
    try {
      if (scene.public_preview) {
        setLayer("true");
        const r = await api("scene-preview", { id: scene.id });
        setPreview(URL.createObjectURL(await r.blob()));
        setSelected(scene);
        setImage(undefined);
        return;
      }
      const r = await api("imagery", {
        bbox: reg.bbox,
        date: scene.date.slice(0, 10),
        layer: mode,
      });
      setImage({ url: URL.createObjectURL(await r.blob()), bbox: reg.bbox });
      setSelected(scene);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="explorer-layout">
        <aside className="panel explorer-controls">
          <div className="panel-title">
            <Satellite size={18} />
            {lang === "en"
              ? "Scene search"
              : lang === "ru"
                ? "Поиск снимков"
                : "Түсірілім іздеу"}
            <span className="small-tag">L2A</span>
          </div>
          <RegionSelect
            value={region}
            onChange={(v) => {
              setRegion(v);
              setPolygon(null);
              setImage(undefined);
              setScenes([]);
              setSelected(null);
            }}
            lang={lang}
          />
          <label className="field">
            {t.before}
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="field">
            {t.after}
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <label className="field">
            {t.cloud}
            <span className="range-label">≤ {cloud}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={cloud}
              onChange={(e) => setCloud(+e.target.value)}
            />
          </label>
          <button
            className="button primary full"
            disabled={busy}
            onClick={search}
          >
            <Search size={16} />
            {busy ? t.loading : t.search}
          </button>
          <div className="control-divider" />
          <label className="field">
            {lang === "en"
              ? "Spectral layer"
              : lang === "ru"
                ? "Спектральный слой"
                : "Спектрлік қабат"}
            <select
              disabled={!!selected?.public_preview}
              value={layer}
              onChange={(e) => {
                setLayer(e.target.value);
                if (selected) show(selected, e.target.value);
              }}
            >
              <option value="true">True Color · B04 / B03 / B02</option>
              <option value="false">False Color · B08 / B04 / B03</option>
              <option value="ndwi">NDWI · B03 / B08</option>
            </select>
          </label>
          <div className="info-note">
            <ShieldCheck size={17} />
            <p>
              {lang === "en"
                ? "NASA MODIS/VIIRS dates are selectable, including 2026. Public Sentinel-2 catalog and previews need no key; full spectral processing requires credentials."
                : lang === "ru"
                  ? "Можно выбрать даты NASA MODIS/VIIRS, включая 2026. Каталог и preview Sentinel-2 открыты; спектральная обработка требует ключей."
                  : "NASA MODIS/VIIRS қабатында 2026 күндерін таңдаңыз. Sentinel-2 каталогы мен preview кілтсіз ашылады; толық спектрлік өңдеуге кілт қажет."}
            </p>
          </div>
          {polygon && (
            <button
              className="button secondary full"
              onClick={() =>
                download(
                  "study-area.geojson",
                  JSON.stringify({
                    type: "Feature",
                    properties: {},
                    geometry: polygon,
                  }),
                )
              }
            >
              <Download size={16} />
              Polygon GeoJSON
            </button>
          )}
        </aside>
        <SatelliteMap
          region={region}
          lang={lang}
          image={image}
          onPolygon={setPolygon}
        />
      </div>
      {preview && selected && (
        <div className="panel sentinel-preview">
          <img src={preview} alt={`Sentinel-2 quicklook ${selected.date}`} />
          <div>
            <span className="eyebrow">OFFICIAL COPERNICUS QUICKLOOK</span>
            <h3>Sentinel-2 · {selected.date.slice(0, 10)}</h3>
            <p>{selected.id}</p>
            <p>
              {lang === "en"
                ? "Official tile preview. Not a georeferenced raster for area measurement."
                : lang === "ru"
                  ? "Официальный preview тайла. Не георастр для измерения площади."
                  : "Ресми тайл preview-ы. Аудан өлшеуге арналған георастр емес."}
            </p>
            <button
              className="button secondary"
              onClick={() =>
                download(
                  "sentinel-preview-metadata.json",
                  JSON.stringify(selected),
                )
              }
            >
              <Download size={16} />
              Metadata JSON
            </button>
          </div>
        </div>
      )}
      {error && <Notice text={error} />}
      <div className="panel scenes-panel">
        <div className="panel-title">
          <Layers size={18} />
          {lang === "en"
            ? "Available scenes"
            : lang === "ru"
              ? "Доступные снимки"
              : "Қолжетімді түсірілімдер"}
          <span className="small-tag">{scenes.length}</span>
        </div>
        {!scenes.length ? (
          <div className="empty-inline">
            <Satellite size={27} />
            <div>
              {searched
                ? lang === "en"
                  ? "No scenes found. Try another date or cloud threshold."
                  : lang === "ru"
                    ? "Снимки не найдены. Выберите другую дату или порог облачности."
                    : "Түсірілім табылмады. Басқа күнді немесе бұлттылық шегін таңдаңыз."
                : lang === "en"
                  ? "Choose an area and search the official catalog."
                  : lang === "ru"
                    ? "Выберите область и выполните поиск в официальном каталоге."
                    : "Аумақты таңдап, ресми каталогтан іздеңіз."}
            </div>
          </div>
        ) : (
          <div className="scene-list">
            {scenes.map((s) => (
              <button
                className={
                  "scene-item " + (selected?.id === s.id ? "selected" : "")
                }
                key={s.id}
                onClick={() => show(s)}
                disabled={busy}
              >
                <Satellite size={24} />
                <span>
                  <b>{s.date.slice(0, 10)}</b>
                  <small>
                    {s.platform || "Sentinel-2"} · {s.id}
                  </small>
                </span>
                <span>
                  <Cloud size={14} />
                  {Number(s.cloud).toFixed(1)}%
                </span>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
        )}
        {selected && (
          <div className="scene-metadata">
            Copernicus · {selected.platform} · {selected.date} · {selected.id}
          </div>
        )}
      </div>
    </>
  );
}
function Compare({
  lang,
  onResult,
}: {
  lang: Lang;
  onResult: (r: Analysis) => void;
}) {
  const t = words[lang];
  const [mode, setMode] = useState<"archive" | "sentinel" | "browse">("browse"),
    [projectId, setProjectId] = useState<string | undefined>(),
    [region, setRegion] = useState("aktau"),
    [before, setBefore] = useState("2018-09-01"),
    [after, setAfter] = useState("2024-09-01"),
    [slider, setSlider] = useState(50),
    [polygon, setPolygon] = useState<any>(null),
    [threshold, setThreshold] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<Analysis | null>(null),
    [pair, setPair] = useState<{
      before: string;
      after: string;
      beforeDate: string;
      afterDate: string;
    } | null>(null);
  const reg = regions.find((x) => x.id === region)!;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search),
      r = params.get("region");
    if (regions.some((x) => x.id === r)) setRegion(r!);
    for (const key of ["before", "after"]) {
      const value = params.get(key);
      if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        if (key === "before") setBefore(value);
        else setAfter(value);
        setMode("sentinel");
      }
    }
    setProjectId(params.get("project") || undefined);
  }, []);
  useEffect(
    () => () => {
      if (pair) {
        URL.revokeObjectURL(pair.before);
        URL.revokeObjectURL(pair.after);
      }
    },
    [pair],
  );
  async function load() {
    setBusy(true);
    setError("");
    setResult(null);
    setPair(null);
    try {
      if (before >= after)
        throw new Error("Кейінгі күн бастапқы күннен үлкен болуы тиіс.");
      const bs: any = await (
        await api("scenes", {
          bbox: reg.bbox,
          start: before,
          end: before,
          cloud: 30,
        })
      ).json();
      const as: any = await (
        await api("scenes", {
          bbox: reg.bbox,
          start: after,
          end: after,
          cloud: 30,
        })
      ).json();
      if (!bs.scenes.length || !as.scenes.length)
        throw new Error(
          "Кемінде бір кезеңде түсірілім табылмады. Басқа күнді таңдаңыз.",
        );
      const br = await api("imagery", {
        bbox: reg.bbox,
        date: before,
        layer: "true",
      });
      const ar = await api("imagery", {
        bbox: reg.bbox,
        date: after,
        layer: "true",
      });
      setPair({
        before: URL.createObjectURL(await br.blob()),
        after: URL.createObjectURL(await ar.blob()),
        beforeDate: before,
        afterDate: after,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function analyze() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const a = await calculate({
        bbox: reg.bbox,
        before,
        after,
        region,
        threshold,
        polygon,
      });
      setResult(a);
      onResult(a);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (mode === "browse")
    return (
      <>
        <div className="compare-toolbar panel">
          <div className="segmented">
            <button className="selected">NASA · 2026</button>
            <button onClick={() => setMode("sentinel")}>
              Sentinel-2 · NDWI
            </button>
            <button onClick={() => setMode("archive")}>
              NASA · 2006 / 2024
            </button>
          </div>
        </div>
        <BrowseCompare lang={lang} />
      </>
    );
  const p =
    mode === "archive"
      ? {
          before: "/images/north-2006.jpg",
          after: "/images/north-2024.jpg",
          beforeDate: "2006-09-29",
          afterDate: "2024-09-29",
        }
      : pair;
  return (
    <>
      <div className="compare-toolbar panel">
        <div className="segmented">
          <button onClick={() => setMode("browse")}>NASA · 2026</button>
          <button
            className={mode === "archive" ? "selected" : ""}
            onClick={() => {
              setMode("archive");
              setResult(null);
            }}
          >
            NASA {t.archive}
          </button>
          <button
            className={mode === "sentinel" ? "selected" : ""}
            onClick={() => setMode("sentinel")}
          >
            Sentinel-2{" "}
            {lang === "en"
              ? "research"
              : lang === "ru"
                ? "исследование"
                : "зерттеу"}
          </button>
        </div>
        <span className="subtle">
          <ShieldCheck size={16} />
          {lang === "en"
            ? "Same season · same extent"
            : lang === "ru"
              ? "Один сезон · одинаковые границы"
              : "Бір маусым · бір географиялық шекара"}
        </span>
      </div>
      {mode === "sentinel" && (
        <div className="panel comparison-fields">
          <RegionSelect
            lang={lang}
            value={region}
            onChange={(v) => {
              setRegion(v);
              setPolygon(null);
              setPair(null);
              setResult(null);
            }}
          />
          <label className="field">
            {t.before}
            <input
              type="date"
              value={before}
              onChange={(e) => {
                setBefore(e.target.value);
                setPair(null);
                setResult(null);
              }}
            />
          </label>
          <label className="field">
            {t.after}
            <input
              type="date"
              value={after}
              onChange={(e) => {
                setAfter(e.target.value);
                setPair(null);
                setResult(null);
              }}
            />
          </label>
          <label className="field">
            NDWI{" "}
            {lang === "en" ? "threshold" : lang === "ru" ? "порог" : "шегі"}
            <input
              type="number"
              min="-0.5"
              max="0.5"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(+e.target.value)}
            />
          </label>
          <button className="button secondary" disabled={busy} onClick={load}>
            <Satellite size={16} />
            {busy
              ? t.loading
              : lang === "en"
                ? "Load pair"
                : lang === "ru"
                  ? "Загрузить снимки"
                  : "Суреттерді жүктеу"}
          </button>
          <button className="button primary" disabled={busy} onClick={analyze}>
            {busy ? t.loading : t.run}
          </button>
        </div>
      )}
      {p ? (
        <div className="comparison-view">
          <img
            className="compare-image"
            src={p.after}
            alt={"Later satellite scene " + p.afterDate}
          />
          <div
            className="comparison-before"
            style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}
          >
            <img
              className="compare-image"
              src={p.before}
              alt={"Earlier satellite scene " + p.beforeDate}
            />
          </div>
          <div className="comparison-line" style={{ left: slider + "%" }}>
            <span>
              <GitCompareArrows size={22} />
            </span>
          </div>
          <span className="date-pill before-pill">
            {p.beforeDate}{" "}
            <small>
              {mode === "archive" ? "Terra / MODIS" : "Sentinel-2 L2A"}
            </small>
          </span>
          <span className="date-pill after-pill">
            {p.afterDate}{" "}
            <small>
              {mode === "archive" ? "Terra / MODIS" : "Sentinel-2 L2A"}
            </small>
          </span>
          <input
            className="comparison-range"
            aria-label="Comparison slider"
            type="range"
            min="0"
            max="100"
            value={slider}
            onChange={(e) => setSlider(+e.target.value)}
          />
          <span className="slider-hint">
            ←{" "}
            {lang === "en"
              ? "Drag to compare"
              : lang === "ru"
                ? "Перетащите для сравнения"
                : "Салыстыру үшін сырғытыңыз"}{" "}
            →
          </span>
        </div>
      ) : (
        <div className="empty-state panel">
          <GitCompareArrows size={38} />
          <h3>
            {lang === "en"
              ? "Choose two observation dates"
              : lang === "ru"
                ? "Выберите две даты наблюдения"
                : "Екі түсірілім күнін таңдаңыз"}
          </h3>
          <p>
            {lang === "en"
              ? "Load georeferenced Sentinel-2 images from the official API."
              : lang === "ru"
                ? "Загрузите привязанные снимки Sentinel-2 через официальный API."
                : "Ресми API арқылы бірдей шекарадағы Sentinel-2 суреттерін жүктеңіз."}
          </p>
        </div>
      )}
      {mode === "sentinel" && (
        <details className="panel aoi-details">
          <summary>
            <MapPin size={17} />
            {lang === "en"
              ? "Define study polygon (optional; required for large regions)"
              : lang === "ru"
                ? "Выделить полигон (необходим для больших областей)"
                : "Зерттеу полигонын белгілеу (үлкен аумақтар үшін қажет)"}
          </summary>
          <SatelliteMap
            region={region}
            lang={lang}
            onPolygon={(p) => {
              setPolygon(p);
              setResult(null);
            }}
          />
          {polygon && (
            <p className="fine-print">
              {lang === "en"
                ? "Study polygon selected"
                : lang === "ru"
                  ? "Полигон исследования выбран"
                  : "Зерттеу полигоны таңдалды"}
            </p>
          )}
        </details>
      )}
      {error && <Notice text={error} />}
      <Notice
        success
        text={
          mode === "archive"
            ? lang === "en"
              ? "Real NASA archive pair, same calendar day. Visual comparison only: these JPEG images have no spectral bands or geotransform; no scientific area measurements are derived from them."
              : lang === "ru"
                ? "Реальная архивная пара NASA за одинаковый день года. Только визуальное сравнение: у JPEG нет спектральных каналов и геотрансформации; научные площади по ним не рассчитываются."
                : "NASA-ның шынайы архивтік жұбы, бірдей күн мен маусым. Тек көрнекі салыстыру: JPEG файлдарда спектрлік арналар мен геотрансформация жоқ; олардан аудандар есептелмейді."
            : lang === "en"
              ? "NDWI uses 10 m B03/B08 bands and SCL screening. A one-pixel boundary sensitivity is not a calibrated confidence interval."
              : lang === "ru"
                ? "NDWI использует каналы B03/B08 с разрешением 10 м и маску SCL. Чувствительность границы в один пиксель не является калиброванным доверительным интервалом."
                : "NDWI 10 м B03/B08 арналары мен SCL маскасын қолданады. Бір пиксельдік шекара сезімталдығы калибрленген сенімділік интервалы емес."
        }
      />
      {result && (
        <>
          <ResultCards result={result} lang={lang} />
          <div className="panel">
            <SatelliteMap
              region={region}
              lang={lang}
              shoreline={result.shoreline}
            />
            <ExportButtons
              results={[result]}
              lang={lang}
              projectId={projectId}
            />
          </div>
        </>
      )}
    </>
  );
}
function ResultCards({ result: r, lang }: { result: Analysis; lang: Lang }) {
  const t = words[lang];
  return (
    <div className="stats-grid result-cards">
      {[
        [t.exposed, r.exposed_km2.toFixed(4) + " км²"],
        [t.flooded, r.flooded_km2.toFixed(4) + " км²"],
        [t.quality, (r.valid_fraction * 100).toFixed(1) + "%"],
        [
          lang === "en"
            ? "Boundary sensitivity"
            : lang === "ru"
              ? "Чувствительность границы"
              : "Шекара сезімталдығы",
          "± " + r.uncertainty_km2.toFixed(4) + " км²",
        ],
      ].map(([a, b]) => (
        <div className="stat-card" key={a}>
          <div className="stat-label">{a}</div>
          <strong>{b}</strong>
          <small>
            {r.algorithm} · {r.resolution_m} м
          </small>
        </div>
      ))}
      <div className="stat-card">
        <div className="stat-label">
          {lang === "en"
            ? "Median boundary distance"
            : lang === "ru"
              ? "Медианное расстояние границ"
              : "Медианалық шекара аралығы"}
        </div>
        <strong>
          {r.displacement_m === null ? "—" : r.displacement_m.toFixed(1) + " м"}
        </strong>
        <small>
          {lang === "en"
            ? "Symmetric nearest-boundary distance"
            : lang === "ru"
              ? "Симметричное расстояние ближайших границ"
              : "Екі бағыттағы ең жақын шекара аралығы"}
        </small>
      </div>
      <div className="stat-card">
        <div className="stat-label">
          {lang === "en"
            ? "Observation dates"
            : lang === "ru"
              ? "Даты снимков"
              : "Түсірілім күндері"}
        </div>
        <strong className="date-value">
          {r.before}
          <br />
          {r.after}
        </strong>
        <small>Sentinel-2 L2A · {r.projection}</small>
      </div>
    </div>
  );
}
function ExportButtons({
  results,
  lang,
  projectId,
}: {
  results: Analysis[];
  lang: Lang;
  projectId?: string;
}) {
  const t = words[lang];
  const ref = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await api("save-analysis", {
        job_id: results[0].id,
        project_id: projectId,
        title: `${results[0].region} · ${results[0].before} → ${results[0].after}`,
      });
      setMessage(
        lang === "en"
          ? "Verified results saved to Supabase."
          : lang === "ru"
            ? "Проверенные результаты сохранены в Supabase."
            : "Тексерілген нәтиже Supabase базасына сақталды.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      {message && <Notice text={message} />}
      <div className="export-buttons">
        <button
          className="button secondary"
          disabled={!results.length}
          onClick={() =>
            download(
              "caspian-results.csv",
              "id,before,after,region,exposed_km2,flooded_km2,valid_fraction,algorithm\n" +
                results
                  .map((r) =>
                    [
                      r.id,
                      r.before,
                      r.after,
                      r.region,
                      r.exposed_km2,
                      r.flooded_km2,
                      r.valid_fraction,
                      r.algorithm,
                    ].join(","),
                  )
                  .join("\n"),
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download size={16} />
          CSV
        </button>
        <button
          className="button secondary"
          disabled={!results.length}
          onClick={() =>
            download(
              "caspian-shorelines.geojson",
              JSON.stringify({
                type: "FeatureCollection",
                features: results.flatMap((r) =>
                  r.shoreline.features.map((f: any) => ({
                    ...f,
                    properties: {
                      ...f.properties,
                      result_id: r.id,
                      before: r.before,
                      after: r.after,
                      algorithm: r.algorithm,
                    },
                  })),
                ),
              }),
            )
          }
        >
          <Download size={16} />
          GeoJSON
        </button>
        <button
          className="button secondary"
          disabled={!results.length}
          onClick={() => {
            document.body.classList.add("printing-report");
            window.print();
            document.body.classList.remove("printing-report");
          }}
        >
          <FileText size={16} />
          {t.report}
        </button>
        {results.length === 1 && (
          <button className="button secondary" disabled={saving} onClick={save}>
            <Database size={16} />
            {saving ? t.loading : t.save}
          </button>
        )}
      </div>
      <div className="print-report" ref={ref}>
        <h1>CaspianWatch AI — ғылыми есеп</h1>
        <p>Жағалау өзгерісі теңіз деңгейінің тікелей өлшемі емес.</p>
        {results.map((r) => (
          <section key={r.id}>
            <h2>
              {r.region} · {r.before} → {r.after}
            </h2>
            <p>
              Copernicus Sentinel-2 L2A · {r.before_scene} / {r.after_scene}
            </p>
            <p>
              Ашылған құрлық: {r.exposed_km2} км²; су басқан аумақ:{" "}
              {r.flooded_km2} км².
            </p>
            <p>
              Жарамды аумақ: {r.valid_fraction * 100}%; шекара сезімталдығы: ±
              {r.uncertainty_km2} км².
            </p>
            <p>
              {r.algorithm} · NDWI &gt; {r.threshold} · {r.resolution_m} м ·{" "}
              {r.projection}
            </p>
            <p>Шектеулер: {r.limitations.join("; ")}</p>
            <p>Есептелген: {r.created_at}</p>
          </section>
        ))}
      </div>
    </>
  );
}
function Analytics({ lang, results }: { lang: Lang; results: Analysis[] }) {
  const t = words[lang];
  const [region, setRegion] = useState("all");
  const filtered = results
    .filter((r) => region === "all" || r.region === region)
    .sort((a, b) => a.after.localeCompare(b.after));
  return (
    <>
      <div className="panel analytics-toolbar">
        <label className="field">
          {t.region}
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all">
              {lang === "en"
                ? "All regions"
                : lang === "ru"
                  ? "Все регионы"
                  : "Барлық аумақтар"}
            </option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {lang === "en" ? r.en : r.name}
              </option>
            ))}
          </select>
        </label>
        <ExportButtons results={filtered} lang={lang} />
      </div>
      {filtered.length ? (
        <>
          <ResultCards lang={lang} result={filtered[filtered.length - 1]} />
          <div className="panel chart-panel">
            <div className="panel-title">
              <ChartNoAxesCombined size={19} />
              {t.exposed} / {t.flooded} · км²
            </div>
            <AnalyticsChart data={filtered} lang={lang} />
          </div>
          <div className="panel table-panel">
            <table>
              <thead>
                <tr>
                  <th>{t.region}</th>
                  <th>
                    {t.before} → {t.after}
                  </th>
                  <th>{t.exposed}</th>
                  <th>{t.quality}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {regions.find((x) => x.id === r.region)?.name || r.region}
                    </td>
                    <td>
                      {r.before} → {r.after}
                    </td>
                    <td>{r.exposed_km2.toFixed(4)} км²</td>
                    <td>{(r.valid_fraction * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <Empty lang={lang} icon={ChartNoAxesCombined} href="/compare" />
      )}
      <p className="fine-print">
        {lang === "en"
          ? "Charts show calculated results from your database and this browser. Different extents and baselines are not directly comparable."
          : lang === "ru"
            ? "Графики показывают рассчитанные результаты из базы и этого браузера. Разные области и базовые периоды нельзя сравнивать напрямую."
            : "График база мен осы браузерде сақталған нақты есептеулерді көрсетеді. Әртүрлі аумақтар мен бастапқы кезеңдер тікелей салыстырылмайды."}
      </p>
    </>
  );
}
function Empty({
  lang,
  icon: Icon,
  href = "/research/new",
}: {
  lang: Lang;
  icon: typeof FlaskConical;
  href?: string;
}) {
  return (
    <div className="empty-state panel">
      <div className="empty-icon">
        <Icon size={33} />
      </div>
      <h3>{words[lang].empty}</h3>
      <p>
        {lang === "en"
          ? "Start your first study. Results will appear after real data has been processed."
          : lang === "ru"
            ? "Начните первое исследование. Результаты появятся после обработки реальных данных."
            : "Алғашқы зерттеуді бастаңыз. Нәтижелер нақты деректер өңделгеннен кейін пайда болады."}
      </p>
      <Link href={href} className="button primary">
        <Plus size={16} />
        {words[lang].start}
      </Link>
    </div>
  );
}
function Research({ lang }: { lang: Lang }) {
  const [active, setActive] = useState<any>(null),
    [projects, setProjects] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    api("projects")
      .then((r) => r.json())
      .then((j: any) => setProjects(j.projects))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      {error && <Notice text={error} />}
      <div className="project-grid">
        {projects.map((p) => (
          <div className="panel project-card" key={p.id}>
            <FlaskConical size={27} />
            <span className="small-tag">{p.status}</span>
            <h3>{p.title}</h3>
            <p>
              {p.region} · {p.before} → {p.after}
            </p>
            <small>{new Date(p.created_at).toLocaleDateString()}</small>
            <p>{p.notes}</p>
            <Link
              className="button secondary"
              href={
                "/compare?" +
                new URLSearchParams({
                  region: p.region,
                  before: p.before,
                  after: p.after,
                  project: p.id,
                }).toString()
              }
            >
              {words[lang].compare}
              <ArrowRight size={15} />
            </Link>
            {p.result && (
              <button className="button secondary" onClick={() => setActive(p)}>
                <FileText size={16} />
                {words[lang].report}
              </button>
            )}
          </div>
        ))}
      </div>
      {active && (
        <div className="panel saved-research">
          <h2>{active.title}</h2>
          <ResultCards result={active.result} lang={lang} />
          <ExportButtons results={[active.result]} lang={lang} />
        </div>
      )}
      {!projects.length && <Empty lang={lang} icon={FlaskConical} />}
    </>
  );
}
function NewResearch({ lang }: { lang: Lang }) {
  const t = words[lang];
  const [title, setTitle] = useState(""),
    [savedId, setSavedId] = useState<string | undefined>(),
    [region, setRegion] = useState("aktau"),
    [before, setBefore] = useState("2018-09-01"),
    [after, setAfter] = useState("2024-09-01"),
    [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSuccess(false);
    setMessage("");
    try {
      if (before >= after) throw new Error("Күн аралығын тексеріңіз.");
      const saved: any = await (
        await api("projects", {
          title,
          region,
          before,
          after,
          notes,
          bbox: regions.find((x) => x.id === region)!.bbox,
        })
      ).json();
      setSavedId(saved.project.id);
      setSuccess(true);
      setMessage(
        "Зерттеу Supabase базасына сақталды. Өңдеу үшін Уақыт машинасына өтіңіз.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="research-form-layout">
      <form className="panel research-form" onSubmit={save}>
        <div className="panel-title">
          <FlaskConical size={19} />
          {t.new}
        </div>
        <label className="field">
          {t.name}
          <input
            required
            minLength={2}
            maxLength={150}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              lang === "en"
                ? "e.g. Changes along the Aktau coast"
                : lang === "ru"
                  ? "Например: изменения побережья Актау"
                  : "Мысалы: Ақтау жағалауының өзгерісі"
            }
          />
        </label>
        <RegionSelect lang={lang} value={region} onChange={setRegion} />
        <div className="two-fields">
          <label className="field">
            {t.before}
            <input
              type="date"
              required
              value={before}
              onChange={(e) => setBefore(e.target.value)}
            />
          </label>
          <label className="field">
            {t.after}
            <input
              type="date"
              required
              value={after}
              onChange={(e) => setAfter(e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          {lang === "en"
            ? "Hypothesis and research notes"
            : lang === "ru"
              ? "Гипотеза и исследовательские заметки"
              : "Гипотеза және зерттеу түсіндірмесі"}
          <textarea
            rows={5}
            maxLength={10000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              lang === "en"
                ? "What do you want to investigate?"
                : lang === "ru"
                  ? "Что вы хотите исследовать?"
                  : "Нені зерттегіңіз келеді?"
            }
          />
        </label>
        {message && <Notice text={message} success={success} />}{" "}
        {savedId && (
          <Link
            className="button primary"
            href={
              "/compare?" +
              new URLSearchParams({
                region,
                before,
                after,
                project: savedId,
              }).toString()
            }
          >
            {t.compare}
            <ArrowRight size={16} />
          </Link>
        )}
        <div className="form-actions">
          <Link className="button secondary" href="/research">
            {lang === "en" ? "Back" : lang === "ru" ? "Назад" : "Артқа"}
          </Link>
          <button className="button primary" disabled={busy}>
            <Database size={16} />
            {busy ? t.loading : t.save}
          </button>
        </div>
      </form>
      <div className="panel research-guide">
        <span className="eyebrow">RESEARCH WORKFLOW</span>
        <h2>
          {lang === "en"
            ? "A clear path to discovery"
            : lang === "ru"
              ? "Понятный путь к открытию"
              : "Ғылыми зерттеудің айқын жолы"}
        </h2>
        {[
          lang === "en"
            ? "Define your question"
            : lang === "ru"
              ? "Сформулируйте вопрос"
              : "Зерттеу сұрағын анықтаңыз",
          lang === "en"
            ? "Choose an area and two dates"
            : lang === "ru"
              ? "Выберите область и две даты"
              : "Аумақ пен екі күнді таңдаңыз",
          lang === "en"
            ? "Compare and calculate NDWI"
            : lang === "ru"
              ? "Сравните и рассчитайте NDWI"
              : "Салыстырып, NDWI есептеңіз",
          lang === "en"
            ? "Review quality and export"
            : lang === "ru"
              ? "Проверьте качество и экспортируйте"
              : "Сапаны бағалап, есеп шығарыңыз",
        ].map((s, i) => (
          <div className="guide-step" key={i}>
            <b>0{i + 1}</b>
            <span>{s}</span>
          </div>
        ))}
        <Link href="/methodology">
          {t.methodology}
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  );
}
function Assistant({ lang }: { lang: Lang }) {
  const t = words[lang];
  const [input, setInput] = useState(""),
    [messages, setMessages] = useState<{ role: string; text: string }[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const suggestions =
    lang === "en"
      ? [
          "What is NDWI?",
          "How has the Aktau coast changed since 2018?",
          "Why do clouds affect measurements?",
          "What are the limits of shoreline detection?",
        ]
      : lang === "ru"
        ? [
            "Что такое NDWI?",
            "Как изменилось побережье Актау после 2018 года?",
            "Почему облака влияют на измерения?",
            "Каковы ограничения обнаружения береговой линии?",
          ]
        : [
            "NDWI дегеніміз не?",
            "Ақтау жағалауы 2018 жылдан кейін қалай өзгерді?",
            "Неге спутниктік сурет бұлтты болып көрінеді?",
            "Өлшеулердің шектеулері қандай?",
          ];
  async function send(text = input) {
    if (!text.trim() || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const j: any = await (
        await api("assistant", { message: text, lang })
      ).json();
      setMessages((m) => [...m, { role: "assistant", text: j.answer }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel assistant-panel">
      {!messages.length ? (
        <div className="assistant-welcome">
          <div className="assistant-logo">
            <BrainCircuit size={38} />
          </div>
          <span className="eyebrow">YOUR SCIENTIFIC PARTNER</span>
          <h2>
            {lang === "en"
              ? "Let’s understand the Caspian."
              : lang === "ru"
                ? "Исследуем Каспий вместе."
                : "Каспийді бірге зерттейік."}
          </h2>
          <p>
            {lang === "en"
              ? "Ask about methods, explore hypotheses and interpret verified research."
              : lang === "ru"
                ? "Изучайте методы, формулируйте гипотезы и обсуждайте проверенные результаты."
                : "Әдістерді түсініңіз, гипотеза құрыңыз, тексерілген зерттеу нәтижелерін талқылаңыз."}
          </p>
          <div className="suggestions">
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)}>
                <span>{s}</span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="messages" aria-live="polite">
          {messages.map((m, i) => (
            <div className={"message " + m.role} key={i}>
              <span className="message-avatar">
                {m.role === "user" ? "CW" : <BrainCircuit size={19} />}
              </span>
              <div>
                <b>
                  {m.role === "user"
                    ? lang === "en"
                      ? "You"
                      : lang === "ru"
                        ? "Вы"
                        : "Сіз"
                    : "Caspian AI"}
                </b>
                <p>{m.text}</p>
              </div>
            </div>
          ))}
          {busy && (
            <div className="typing">
              <span />
              <span />
              <span />
              {t.loading}
            </div>
          )}
        </div>
      )}
      {error && <Notice text={error} />}
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          maxLength={2000}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            lang === "en"
              ? "Ask a research question…"
              : lang === "ru"
                ? "Задайте исследовательский вопрос…"
                : "Зерттеу сұрағыңызды жазыңыз…"
          }
          aria-label="Message"
        />
        <button className="button primary" disabled={busy || !input.trim()}>
          <Send size={18} />
          <span>{t.send}</span>
        </button>
      </form>
      <p className="fine-print">
        <ShieldCheck size={13} />
        {lang === "en"
          ? "Numeric claims require saved database measurements. AI hypotheses need independent validation."
          : lang === "ru"
            ? "Численные выводы требуют измерений из базы. Гипотезы ИИ требуют независимой проверки."
            : "Сандық қорытынды үшін базада сақталған өлшеулер қажет. AI гипотезалары тәуелсіз тексеруді талап етеді."}
      </p>
    </div>
  );
}
function Gallery({ lang }: { lang: Lang }) {
  const [active, setActive] = useState<(typeof photos)[number] | null>(null);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <>
      <div className="gallery-grid">
        {photos.map((p) => (
          <article className="panel gallery-card" key={p.id}>
            <button className="photo-open" onClick={() => setActive(p)}>
              <img
                loading="lazy"
                src={p.image.replace(".jpg", "-preview.jpg")}
                alt={p.title}
              />
              <span>
                <Focus size={20} />
                {lang === "en"
                  ? "View full image"
                  : lang === "ru"
                    ? "Открыть полный размер"
                    : "Толық өлшемде ашу"}
              </span>
            </button>
            <div className="gallery-info">
              <div className="eyebrow">{p.satellite}</div>
              <h3>{lang === "en" ? p.en : lang === "ru" ? p.ru : p.title}</h3>
              <p>
                {lang === "en"
                  ? p.descriptionEn
                  : lang === "ru"
                    ? p.descriptionRu
                    : p.description}
              </p>
              <div>
                <Clock size={14} />
                {p.date}
                <a target="_blank" rel="noreferrer" href={p.url}>
                  {p.source}
                  <ExternalLink size={13} />
                </a>
              </div>
              <small>
                {p.credit} ·{" "}
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={
                    p.licenseUrl ||
                    "https://www.nasa.gov/nasa-brand-center/images-and-media/"
                  }
                >
                  {p.license || "NASA media usage guidelines"}
                </a>
              </small>
            </div>
          </article>
        ))}
      </div>
      {active && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={() => setActive(null)}
        >
          <button
            className="modal-close"
            aria-label="Close"
            onClick={() => setActive(null)}
          >
            <X />
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <img src={active.image} alt={active.title} />
            <h3>
              {lang === "en"
                ? active.en
                : lang === "ru"
                  ? active.ru
                  : active.title}{" "}
              · {active.date}
            </h3>
            <p>{active.credit}</p>
            <a href={active.image} download className="button secondary">
              <Download size={16} />
              JPEG
            </a>
          </div>
        </div>
      )}
    </>
  );
}
function Methodology({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const sections = methodology[lang];
  return (
    <div className="methodology-layout">
      <div className="methodology-sections">
        {sections.map(([title, body], i) => (
          <section id={"step-" + i} className="panel method-card" key={title}>
            <span className="method-num">0{i + 1}</span>
            <div>
              <h2>{title}</h2>
              <p>{body}</p>
              {i === 3 && (
                <div className="formula">
                  NDWI = <span>(B03 − B08) / (B03 + B08)</span>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
      <aside className="panel method-nav">
        <span className="eyebrow">NDWI BASELINE · v1.0</span>
        <h3>
          {en
            ? "Reproducible science"
            : lang === "ru"
              ? "Воспроизводимая наука"
              : "Қайталанатын ғылым"}
        </h3>
        {sections.map(([s], i) => (
          <a href={"#step-" + i} key={s}>
            <span>0{i + 1}</span>
            {s}
          </a>
        ))}
        <Link href="/compare" className="button primary">
          {words[lang].start}
          <ArrowRight size={15} />
        </Link>
      </aside>
    </div>
  );
}
function Sources() {
  return (
    <div className="sources-grid">
      {sources.map(([name, description, url], i) => (
        <a
          className="panel source-card"
          key={name}
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          <span className="source-number">0{i + 1}</span>
          <div>
            <h3>{name}</h3>
            <p>{description}</p>
            <small>{new URL(url).hostname}</small>
          </div>
          <ExternalLink size={19} />
        </a>
      ))}
    </div>
  );
}
function About({ lang }: { lang: Lang }) {
  return (
    <>
      <section className="panel about-hero">
        <div>
          <span className="eyebrow">SCIENCE FOR OUR SHARED SEA</span>
          <h2>{words[lang].footer}</h2>
          <p>
            {lang === "en"
              ? "CaspianWatch AI makes coastal research accessible to students and researchers. Satellite observations and transparent methods support evidence-based environmental inquiry, beginning on Kazakhstan’s Aktau coast."
              : lang === "ru"
                ? "CaspianWatch AI делает исследования побережья доступными для школьников и исследователей. Спутниковые наблюдения и прозрачные методы помогают изучать окружающую среду, начиная с побережья Актау."
                : "CaspianWatch AI оқушылар мен зерттеушілерге жағалау өзгерістерін зерттеуді қолжетімді етеді. Қазақстанның Ақтау жағалауынан басталған жоба спутниктік бақылаулар мен ашық әдістерге сүйенеді."}
          </p>
          <Link className="button primary" href="/research/new">
            {words[lang].start}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <img src="/images/caspian-preview.jpg" alt="NASA Caspian Sea 2010" />
      </section>
      <div className="sdg-grid">
        {[
          ["13", "CLIMATE ACTION", "Климаттың өзгеруіне қарсы күрес"],
          ["14", "LIFE BELOW WATER", "Су экожүйелерін сақтау"],
          ["9", "INDUSTRY & INNOVATION", "Инновациялар және инфрақұрылым"],
        ].map(([n, en, kk]) => (
          <div className="panel sdg-card" key={n}>
            <span>{n}</span>
            <Leaf size={25} />
            <h3>{lang === "en" ? en : kk}</h3>
            <small>UN SUSTAINABLE DEVELOPMENT GOALS</small>
          </div>
        ))}
      </div>
    </>
  );
}
function Dashboard({
  lang,
  status,
  results,
}: {
  lang: Lang;
  status: any;
  results: Analysis[];
}) {
  const t = words[lang];
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [user, setUser] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [signup, setSignup] = useState(false);
  useEffect(() => {
    const db = browserDB();
    db?.auth.getUser().then(({ data }) => setUser(data.user?.email || null));
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const db = browserDB();
      if (!db) throw new Error("Supabase қосылымы орнатылмаған.");
      const r = signup
        ? await db.auth.signUp({ email, password })
        : await db.auth.signInWithPassword({ email, password });
      if (r.error) throw r.error;
      setUser(r.data.user?.email || null);
      setMessage(
        signup
          ? "Тіркелу орындалды. Электрондық поштаңызды растаңыз."
          : "Кіру орындалды.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="dashboard-grid">
        <div className="panel auth-panel">
          <div className="panel-title">
            <LogIn size={18} />
            {t.dashboard}
          </div>
          {user ? (
            <>
              <h2>{user}</h2>
              <Link className="button primary" href="/research">
                {t.research}
                <ArrowRight size={16} />
              </Link>
              <button
                className="button secondary"
                onClick={async () => {
                  await browserDB()?.auth.signOut();
                  setUser(null);
                }}
              >
                {t.logout}
              </button>
            </>
          ) : (
            <form onSubmit={login}>
              <label className="field">
                Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher@example.com"
                />
              </label>
              <label className="field">
                {lang === "en"
                  ? "Password"
                  : lang === "ru"
                    ? "Пароль"
                    : "Құпиясөз"}
                <input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={signup ? "new-password" : "current-password"}
                />
              </label>
              <button className="button primary full" disabled={busy}>
                {busy
                  ? t.loading
                  : signup
                    ? lang === "en"
                      ? "Create account"
                      : lang === "ru"
                        ? "Регистрация"
                        : "Тіркелу"
                    : t.login}
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => setSignup(!signup)}
              >
                {signup
                  ? t.login
                  : lang === "en"
                    ? "Create a research account"
                    : lang === "ru"
                      ? "Создать аккаунт исследователя"
                      : "Зерттеуші аккаунтын ашу"}
              </button>
            </form>
          )}
          {message && <Notice text={message} />}
        </div>
        <div className="panel connection-panel">
          <div className="panel-title">
            <Radio size={18} />
            {t.settings}
          </div>
          {[
            ["copernicus", "Copernicus / Sentinel-2"],
            ["processing", "Python / NDWI"],
            ["supabase", "Supabase / PostGIS"],
            ["gemini", "Gemini / Caspian AI"],
          ].map(([key, name]) => (
            <div className="connection" key={key}>
              <span className={status?.[key] ? "live-dot" : "muted-dot"} />
              <b>{name}</b>
              <span className={status?.[key] ? "connected" : ""}>
                {status?.[key]
                  ? lang === "en"
                    ? "Configured"
                    : lang === "ru"
                      ? "Настроено"
                      : "Бапталған"
                  : lang === "en"
                    ? "Not configured"
                    : lang === "ru"
                      ? "Не подключено"
                      : "Қосылмаған"}
              </span>
            </div>
          ))}
          <p className="fine-print">
            {lang === "en"
              ? "Configuration indicators do not verify credentials. Secrets are stored on the server."
              : lang === "ru"
                ? "Индикаторы показывают наличие настроек, а не действительность ключей. Секреты хранятся на сервере."
                : "Күй кілттердің орнатылғанын көрсетеді; олардың жарамдылығын растамайды. Құпиялар серверде сақталады."}
          </p>
        </div>
      </div>
      <div className="panel local-results">
        <div className="panel-title">
          <Database size={18} />
          {lang === "en"
            ? "Results in this browser"
            : lang === "ru"
              ? "Результаты в этом браузере"
              : "Осы браузердегі нәтижелер"}
          <span className="small-tag">{results.length}</span>
        </div>
        <ExportButtons results={results} lang={lang} />
        <Link href="/analytics" className="button secondary">
          {t.analytics}
          <ArrowRight size={15} />
        </Link>
      </div>
    </>
  );
}
