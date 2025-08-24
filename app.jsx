/* global React, ReactDOM */

const months = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" }
];

function generateYears(start = 1920) {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current; y >= start; y -= 1) years.push(y);
  return years;
}

function generateDays() {
  return Array.from({ length: 31 }, (_, i) => i + 1);
}

function computeLifePathNumber({ day, month, year }) {
  const digits = `${day}${month}${year}`.replace(/[^0-9]/g, "");
  const reduce = (n) => {
    // Réduction numérique: somme des chiffres jusqu'à 1 chiffre (conserver 11, 22)
    while (n > 22 || (n > 9 && n !== 11 && n !== 22)) {
      n = String(n).split("").reduce((sum, d) => sum + Number(d), 0);
    }
    return n;
  };
  const total = digits.split("").reduce((sum, d) => sum + Number(d), 0);
  return reduce(total);
}

function isValidDate(y, m, d) {
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === Number(y) &&
    date.getMonth() === Number(m) - 1 &&
    date.getDate() === Number(d)
  );
}

function App() {
  const [prenom, setPrenom] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [day, setDay] = React.useState("");
  const [monthValue, setMonthValue] = React.useState("");
  const [year, setYear] = React.useState("");
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const years = React.useMemo(() => generateYears(1917), []);
  const days = React.useMemo(() => generateDays(), []);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!prenom.trim()) {
      setError("Veuillez entrer votre prénom.");
      return;
    }
    const emailOk = /.+@.+\..+/.test(email.trim());
    if (!emailOk) {
      setError("Veuillez entrer un email valide.");
      return;
    }
    if (!day || !monthValue || !year) {
      setError("Veuillez compléter votre date de naissance.");
      return;
    }
    if (!isValidDate(year, monthValue, day)) {
      setError("La date saisie n'est pas valide.");
      return;
    }

    setLoading(true);
    // Calcul local simple (ex: Chemin de vie)
    const lifePath = computeLifePathNumber({ day, month: monthValue, year });

    // Point d'accroche Systeme.io (webhook/automation)
    // Remplacer NEXT_URL par l'URL webhook Systeme.io quand elle sera connue.
    const payload = {
      firstName: prenom.trim(),
      email: email.trim(),
      birthDate: `${year}-${String(monthValue).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      lifePathNumber: lifePath
    };

    // Envoi webhook Make si présent, sinon API backend Systeme.io, sinon action de formulaire Systeme.io
    const rootEl = document.getElementById("root");
    const webhookUrl = rootEl?.getAttribute("data-webhook") || "";
    const systemeAction = rootEl?.getAttribute("data-systeme-action") || "";
    const systemeApi = rootEl?.getAttribute("data-systeme-api") || "";
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(async (res) => {
          const text = await res.text().catch(() => "");
          setResult({
            message: `Merci ${prenom}! Voici votre nombre de chemin de vie: ${lifePath}.`,
            payload,
            response: text.slice(0, 500)
          });
        })
        .catch((err) => {
          setResult({
            message: `Merci ${prenom}! (Envoi webhook non abouti)`,
            payload,
            error: String(err)
          });
        })
        .finally(() => setLoading(false));
    } else if (systemeApi) {
      fetch(systemeApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(async (res) => {
          const text = await res.text().catch(() => "");
          setResult({
            message: `Merci ${prenom}! Contact envoyé via API Systeme.io. Chemin de vie: ${lifePath}.`,
            payload,
            response: text.slice(0, 500)
          });
        })
        .catch((err) => {
          setResult({
            message: `Merci ${prenom}! (API Systeme.io non aboutie)`,
            payload,
            error: String(err)
          });
        })
        .finally(() => setLoading(false));
    } else if (systemeAction) {
      // Envoi direct vers un formulaire Systeme.io (action HTML)
      const formData = new FormData();
      // Adapte les names selon l'intégration Systeme.io (souvent: email, first_name, custom_fields[slug])
      formData.append("email", payload.email);
      formData.append("first_name", payload.firstName);
      formData.append("custom_fields[date_de_naissance]", payload.birthDate);
      formData.append("custom_fields[life_path_number]", String(payload.lifePathNumber));

      fetch(systemeAction, { method: "POST", body: formData })
        .then(async (res) => {
          const text = await res.text().catch(() => "");
          setResult({
            message: `Merci ${prenom}! Contact envoyé à Systeme.io. Nombre de chemin de vie: ${lifePath}.`,
            payload,
            response: text.slice(0, 500)
          });
        })
        .catch((err) => {
          setResult({
            message: `Merci ${prenom}! (Envoi Systeme.io non abouti)`,
            payload,
            error: String(err)
          });
        })
        .finally(() => setLoading(false));
    } else {
      // Fallback: pas d’URL -> affichage local uniquement
      setTimeout(() => {
        setResult({
          message: `Merci ${prenom}! Voici votre nombre de chemin de vie: ${lifePath}.`,
          payload
        });
        setLoading(false);
      }, 250);
    }
  }

  return (
    <div className="container">
      <section className="hero">
        <h1>Décodage de personnalité</h1>
        <p>Entrez votre prénom et votre date de naissance pour commencer.</p>
      </section>

      <section className="card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="row">
            <label htmlFor="prenom">Prénom</label>
            <input id="prenom" name="prenom" placeholder="Votre prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" />
          </div>

          <div className="row">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>

          <div className="row">
            <label>Date de naissance</label>
            <div className="row inline">
              <select value={monthValue} onChange={(e) => setMonthValue(Number(e.target.value) || "")}
                aria-label="Mois">
                <option value="">Mois</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select value={day} onChange={(e) => setDay(Number(e.target.value) || "")} aria-label="Jour">
                <option value="">Jour</option>
                {days.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select value={year} onChange={(e) => setYear(Number(e.target.value) || "")} aria-label="Année">
                <option value="">Année</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="hint">Votre date de naissance permettra un calcul plus précis.</div>
          </div>

          {error ? <div className="error" role="alert">{error}</div> : null}

          <button type="submit" disabled={loading}>{loading ? "Calcul..." : "Explorer mon thème"}</button>
        </form>

        {result && (
          <div className="results">
            <div className="success">{result.message}</div>
            <pre style={{ whiteSpace: "pre-wrap", background: "#f1f5f9", padding: 12, borderRadius: 8, overflowX: "auto" }}>
              {JSON.stringify(result.payload, null, 2)}
            </pre>
          </div>
        )}
      </section>

    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);


