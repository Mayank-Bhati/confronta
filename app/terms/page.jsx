// Terms of use — static bilingual page (IT primary, EN below).
export const metadata = { title: "Termini — CareerCompass" };

const S = {
  page: { maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px", fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.65, color: "#14192E" },
  h1: { fontFamily: "Fraunces, Georgia, serif", fontSize: 34, fontWeight: 800, marginBottom: 6 },
  h2: { fontFamily: "Fraunces, Georgia, serif", fontSize: 22, fontWeight: 700, marginTop: 34, marginBottom: 8 },
  small: { color: "#5A6072", fontSize: 14 },
  hr: { border: 0, borderTop: "1px solid #E3E6EF", margin: "40px 0" },
  a: { color: "#2244BB" },
};

export default function Terms() {
  return (
    <main style={S.page}>
      <a href="../" style={S.a}>← CareerCompass</a>

      <h1 style={S.h1}>Termini di utilizzo</h1>
      <p style={S.small}>Ultimo aggiornamento: 13 luglio 2026 · English version below</p>

      <h2 style={S.h2}>Cos&apos;è CareerCompass</h2>
      <p>Uno strumento gratuito di orientamento: ti aiuta a esplorare carriere e percorsi di studio in Italia in base ai tuoi interessi. Non è un test psicometrico né una consulenza professionale.</p>

      <h2 style={S.h2}>Uso delle informazioni</h2>
      <ul>
        <li>Statistiche, costi e requisiti di ammissione sono <b>stime informative</b> basate su fonti pubbliche (AlmaLaurea, INDIRE, Universitaly, pagine ufficiali degli atenei, linkate su ogni corso). Possono cambiare: bandi, tasse e posti si verificano <b>solo</b> sulle pagine ufficiali.</li>
        <li>Le decisioni su iscrizioni e test di ammissione restano tue: il sito non garantisce ammissioni, esiti occupazionali o retribuzioni.</li>
      </ul>

      <h2 style={S.h2}>Account</h2>
      <p>L&apos;accesso via email è facoltativo e gratuito. Puoi eliminare l&apos;account e i dati in ogni momento (vedi <a style={S.a} href="../privacy/">privacy</a>). Età minima per l&apos;account: 14 anni.</p>

      <h2 style={S.h2}>Limitazione di responsabilità</h2>
      <p>Il servizio è fornito &quot;così com&apos;è&quot;, senza garanzie di completezza o disponibilità. Nei limiti di legge, non rispondiamo di decisioni prese sulla base delle informazioni mostrate.</p>

      <h2 style={S.h2}>Contatti</h2>
      <p><a style={S.a} href="mailto:bhati.mayank842@gmail.com">bhati.mayank842@gmail.com</a></p>

      <hr style={S.hr} />

      <h1 style={S.h1}>Terms of use (English)</h1>
      <p>CareerCompass is a free orientation tool for exploring careers and study paths in Italy. It is not psychometric testing or professional advice. All statistics, costs and admission requirements are informative estimates from public sources (AlmaLaurea, INDIRE, Universitaly, official university pages — linked on each course); always verify on the official pages before deciding. Optional email sign-in, minimum age 14; delete your account and data anytime (see <a style={S.a} href="../privacy/">privacy</a>). The service is provided &quot;as is&quot;, without warranties; to the extent permitted by law we are not liable for decisions based on the information shown.</p>
    </main>
  );
}
