import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Download,
  History,
  Info,
  LockKeyhole,
  Moon,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  X,
  Minus,
  WifiOff,
} from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { approximateDrinks, estimate, HOUR } from "./engine";
import { load, KEY, EMPTY, type Stored } from "./storage";
import { clock, dayTime, roundedTime } from "./time";
import Chart from "./Chart";
import {
  Dialog,
  SettingsForm,
  DrinkForm,
  SessionForm,
} from "./components/Forms";
import Guide from "./components/Guide";

type View = "dashboard" | "history" | "guide";
type Modal =
  | "profile"
  | "drink"
  | "morning"
  | "start"
  | "total"
  | "delete"
  | "archive"
  | "install"
  | null;
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export default function App() {
  const [initial] = useState(() => {
    try {
      return { data: load(), error: "" };
    } catch {
      return {
        data: EMPTY,
        error:
          "Saved data could not be read. Delete all data to reset, or continue without overwriting it.",
      };
    }
  });
  const [data, setData] = useState<Stored>(initial.data);
  const [storageError, setStorageError] = useState(initial.error);
  const [corrupt, setCorrupt] = useState(!!initial.error);
  const [view, setView] = useState<View>("dashboard");
  const [modal, setModal] = useState<Modal>(null);
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(
    matchMedia("(display-mode: standalone)").matches,
  );
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const on = () => setOnline(navigator.onLine);
    const before = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    const after = () => {
      setInstalled(true);
      setInstall(null);
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", after);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", after);
    };
  }, []);
  const settings = data.settings,
    session = data.active;
  const minute = Math.floor(now / 60_000);
  const result = useMemo(() => {
    if (!settings) return null;
    try {
      const time = Math.max(
        minute * 60_000,
        ...(session?.drinks.map((d) => d.time) ?? []),
      );
      return estimate(
        session?.person ?? settings.person,
        session?.drinks ?? [],
        time,
        settings.threshold,
        settings.margin,
      );
    } catch {
      return null;
    }
  }, [settings, session, minute]);
  function persist(next: Stored) {
    setData(next);
    try {
      if (corrupt) {
        setStorageError(
          "Saved data could not be read. Delete all data before saving new sessions.",
        );
        return;
      }
      localStorage.setItem(KEY, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError(
        "Storage is unavailable or full. This session will not survive closing the app.",
      );
    }
  }
  function request(m: Modal) {
    setModal(!settings && m !== "delete" && m !== "install" ? "profile" : m);
  }
  function add(amount: number, time = Date.now(), label = "Standard drinks") {
    if (!settings) {
      setModal("profile");
      return;
    }
    const current = session ?? {
      id: crypto.randomUUID(),
      start: time,
      drinks: [],
      stopped: false,
      approximate: false,
      person: settings.person,
    };
    const next = {
      ...current,
      stopped: false,
      drinks: [
        ...current.drinks,
        { id: crypto.randomUUID(), time, standardDrinks: amount, label },
      ],
    };
    const updated = estimate(
      next.person,
      next.drinks,
      Date.now(),
      settings.threshold,
      settings.margin,
    );
    const delta =
      result && session?.drinks.length
        ? roundedTime(updated.conservative) - roundedTime(result.conservative)
        : 0;
    setNotice(
      delta > 0
        ? `Waiting estimate moved from ${dayTime(roundedTime(result!.conservative))} to ${dayTime(roundedTime(updated.conservative))} · +${Math.floor(delta / HOUR)} hr ${Math.round((delta % HOUR) / 60_000)} min`
        : "Drink added. Your estimate has been updated.",
    );
    persist({ ...data, active: next });
    setModal(null);
  }
  function quickAdd(amount: number) {
    try {
      add(amount);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function decrease() {
    if (!session?.drinks.length) return;
    const drinks = session.drinks.slice();
    const last = drinks.at(-1)!;
    const amount = Math.round((last.standardDrinks - 0.1) * 10) / 10;
    if (amount <= 0) drinks.pop();
    else drinks[drinks.length - 1] = { ...last, standardDrinks: amount };
    persist({ ...data, active: { ...session, drinks } });
    setNotice("Total reduced by 0.1 standard drinks. Estimate updated.");
  }
  function archive() {
    if (session?.drinks.length)
      persist({
        ...data,
        history: [session, ...data.history].slice(0, 100),
        active: null,
      });
    else persist({ ...data, active: null });
    setModal(null);
    setNotice("Session saved on this device.");
  }
  const hasDrinks = !!session?.drinks.length;
  const status = result?.status ?? "NO SESSION YET";
  const severity =
    status === "DO NOT DRIVE"
      ? "danger"
      : status === "ESTIMATE BELOW LIMIT"
        ? "low"
        : "caution";
  const remaining = result
    ? Math.max(0, roundedTime(result.conservative) - now)
    : 0;
  const countdown = [
    Math.floor(remaining / HOUR),
    Math.floor((remaining % HOUR) / 60_000),
    Math.floor((remaining % 60_000) / 1000),
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#dashboard"
          onClick={() => setView("dashboard")}
          aria-label="Clear2Drive home"
        >
          <span className="brand-symbol">
            <span />
          </span>
          <span>
            CLEAR<span className="brand-two">2</span>DRIVE
            <small>ALCOHOL CLEARANCE ESTIMATOR</small>
          </span>
        </a>
        <div className="nav-label">YOUR SPACE</div>
        <nav aria-label="Main navigation">
          {(
            [
              { id: "dashboard", name: "Overview", icon: Activity },
              { id: "history", name: "Session history", icon: History },
              { id: "guide", name: "Know your estimate", icon: ShieldCheck },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
              {view === item.id ? <span className="nav-dot" /> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-mini">
            <LockKeyhole size={19} />
            <div>
              Private by design<small>Your data stays on this device.</small>
            </div>
          </div>
          <button className="nav-settings" onClick={() => request("profile")}>
            <Settings2 size={18} />
            Your profile
            <ChevronRight size={16} />
          </button>
          {!installed ? (
            <button
              className="nav-settings"
              onClick={() => setModal("install")}
            >
              <Download size={18} />
              Install app
              <ChevronRight size={16} />
            </button>
          ) : null}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="topbar-title">
            {view === "dashboard"
              ? "YOUR OVERVIEW"
              : view === "history"
                ? "SESSION HISTORY"
                : "INFORMATION & SAFETY"}
          </span>
          <div className="topbar-right">
            <span className="local-badge">
              <span />
              {online ? "LOCAL & PRIVATE" : "OFFLINE MODE"}
            </span>
            <button
              className="profile-button"
              onClick={() => request("profile")}
              aria-label="Edit your profile"
            >
              <Settings2 size={18} />
              <span>
                {settings
                  ? `${settings.person.weight} kg · ${settings.jurisdiction}`
                  : "Set up profile"}
              </span>
            </button>
          </div>
        </header>
        <main id="main">
          <a className="skip-link" href="#content">
            Skip to content
          </a>
          <div id="content" tabIndex={-1}>
            {storageError ? (
              <div className="banner error" role="alert">
                {storageError}
                <button onClick={() => setModal("delete")}>
                  Delete all data
                </button>
              </div>
            ) : null}
            {needRefresh ? (
              <div className="banner">
                An update is ready. Your session is saved.
                <button onClick={() => void updateServiceWorker(true)}>
                  Update app
                </button>
              </div>
            ) : null}
            {!online ? (
              <div className="offline-note">
                <WifiOff size={15} />
                Offline. Calculations and saved sessions still work.
              </div>
            ) : null}
            {view === "dashboard" ? (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">
                      <span className="live-dot" />
                      YOUR SESSION, AT A GLANCE
                    </div>
                    <h1>
                      {hasDrinks
                        ? "A clearer picture."
                        : "Plan a clearer journey."}
                    </h1>
                    <p>
                      Understand your estimate. Make a more informed choice.
                    </p>
                  </div>
                  <button
                    className="subtle-button"
                    onClick={() => request("morning")}
                  >
                    <Moon size={17} />
                    Drank last night?
                    <ArrowUpRight size={16} />
                  </button>
                </div>
                {!settings ? (
                  <section className="setup-banner">
                    <div>
                      <ShieldCheck size={24} />
                      <h2>Start with a few details.</h2>
                      <p>
                        Weight, body composition and your licence profile. Ready
                        in under a minute.
                      </p>
                    </div>
                    <button
                      className="primary"
                      onClick={() => setModal("profile")}
                    >
                      Set up your estimate
                      <ArrowRight size={17} />
                    </button>
                  </section>
                ) : null}
                {settings && !result ? (
                  <div className="banner error">
                    This session is outside the model’s supported range. Save it
                    to history and start a new session.
                    <button onClick={() => setModal("archive")}>
                      Save & start fresh
                    </button>
                  </div>
                ) : null}
                <div className="dashboard-grid">
                  <section className="panel session-card">
                    <div className="card-head">
                      <span className="eyebrow">
                        {session?.approximate
                          ? "APPROXIMATE SESSION"
                          : "CURRENT SESSION"}
                      </span>
                      <span className="pill">
                        <span />
                        {session?.stopped ? "FINISHED DRINKING" : "TRACKING"}
                      </span>
                    </div>
                    <div className="drink-count">
                      <button
                        className="count-edit"
                        onClick={() => request("total")}
                        aria-label="Edit total standard drinks"
                      >
                        {(result?.total ?? 0).toFixed(1)}
                      </button>
                      <div className="count-unit">
                        STANDARD
                        <br />
                        DRINKS{" "}
                        <button
                          className="mini-info"
                          onClick={() => setView("guide")}
                          aria-label="About standard drinks"
                        >
                          <Info size={14} />
                        </button>
                      </div>
                      <div className="count-controls">
                        <button
                          aria-label="Increase total by 0.1 standard drinks"
                          onClick={() => quickAdd(0.1)}
                        >
                          <Plus />
                        </button>
                        <button
                          aria-label="Decrease total by 0.1 standard drinks"
                          disabled={!hasDrinks}
                          onClick={decrease}
                        >
                          <Minus />
                        </button>
                      </div>
                    </div>
                    <div className="session-times">
                      <button onClick={() => request("start")}>
                        <span>Started</span>
                        <strong>
                          {session ? clock(session.start) : "Not started"}
                          <Settings2 size={13} />
                        </strong>
                      </button>
                      <div>
                        <span>Last drink</span>
                        <strong>
                          {hasDrinks
                            ? clock(
                                Math.max(...session!.drinks.map((d) => d.time)),
                              )
                            : "—"}
                        </strong>
                      </div>
                    </div>
                    <div className="quick-add">
                      <button onClick={() => quickAdd(1)}>+ 1 drink</button>
                      <button onClick={() => quickAdd(1.5)}>+ 1.5</button>
                      <button onClick={() => quickAdd(2)}>+ 2</button>
                      <button onClick={() => request("drink")}>Custom</button>
                    </div>
                    <button
                      className="primary full add-drink"
                      aria-label="Add drink"
                      onClick={() => request("drink")}
                    >
                      <Plus size={22} />
                      Add drink<span>↗</span>
                    </button>
                    <p className="card-footnote">
                      1 Australian standard drink = 10 g of alcohol
                    </p>
                  </section>
                  <section
                    className={`panel bac-card ${hasDrinks ? severity : ""}`}
                  >
                    <div className="card-head">
                      <span className="eyebrow">ESTIMATED BAC NOW</span>
                      <Activity size={19} />
                    </div>
                    <div className="bac-number">
                      {hasDrinks && result
                        ? `~${result.current.toFixed(2)}`
                        : "—"}
                      <span>%</span>
                    </div>
                    <div className="bac-state">
                      {hasDrinks ? (
                        <TriangleAlert size={16} />
                      ) : (
                        <Info size={16} />
                      )}
                      <strong>{status}</strong>
                    </div>
                    <p className="bac-range">
                      {hasDrinks && result
                        ? `Illustrative range ~${(Math.floor(result.low * 100) / 100).toFixed(2)}–${(Math.ceil(result.high * 100) / 100).toFixed(2)}%`
                        : "Add your drinks to see an estimate."}
                    </p>
                    <div className="bac-message">
                      {hasDrinks
                        ? status === "DO NOT DRIVE"
                          ? "Above the selected threshold. Arrange another way home."
                          : status === "TOO CLOSE TO CALL"
                            ? "Wait longer or use a reliable breath test."
                            : status === "BAC MAY STILL RISE"
                              ? "Recent alcohol may still be absorbing. Do not rely on this estimate."
                              : settings?.threshold === 0
                                ? "An estimate cannot establish the zero BAC your profile requires."
                                : "Below the selected threshold in these scenarios. This is not permission to drive."
                        : "Your estimate will account for when you had each drink."}
                    </div>
                    <div className="bac-bottom">
                      <span>
                        {settings?.threshold === 0
                          ? "ZERO-BAC PROFILE"
                          : `SELECTED THRESHOLD ${settings?.threshold.toFixed(2) ?? "—"}%`}
                      </span>
                      <button onClick={() => request("profile")}>
                        Change
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </section>
                  <section className="wait-card">
                    <div className="card-head">
                      <span className="eyebrow">CONSERVATIVE ESTIMATE</span>
                      <ShieldCheck size={21} />
                    </div>
                    <div className="wait-label">
                      {hasDrinks
                        ? "WAIT UNTIL AT LEAST"
                        : "YOUR WAITING ESTIMATE"}
                    </div>
                    <div className="wait-time">
                      {hasDrinks && result
                        ? clock(roundedTime(result.conservative))
                        : "— : —"}
                    </div>
                    <div className="wait-day">
                      {hasDrinks && result
                        ? dayTime(roundedTime(result.conservative)).split(
                            " · ",
                          )[0]
                        : "Add a drink to begin"}
                      {hasDrinks ? <ArrowUpRight size={19} /> : null}
                    </div>
                    <p>
                      before even considering driving.
                      <br />
                      <strong>
                        Use a reliable breath test. If in doubt, don’t drive.
                      </strong>
                    </p>
                    <div className="buffer">
                      <Clock3 size={16} />
                      {settings?.margin ?? 90}-minute extra buffer included
                    </div>
                    <span className="wait-bottom">
                      AN ESTIMATE. NEVER A GREEN LIGHT.
                    </span>
                  </section>
                </div>
                <div className="below-grid">
                  <section className="panel timeline-card">
                    <div className="card-head">
                      <div>
                        <span className="eyebrow">BAC OVER TIME</span>
                        <h2>Your estimated timeline</h2>
                      </div>
                      <span className="pill neutral">
                        {hasDrinks ? "LIVE ESTIMATE" : "NO DRINKS LOGGED"}
                      </span>
                    </div>
                    {result ? (
                      <Chart
                        points={result.timeline}
                        drinks={session?.drinks ?? []}
                        threshold={settings!.threshold}
                        conservative={roundedTime(result.conservative)}
                        below={result.below}
                        now={now}
                      />
                    ) : (
                      <div className="empty-chart">
                        <Activity size={40} />
                        <p>Your timeline starts with your first drink.</p>
                        <span>
                          Every timestamp helps build a more useful picture.
                        </span>
                      </div>
                    )}
                    <div className="chart-legend">
                      <span>
                        <i className="line-key" />
                        Estimated BAC
                      </span>
                      <span>
                        <i className="dot-key" />
                        Drink logged
                      </span>
                      <span>
                        <i className="dash-key" />
                        Selected threshold
                      </span>
                      <span>
                        <i className="wait-key" />
                        Waiting estimate
                      </span>
                    </div>
                    <div className="clearance-row">
                      <div>
                        <span>
                          {settings?.threshold === 0
                            ? "Zero BAC"
                            : "Estimated below " +
                              (settings?.threshold.toFixed(2) ?? "threshold")}
                        </span>
                        <strong>
                          {hasDrinks && result
                            ? settings?.threshold === 0
                              ? "Cannot confirm"
                              : `~${dayTime(roundedTime(result.below))}`
                            : "—"}
                        </strong>
                      </div>
                      <div>
                        <span>Estimated near zero</span>
                        <strong>
                          {hasDrinks && result
                            ? `~${dayTime(roundedTime(result.nearZero))}`
                            : "—"}
                        </strong>
                      </div>
                    </div>
                    <p className="small muted">
                      BAC may still rise after your last drink. The curve is a
                      model, not a measurement.
                    </p>
                  </section>
                  <section className="panel insight-card">
                    <div className="insight-icon">
                      <Moon size={26} />
                    </div>
                    <span className="eyebrow">THE MORNING AFTER</span>
                    <h2>
                      A new day doesn’t
                      <br />
                      reset your BAC.
                    </h2>
                    <p>
                      Alcohol can still be present after a night’s sleep. Check
                      an approximate session from last night.
                    </p>
                    <button
                      className="secondary full"
                      onClick={() => request("morning")}
                    >
                      Check last night
                      <ArrowRight size={17} />
                    </button>
                    <div className="insight-divider" />
                    <div className="tip">
                      <Info size={18} />
                      <p>
                        Feeling sober doesn’t mean your BAC is zero. Only a
                        breathalyser or alcohol test can give a current reading.
                      </p>
                    </div>
                  </section>
                </div>
                {hasDrinks ? (
                  <section className="panel log-panel">
                    <div className="card-head">
                      <h2>Drink log</h2>
                      <div className="log-actions">
                        <button
                          className="text-link"
                          onClick={() =>
                            persist({
                              ...data,
                              active: {
                                ...session!,
                                stopped: !session!.stopped,
                              },
                            })
                          }
                        >
                          {session?.stopped ? (
                            <Plus size={15} />
                          ) : (
                            <Check size={15} />
                          )}{" "}
                          {session?.stopped
                            ? "Resume drinking log"
                            : "I’ve stopped drinking"}
                        </button>
                        <button
                          className="text-link"
                          onClick={() => setModal("archive")}
                        >
                          Save & start fresh
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                    {session!.drinks
                      .slice()
                      .sort((a, b) => a.time - b.time)
                      .map((d) => (
                        <div className="drink-row" key={d.id}>
                          <span className="drink-dot" />
                          <div>
                            <strong>{d.label}</strong>
                            <span>{dayTime(d.time)}</span>
                          </div>
                          <strong>
                            {d.standardDrinks.toFixed(1)}
                            <small> standard drinks</small>
                          </strong>
                          <button
                            className="icon-button"
                            aria-label={`Remove drink at ${clock(d.time)}`}
                            onClick={() => {
                              persist({
                                ...data,
                                active: {
                                  ...session!,
                                  drinks: session!.drinks.filter(
                                    (x) => x.id !== d.id,
                                  ),
                                },
                              });
                              setNotice(
                                "Drink removed. Estimate recalculated.",
                              );
                            }}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      ))}
                    {session?.stopped ? (
                      <div className="countdown">
                        <Clock3 size={22} />
                        <div>
                          <span>ESTIMATED WAIT REMAINING</span>
                          <strong>{countdown}</strong>
                        </div>
                        <p>
                          {remaining > 0
                            ? "This countdown is an estimate. Reaching zero is not confirmation of sobriety."
                            : "Waiting estimate reached. BAC and fitness to drive remain unconfirmed. Use a reliable breath test."}
                        </p>
                      </div>
                    ) : null}
                  </section>
                ) : null}
                <div className="safety-strip">
                  <ShieldCheck size={22} />
                  <div>
                    <strong>This is an estimate, not a BAC measurement.</strong>
                    <p>
                      Do not rely on this estimate to decide whether to drive.
                      If in doubt, don’t drive.
                    </p>
                  </div>
                  <button
                    aria-label="Read disclaimer and safety information"
                    onClick={() => setView("guide")}
                  >
                    <ArrowUpRight size={20} />
                  </button>
                </div>
              </>
            ) : null}
            {view === "history" ? (
              <>
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">ONLY ON THIS DEVICE</span>
                    <h1>Your session history.</h1>
                    <p>
                      A record of your sessions, with their original body
                      details.
                    </p>
                  </div>
                  <button
                    className="subtle-button"
                    onClick={() => setModal("delete")}
                  >
                    <Trash2 size={16} />
                    Delete all data
                  </button>
                </div>
                {!data.history.length ? (
                  <section className="panel empty-state">
                    <History size={40} />
                    <h2>No saved sessions yet.</h2>
                    <p>
                      Use “Save & start fresh” after a session to keep it here.
                    </p>
                    <button
                      className="secondary"
                      onClick={() => setView("dashboard")}
                    >
                      Back to overview
                      <ArrowRight size={16} />
                    </button>
                  </section>
                ) : (
                  data.history.map((s) => {
                    const last = Math.max(...s.drinks.map((d) => d.time));
                    const e = estimate(
                      s.person,
                      s.drinks,
                      last,
                      settings?.threshold ?? 0,
                      settings?.margin ?? 90,
                    );
                    return (
                      <section className="panel history-item" key={s.id}>
                        <div>
                          <span className="eyebrow">
                            {new Intl.DateTimeFormat("en-AU", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }).format(s.start)}
                          </span>
                          <h2>
                            {e.total.toFixed(1)} <small>standard drinks</small>
                          </h2>
                          <p>
                            {clock(s.start)} – {dayTime(last, s.start)}
                            {s.approximate ? " · approximate" : ""}
                          </p>
                        </div>
                        <div>
                          <span className="small muted">
                            Conservative waiting estimate
                          </span>
                          <strong>
                            {dayTime(roundedTime(e.conservative), s.start)}
                          </strong>
                          <button
                            className="text-link"
                            onClick={() =>
                              persist({
                                ...data,
                                history: data.history.filter(
                                  (x) => x.id !== s.id,
                                ),
                              })
                            }
                          >
                            <Trash2 size={14} />
                            Delete session
                          </button>
                        </div>
                      </section>
                    );
                  })
                )}
                <p className="muted small">
                  Saved estimates are not test results. Your drinking history
                  stays on this device.
                </p>
              </>
            ) : null}
            {view === "guide" ? <Guide /> : null}
            <footer>
              <span>
                <LockKeyhole size={13} />
                Your drinking history stays on this device.
              </span>
              <div>
                <button onClick={() => setView("guide")}>
                  Safety & methodology
                </button>
                <button onClick={() => setModal("delete")}>
                  Delete all data
                </button>
                {offlineReady ? <span>Offline ready</span> : null}
              </div>
            </footer>
          </div>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button
          aria-current={view === "dashboard" ? "page" : undefined}
          onClick={() => setView("dashboard")}
        >
          <Activity size={21} />
          Overview
        </button>
        <button
          aria-current={view === "history" ? "page" : undefined}
          onClick={() => setView("history")}
        >
          <History size={21} />
          History
        </button>
        <button
          className="mobile-add"
          onClick={() => request("drink")}
          aria-label="Add drink"
        >
          <Plus size={25} />
        </button>
        <button
          aria-current={view === "guide" ? "page" : undefined}
          onClick={() => setView("guide")}
        >
          <ShieldCheck size={21} />
          Guide
        </button>
        <button onClick={() => request("profile")}>
          <Settings2 size={21} />
          Profile
        </button>
      </nav>
      {notice ? (
        <div className="toast" role="status">
          <ArrowDownRight size={19} />
          <span>{notice}</span>
          <button
            className="icon-button"
            onClick={() => setNotice("")}
            aria-label="Dismiss update"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
      {modal ? (
        <Dialog
          title={
            {
              profile: settings ? "Your profile" : "Your estimate starts here",
              drink: "Add a drink",
              morning: "Drank last night?",
              start: "Session start",
              total: "Edit session total",
              delete: "Delete all saved data?",
              archive: "Save this session?",
              install: "Keep clarity close.",
            }[modal]
          }
          onClose={() => setModal(null)}
        >
          {modal === "profile" ? (
            <SettingsForm
              initial={settings}
              onSave={(s) => {
                persist({
                  ...data,
                  settings: s,
                  active: session ? { ...session, person: s.person } : null,
                });
                setModal(null);
              }}
            />
          ) : null}
          {modal === "drink" ? (
            <DrinkForm
              start={session?.start ?? now - 7 * 24 * HOUR}
              onAdd={add}
            />
          ) : null}
          {modal === "morning" || modal === "start" || modal === "total" ? (
            <SessionForm
              mode={modal}
              session={modal === "morning" ? null : session}
              onSave={(start, last, total) => {
                if (!settings) return;
                if (modal === "start") {
                  if (session?.drinks.some((d) => d.time < start))
                    throw new Error(
                      "Start must be at or before every logged drink.",
                    );
                  persist({
                    ...data,
                    active: session
                      ? { ...session, start }
                      : {
                          id: crypto.randomUUID(),
                          start,
                          drinks: [],
                          stopped: false,
                          approximate: false,
                          person: settings.person,
                        },
                  });
                } else {
                  const drinks = approximateDrinks(total, start, last);
                  estimate(
                    settings.person,
                    drinks,
                    Date.now(),
                    settings.threshold,
                    settings.margin,
                  );
                  persist({
                    ...data,
                    history:
                      modal === "morning" && session?.drinks.length
                        ? [session, ...data.history].slice(0, 100)
                        : data.history,
                    active: {
                      id: crypto.randomUUID(),
                      start,
                      drinks,
                      stopped: modal === "morning",
                      approximate: true,
                      person: settings.person,
                    },
                  });
                  setNotice(
                    "Approximate session calculated. Alcohol may still be present. Actual timing can change the result.",
                  );
                }
                setView("dashboard");
                setModal(null);
              }}
            />
          ) : null}
          {modal === "delete" ? (
            <>
              <p>
                Remove your profile, current session and all history from this
                browser? This cannot be undone.
              </p>
              <button
                className="danger-button full"
                onClick={() => {
                  try {
                    localStorage.removeItem(KEY);
                    setCorrupt(false);
                    setStorageError("");
                    setData(EMPTY);
                    setModal(null);
                    setNotice(
                      "All personal details and sessions deleted from this browser.",
                    );
                  } catch {
                    setStorageError(
                      "Browser storage could not be cleared. Clear this site's data in your browser settings.",
                    );
                    setModal(null);
                  }
                }}
              >
                Delete all data
                <Trash2 size={18} />
              </button>
              <button className="secondary full" onClick={() => setModal(null)}>
                Keep my data
              </button>
            </>
          ) : null}
          {modal === "archive" ? (
            <>
              <p>
                Your session will be stored on this device. A fresh session will
                start with no drinks.
              </p>
              <button className="primary full" onClick={archive}>
                Save & start fresh
                <Check size={18} />
              </button>
            </>
          ) : null}
          {modal === "install" ? (
            <>
              <div className="install-art">
                <span className="brand-symbol">
                  <span />
                </span>
              </div>
              <p>
                Install Clear2Drive for a private, offline calculator on your
                home screen.
              </p>
              {install ? (
                <button
                  className="primary full"
                  onClick={async () => {
                    await install.prompt();
                    const choice = await install.userChoice;
                    if (choice.outcome === "accepted") setModal(null);
                    setInstall(null);
                  }}
                >
                  <Download size={18} />
                  Install Clear2Drive
                </button>
              ) : (
                <>
                  <p>
                    <strong>iPhone / iPad:</strong> open in Safari, tap Share,
                    then Add to Home Screen and Open as Web App.
                  </p>
                  <p>
                    <strong>Android:</strong> in Chrome’s menu choose Install
                    app or Add to Home screen. <strong>Desktop:</strong> use
                    your browser’s install icon.
                  </p>
                </>
              )}
              <p className="small muted">
                {offlineReady
                  ? "Offline files are ready."
                  : "Connect once and load the app fully before using it offline."}{" "}
                Your saved data is specific to this browser or installed app.
              </p>
            </>
          ) : null}
        </Dialog>
      ) : null}
    </div>
  );
}
