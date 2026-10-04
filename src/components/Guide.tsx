import { ExternalLink, TriangleAlert } from "lucide-react";
import { DISCLAIMER } from "../constants";
export default function Guide() {
  return (
    <div className="guide">
      <div className="page-heading">
        <span className="eyebrow">KNOW YOUR ESTIMATE</span>
        <h1>
          A little clarity.
          <br />A lot of caution.
        </h1>
      </div>
      <section className="panel">
        <h2>One standard drink ≠ one serving</h2>
        <p>
          In Australia, one standard drink contains 10 grams of pure alcohol. A
          375 mL beer at 4.8% is about 1.4 standard drinks; 150 mL wine at 13%
          is about 1.5. Check the package label. Cocktails and generous pours
          can contain much more.
        </p>
        <p>Calculation: volume in mL × ABV / 100 × 0.789 / 10.</p>
        <a
          className="text-link"
          href="https://www.health.gov.au/topics/alcohol/about-alcohol/standard-drinks-guide"
          target="_blank"
          rel="noreferrer"
        >
          Australian Government standard drinks guide <ExternalLink size={14} />
        </a>
      </section>
      <section className="panel">
        <h2>How the estimate works</h2>
        <p>
          A Widmark-based model distributes 10 g of alcohol per standard drink
          across body weight and an approximate body-water factor (0.68 or
          0.55). Height and age are recorded but do not change the calculation.
        </p>
        <p>
          The centre estimate assumes 15 minutes of delay, absorption over 60
          minutes, and elimination of 0.015 percentage points per hour. Each
          timestamp is modelled separately. Elimination never makes BAC
          negative.
        </p>
        <p>
          The displayed range explores slower and faster elimination
          (0.010–0.020 per hour), body-water factors ±15%, drink amounts ±20%,
          and absorption from 30–120 minutes with up to 30 minutes of delay. It
          is an illustrative uncertainty range, not a clinical confidence
          interval. Your actual BAC can fall outside it.
        </p>
        <p>
          The conservative waiting estimate uses the latest modelled zero across
          those scenarios, plus at least 90 minutes. Times round upwards to 15
          minutes. Near zero means below 0.001% in the centre model; it cannot
          confirm zero BAC.
        </p>
        <a
          className="text-link"
          href="https://pubmed.ncbi.nlm.nih.gov/25868887/"
          target="_blank"
          rel="noreferrer"
        >
          Widmark model & absorption research <ExternalLink size={14} />
        </a>
        <a
          className="text-link"
          href="https://pubmed.ncbi.nlm.nih.gov/20304569/"
          target="_blank"
          rel="noreferrer"
        >
          Alcohol elimination review <ExternalLink size={14} />
        </a>
      </section>
      <section className="panel">
        <h2>What the numbers cannot tell you</h2>
        <ul>
          <li>
            BAC can keep rising after the last drink. Food can delay absorption.
          </li>
          <li>
            Metabolism varies substantially. Body composition, medications and
            health conditions affect alcohol response.
          </li>
          <li>Drink measurements and remembered times may be inaccurate.</li>
          <li>
            Coffee, food, water, exercise, showers and brief sleep do not
            rapidly remove alcohol. They never shorten this estimate.
          </li>
          <li>
            Feeling sober does not mean BAC is zero. Fatigue can also impair
            driving.
          </li>
        </ul>
        <p>
          A reliable breathalyser or alcohol test is the appropriate way to
          obtain a current reading. An estimate or completed countdown cannot
          confirm sobriety or permission to drive.
        </p>
      </section>
      <section className="panel">
        <h2>Your privacy</h2>
        <p>
          Your drinking history stays on this device in this browser. No
          account, analytics, cloud backup or personal-data server.
          Shared-device users may access this history. Clearing browser data can
          erase it. Use “Delete all data” to remove saved personal details and
          sessions.
        </p>
      </section>
      <section className="panel">
        <h2>Estimate limitations</h2>
        <p>{DISCLAIMER}</p>
      </section>
      <details className="panel emergency">
        <summary>
          <TriangleAlert size={19} />
          When to get medical help
        </summary>
        <p>
          If someone is difficult to wake, unconscious, vomiting repeatedly,
          having difficulty breathing, confused or having a seizure, seek
          emergency medical assistance. In Australia, call{" "}
          <a href="tel:000">000</a> and ask for an ambulance. Stay with them and
          follow the operator’s instructions.
        </p>
        <a
          className="text-link"
          href="https://www.healthdirect.gov.au/swallowed-substances"
          target="_blank"
          rel="noreferrer"
        >
          Healthdirect poisoning advice <ExternalLink size={14} />
        </a>
      </details>
    </div>
  );
}
