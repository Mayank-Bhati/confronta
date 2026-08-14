// Privacy policy — static bilingual page (IT primary, EN below).
// Server-rendered at build time; no client state needed.
export const metadata = { title: "Privacy — CareerCompass" };

const S = {
  page: { maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px", fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.65, color: "#14192E" },
  h1: { fontFamily: "Fraunces, Georgia, serif", fontSize: 34, fontWeight: 800, marginBottom: 6 },
  h2: { fontFamily: "Fraunces, Georgia, serif", fontSize: 22, fontWeight: 700, marginTop: 34, marginBottom: 8 },
  small: { color: "#5A6072", fontSize: 14 },
  hr: { border: 0, borderTop: "1px solid #E3E6EF", margin: "40px 0" },
  a: { color: "#2244BB" },
};

export default function Privacy() {
  return (
    <main style={S.page}>
      <a href="../" style={S.a}>← CareerCompass</a>

      <h1 style={S.h1}>Informativa sulla privacy</h1>
      <p style={S.small}>Ultimo aggiornamento: 13 luglio 2026 · English version below</p>

      <h2 style={S.h2}>Chi siamo</h2>
      <p>CareerCompass è uno strumento gratuito di orientamento post-diploma. Titolare del trattamento: il gestore del sito, contattabile all&apos;indirizzo indicato in fondo.</p>

      <h2 style={S.h2}>Quali dati trattiamo</h2>
      <ul>
        <li><b>Senza registrazione:</b> le tue risposte al questionario, gli interessi, i percorsi salvati e le preferenze (lingua, tema) restano <b>solo nel tuo browser</b> (localStorage). Non li riceviamo e non possiamo vederli.</li>
        <li><b>Con accesso (facoltativo):</b> se accedi con la tua email, salviamo email, risultati del questionario e percorsi salvati per sincronizzarli tra dispositivi.</li>
        <li><b>Niente tracciamento:</b> non usiamo cookie di profilazione né pubblicità. Non vendiamo dati.</li>
      </ul>

      <h2 style={S.h2}>Dove sono i dati</h2>
      <p>I dati degli account sono conservati su Supabase (server nell&apos;Unione Europea, Francoforte). Il sito è servito da GitHub Pages.</p>

      <h2 style={S.h2}>Base giuridica ed età</h2>
      <p>Il trattamento si basa sul tuo consenso (art. 6.1.a GDPR), che presti creando l&apos;account. Il servizio è pensato per studenti delle superiori: in Italia puoi prestare il consenso digitale autonomamente dai 14 anni (d.lgs. 101/2018).</p>

      <h2 style={S.h2}>I tuoi diritti</h2>
      <p>Puoi chiedere accesso, rettifica o cancellazione dei tuoi dati in ogni momento scrivendoci; la cancellazione dell&apos;account elimina email, risultati e salvataggi. I dati solo-browser si eliminano cancellando i dati del sito dal browser.</p>

      <h2 style={S.h2}>Statistiche d&apos;uso</h2>
      <p>Per capire dove lo strumento confonde gli studenti registriamo passaggi anonimi (ad esempio &quot;questionario completato&quot;, &quot;corso salvato&quot;), con un identificativo casuale della sessione, la lingua e se sei da telefono o computer. <b>Nessun cookie, nessun dato personale, nessun indirizzo IP</b>, e non è possibile risalire a una persona. Questi dati servono solo a migliorare il sito.</p>

      <h2 style={S.h2}>I numeri che mostriamo</h2>
      <p>Occupazione, stipendi e statistiche sono stime ancorate a fonti pubbliche (AlmaLaurea 2025, INDIRE 2025) e alle pagine ufficiali degli atenei, linkate su ogni corso. Verifica sempre sulla pagina ufficiale prima di decidere.</p>

      <h2 style={S.h2}>Contatti</h2>
      <p>Per qualsiasi richiesta sulla privacy: <a style={S.a} href="mailto:bhati.mayank842@gmail.com">bhati.mayank842@gmail.com</a></p>

      <hr style={S.hr} />

      <h1 style={S.h1}>Privacy policy (English)</h1>
      <h2 style={S.h2}>What we process</h2>
      <ul>
        <li><b>Without an account:</b> your survey answers, interests, saved paths and preferences stay <b>in your browser only</b> (localStorage). We never receive them.</li>
        <li><b>With an optional sign-in:</b> we store your email, survey results and saved paths to sync them across devices.</li>
        <li><b>No tracking:</b> no profiling cookies, no ads, no selling of data.</li>
      </ul>
      <h2 style={S.h2}>Where the data lives</h2>
      <p>Account data is stored on Supabase (EU servers, Frankfurt). The site is served by GitHub Pages.</p>
      <h2 style={S.h2}>Legal basis and age</h2>
      <p>Processing is based on your consent (GDPR art. 6.1.a), given when you create an account. In Italy the digital age of consent is 14.</p>
      <h2 style={S.h2}>Your rights</h2>
      <p>Ask for access, correction or deletion anytime — deleting your account removes your email, results and saves. Browser-only data is removed by clearing site data.</p>
      <h2 style={S.h2}>Usage statistics</h2>
      <p>To see where the tool confuses students we record anonymous steps (for example &quot;survey completed&quot;, &quot;course saved&quot;) with a random session identifier, the language, and whether you are on a phone or a computer. <b>No cookies, no personal data, no IP addresses</b>, and no way to trace it back to a person. It is used only to improve the site.</p>

      <h2 style={S.h2}>About the numbers</h2>
      <p>Employment, salary and statistics are estimates anchored to public sources (AlmaLaurea 2025, INDIRE 2025) and official university pages, linked on every course. Always verify on the official page.</p>
      <h2 style={S.h2}>Contact</h2>
      <p><a style={S.a} href="mailto:bhati.mayank842@gmail.com">bhati.mayank842@gmail.com</a></p>
    </main>
  );
}
