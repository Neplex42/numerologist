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
    console.log("🚀 Formulaire soumis");
    setError("");
    setResult(null);

    console.log("📝 Validation des champs...");
    if (!prenom.trim()) {
      console.log("❌ Prénom manquant");
      setError("Veuillez entrer votre prénom.");
      return;
    }
    const emailOk = /.+@.+\..+/.test(email.trim());
    if (!emailOk) {
      console.log("❌ Email invalide:", email);
      setError("Veuillez entrer un email valide.");
      return;
    }
    if (!day || !monthValue || !year) {
      console.log("❌ Date incomplète:", { day, monthValue, year });
      setError("Veuillez compléter votre date de naissance.");
      return;
    }
    if (!isValidDate(year, monthValue, day)) {
      console.log("❌ Date invalide:", { day, monthValue, year });
      setError("La date saisie n'est pas valide.");
      return;
    }

    console.log("✅ Validation OK");
    setLoading(true);
    
    // Calcul local simple (ex: Chemin de vie)
    const lifePath = computeLifePathNumber({ day, month: monthValue, year });
    console.log("🔢 Chemin de vie calculé:", lifePath);

    const payload = {
      firstName: prenom.trim(),
      email: email.trim(),
      birthDate: `${year}-${String(monthValue).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      lifePathNumber: lifePath
    };
    console.log("📦 Payload préparé:", payload);

    // Détection des endpoints configurés
    const rootEl = document.getElementById("root");
    const webhookUrl = rootEl?.getAttribute("data-webhook") || "";
    const systemeAction = rootEl?.getAttribute("data-systeme-action") || "";
    const systemeApi = rootEl?.getAttribute("data-systeme-api") || "";
    
    console.log("🔍 Configuration détectée:");
    console.log("  - webhookUrl:", webhookUrl || "(vide)");
    console.log("  - systemeAction:", systemeAction || "(vide)");
    console.log("  - systemeApi:", systemeApi || "(vide)");

    if (webhookUrl) {
      console.log("📡 Envoi vers webhook Make...");
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(async (res) => {
          console.log("📡 Réponse webhook:", res.status, res.statusText);
          const text = await res.text().catch(() => "");
          console.log("📡 Contenu réponse:", text.slice(0, 200));
          setResult({
            message: `Merci ${prenom}! Votre nombre de chemin de vie: ${lifePath}.`,
            payload,
            response: text.slice(0, 500)
          });
        })
        .catch((err) => {
          console.error("❌ Erreur webhook:", err);
          setResult({
            message: `Merci ${prenom}! (Envoi webhook non abouti)`,
            payload,
            error: String(err)
          });
        })
        .finally(() => {
          console.log("📡 Webhook terminé");
          setLoading(false);
        });
    } else if (systemeApi) {
      console.log("🔌 Envoi vers API Systeme.io...");
      fetch(systemeApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(async (res) => {
          console.log("🔌 Réponse API:", res.status, res.statusText);
          const text = await res.text().catch(() => "");
          console.log("🔌 Contenu réponse:", text.slice(0, 200));
          setResult({
            message: `Merci ${prenom}! Contact envoyé via API Systeme.io. Chemin de vie: ${lifePath}.`,
            payload,
            response: text.slice(0, 500)
          });
        })
        .catch((err) => {
          console.error("❌ Erreur API Systeme.io:", err);
          setResult({
            message: `Merci ${prenom}! (API Systeme.io non aboutie)`,
            payload,
            error: String(err)
          });
        })
        .finally(() => {
          console.log("🔌 API Systeme.io terminée");
          setLoading(false);
        });
    } else if (systemeAction) {
      console.log("📋 Envoi vers formulaire Systeme.io...");
      const formData = new FormData();
      formData.append("email", payload.email);
      formData.append("first_name", payload.firstName);
      formData.append("custom_fields[date_de_naissance]", payload.birthDate);
      formData.append("custom_fields[life_path_number]", String(payload.lifePathNumber));
      console.log("📋 FormData préparé");

      fetch(systemeAction, { method: "POST", body: formData })
        .then(async (res) => {
          console.log("📋 Réponse formulaire:", res.status, res.statusText);
          const text = await res.text().catch(() => "");
          console.log("📋 Contenu réponse:", text.slice(0, 200));
          setResult({
            message: `Merci ${prenom}! Contact envoyé à Systeme.io. Nombre de chemin de vie: ${lifePath}.`,
            payload,
            response: text.slice(0, 500)
          });
        })
        .catch((err) => {
          console.error("❌ Erreur formulaire Systeme.io:", err);
          setResult({
            message: `Merci ${prenom}! (Envoi Systeme.io non abouti)`,
            payload,
            error: String(err)
          });
        })
        .finally(() => {
          console.log("📋 Formulaire Systeme.io terminé");
          setLoading(false);
        });
    } else {
      console.log("💻 Mode local uniquement (aucun endpoint configuré)");
      setTimeout(() => {
        setResult({
          message: `Merci ${prenom}! Voici votre nombre de chemin de vie: ${lifePath}.`,
          payload
        });
        setLoading(false);
        console.log("💻 Affichage local terminé");
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


