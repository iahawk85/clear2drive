import {
  cloneElement,
  isValidElement,
  useId,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  Clock3,
  ExternalLink,
  Minus,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  standardDrinks,
  validate,
  HOUR,
  type Person,
  type Session,
} from "../engine";
import {
  jurisdictions,
  licences,
  ruleLinks,
  suggestedThreshold,
  type Jurisdiction,
  type Licence,
} from "../legal";
import type { Settings } from "../storage";
import { localInput, parseLocal } from "../time";
import { DISCLAIMER } from "../constants";
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      aria-labelledby="dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const control =
    isValidElement(children) &&
    (children.type === "input" || children.type === "select")
      ? cloneElement(
          children as ReactElement<{
            "aria-labelledby"?: string;
            "aria-describedby"?: string;
          }>,
          {
            "aria-labelledby": id,
            "aria-describedby": hint ? id + "-hint" : undefined,
          },
        )
      : children;
  return (
    <div className="field">
      <span id={id}>{label}</span>
      {control}
      {hint ? <small id={id + "-hint"}>{hint}</small> : null}
    </div>
  );
}
export function SettingsForm({
  initial,
  onSave,
}: {
  initial: Settings | null;
  onSave: (settings: Settings) => void;
}) {
  const [weight, setWeight] = useState(initial?.person.weight.toString() ?? "");
  const [height, setHeight] = useState(initial?.person.height.toString() ?? "");
  const [age, setAge] = useState(initial?.person.age?.toString() ?? "");
  const [composition, setComposition] = useState<Person["composition"]>(
    initial?.person.composition ?? "uncertain",
  );
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>(
    initial?.jurisdiction ?? "NSW",
  );
  const [licence, setLicence] = useState<Licence>(initial?.licence ?? "unsure");
  const [threshold, setThreshold] = useState(initial?.threshold ?? 0);
  const [margin, setMargin] = useState(initial?.margin ?? 90);
  const [accepted, setAccepted] = useState(initial?.accepted ?? false);
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const person = {
        weight: Number(weight),
        height: Number(height),
        age: age ? Number(age) : undefined,
        composition,
      };
      validate(person, [], Date.now());
      if (!accepted)
        throw new Error(
          "Please read and acknowledge the estimate limitations.",
        );
      onSave({ person, jurisdiction, licence, threshold, margin, accepted });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form onSubmit={submit}>
      <p className="muted">
        A few details for a more useful estimate. No account. No uploads.
      </p>
      <div className="field-grid">
        <Field label="Weight · kg">
          <input
            required
            type="number"
            min="30"
            max="300"
            step="0.1"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Field>
        <Field
          label="Height · cm"
          hint="Recorded only; not used in this model."
        >
          <input
            required
            type="number"
            min="100"
            max="250"
            inputMode="decimal"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </Field>
      </div>
      <Field
        label="Body-composition calculation"
        hint="Alcohol distributes through body water. These broad biological averages do not describe everyone or gender identity."
      >
        <select
          value={composition}
          onChange={(e) =>
            setComposition(e.target.value as Person["composition"])
          }
        >
          <option value="uncertain">
            Unsure · use lower distribution factor
          </option>
          <option value="higher">
            Typically male body-water average · 0.68
          </option>
          <option value="lower">
            Typically female body-water average · 0.55
          </option>
        </select>
      </Field>
      <Field
        label="Age · optional"
        hint="For adults 18+. Age is not used in this model."
      >
        <input
          type="number"
          min="18"
          max="110"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
      </Field>
      <div className="form-divider">YOUR DRIVING PROFILE</div>
      <div className="field-grid">
        <Field label="State / territory">
          <select
            value={jurisdiction}
            onChange={(e) => {
              const j = e.target.value as Jurisdiction;
              setJurisdiction(j);
              setThreshold(suggestedThreshold(j, licence));
            }}
          >
            {jurisdictions.map((j) => (
              <option key={j}>{j}</option>
            ))}
          </select>
        </Field>
        <Field label="Licence">
          <select
            value={licence}
            onChange={(e) => {
              const l = e.target.value as Licence;
              setLicence(l);
              setThreshold(suggestedThreshold(jurisdiction, l));
            }}
          >
            {Object.entries(licences).map(([key, name]) => (
              <option value={key} key={key}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field
        label="BAC threshold · %"
        hint={
          jurisdiction === "NSW"
            ? "NSW: full licence under 0.05; L/P zero; specified professional vehicles under 0.02. Select the threshold for your exact circumstances."
            : "Outside NSW: defaults to zero as a precaution. Check local rules, then select your applicable threshold."
        }
      >
        <select
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          disabled={
            licence === "learner" ||
            licence === "provisional" ||
            licence === "unsure"
          }
        >
          <option value="0">0.00 · zero BAC / unsure</option>
          <option value="0.02">Under 0.02</option>
          <option value="0.05">Under 0.05</option>
        </select>
      </Field>
      <a
        className="text-link"
        href={ruleLinks[jurisdiction]}
        target="_blank"
        rel="noreferrer"
      >
        Check the rules for your licence and location <ExternalLink size={14} />
      </a>
      <Field label="Additional waiting buffer">
        <select
          value={margin}
          onChange={(e) => setMargin(Number(e.target.value))}
        >
          <option value="90">90 minutes · default</option>
          <option value="120">2 hours</option>
          <option value="180">3 hours</option>
        </select>
      </Field>
      <div className="disclaimer">
        <ShieldCheck size={20} />
        <p>{DISCLAIMER}</p>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        I understand this is an estimate, not a BAC measurement.
      </label>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="primary full" type="submit">
        {initial ? "Save profile" : "Start estimating"}
        <ArrowRight size={18} />
      </button>
    </form>
  );
}
const presets = [
  { name: "Beer", volume: 375, abv: 4.8 },
  { name: "Wine", volume: 150, abv: 13 },
  { name: "Spirits", volume: 30, abv: 40 },
  { name: "RTD", volume: 375, abv: 5 },
  { name: "Cocktail", volume: 200, abv: 15 },
  { name: "Custom", volume: 0, abv: 0 },
];
export function DrinkForm({
  start,
  onAdd,
}: {
  start: number;
  onAdd: (amount: number, time: number, label: string) => void;
}) {
  const [formNow] = useState(() => Date.now());
  const [mode, setMode] = useState<"standard" | "beverage">("standard");
  const [amount, setAmount] = useState("1.0");
  const [time, setTime] = useState(() => localInput(formNow));
  const [volume, setVolume] = useState("375");
  const [abv, setAbv] = useState("4.8");
  const [beverage, setBeverage] = useState("Beer");
  const [error, setError] = useState("");
  let calculated = 0;
  try {
    calculated = standardDrinks(Number(volume), Number(abv));
  } catch {
    /* Inline validation on submission. */
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const t = time === localInput(formNow) ? Date.now() : parseLocal(time);
      if (t < start)
        throw new Error(
          "Drink time cannot be before the session start. Edit the start time first.",
        );
      onAdd(
        mode === "standard" ? Number(amount) : Math.round(calculated * 10) / 10,
        t,
        mode === "standard" ? "Standard drinks" : beverage,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="segmented">
        <button
          type="button"
          className={mode === "standard" ? "selected" : ""}
          onClick={() => setMode("standard")}
        >
          Standard drinks
        </button>
        <button
          type="button"
          className={mode === "beverage" ? "selected" : ""}
          onClick={() => setMode("beverage")}
        >
          Volume + ABV
        </button>
      </div>
      {mode === "standard" ? (
        <>
          <Field label="Australian standard drinks">
            <div className="stepper">
              <button
                type="button"
                aria-label="Decrease standard drinks"
                onClick={() =>
                  setAmount(Math.max(0.1, Number(amount) - 0.1).toFixed(1))
                }
              >
                <Minus />
              </button>
              <input
                aria-label="Australian standard drinks"
                type="number"
                required
                min="0.1"
                max="30"
                step="0.1"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                type="button"
                aria-label="Increase standard drinks"
                onClick={() =>
                  setAmount(Math.min(30, Number(amount) + 0.1).toFixed(1))
                }
              >
                <Plus />
              </button>
            </div>
          </Field>
          <div className="quick-add">
            {[1, 1.5, 2].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setAmount(String(n))}
              >
                {n.toFixed(1)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="preset-grid">
            {presets.map((p) => (
              <button
                type="button"
                className={beverage === p.name ? "selected" : ""}
                key={p.name}
                onClick={() => {
                  setBeverage(p.name);
                  setVolume(p.volume ? String(p.volume) : "");
                  setAbv(p.abv ? String(p.abv) : "");
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
          <p className="small muted">
            Example servings only. Check the label or recipe, and adjust both
            values.
          </p>
          <div className="field-grid">
            <Field label="Volume · mL">
              <input
                required
                type="number"
                min="1"
                max="5000"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
              />
            </Field>
            <Field label="ABV · %">
              <input
                required
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={abv}
                onChange={(e) => setAbv(e.target.value)}
              />
            </Field>
          </div>
          <div className="conversion">
            ~{calculated.toFixed(1)} <span>standard drinks</span>
          </div>
        </>
      )}
      <Field
        label="When did you have it?"
        hint="Local time, with date to handle sessions crossing midnight."
      >
        <input
          required
          type="datetime-local"
          min={localInput(start)}
          max={localInput(formNow)}
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </Field>
      <button
        className="text-link"
        type="button"
        onClick={() => setTime(localInput(Date.now()))}
      >
        <Clock3 size={14} /> Use current time
      </button>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      <p className="small muted">
        BAC can continue rising after your last drink.
      </p>
      <button type="submit" className="primary full">
        <Plus size={19} />
        Add drink & update estimate
      </button>
    </form>
  );
}
export function SessionForm({
  mode,
  session,
  onSave,
}: {
  mode: "morning" | "start" | "total";
  session: Session | null;
  onSave: (start: number, last: number, total: number) => void;
}) {
  const [now] = useState(() => Date.now());
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(19, 0, 0, 0);
  const [start, setStart] = useState(
    localInput(
      session?.start ?? (mode === "morning" ? yesterday.getTime() : now),
    ),
  );
  const [last, setLast] = useState(
    localInput(
      session?.drinks.length
        ? Math.max(...session.drinks.map((d) => d.time))
        : Math.max(session?.start ?? 0, now - HOUR),
    ),
  );
  const [total, setTotal] = useState(
    session?.drinks.reduce((sum, d) => sum + d.standardDrinks, 0).toFixed(1) ??
      "",
  );
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const s = parseLocal(start),
            l = mode === "start" ? s : parseLocal(last);
          if (s > now || l > now || s < now - 7 * 24 * HOUR || l < s)
            throw new Error(
              "Use times in the past seven days; last drink must be after the start.",
            );
          onSave(s, l, Number(total));
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      {mode === "morning" ? (
        <p className="muted">
          Alcohol can remain the next morning. Approximate drinks are spread
          evenly between these times; actual timing may differ.
        </p>
      ) : mode === "total" ? (
        <p className="muted">
          Editing the total replaces individual entries with an approximate,
          evenly spread session. For better timing, add drinks individually.
        </p>
      ) : null}
      <Field label="When did you start drinking?">
        <input
          required
          type="datetime-local"
          max={localInput(now)}
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </Field>
      {mode !== "start" ? (
        <>
          <Field label="Last drink">
            <input
              required
              type="datetime-local"
              max={localInput(now)}
              value={last}
              onChange={(e) => setLast(e.target.value)}
            />
          </Field>
          <Field label="Total standard drinks">
            <input
              required
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </Field>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      <button className="primary full" type="submit">
        {mode === "start" ? "Save start time" : "Calculate session"}
        <ArrowRight size={18} />
      </button>
    </form>
  );
}
