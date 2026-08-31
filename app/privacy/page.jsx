// Privacy policy — static bilingual page (IT primary, EN below).
// Server-rendered at build time; no client state needed.
import { DocStyle } from "../docStyles";

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
    <main style={S.page} className="cc-doc">
      <DocStyle />
      <a href="../" style={S.a}>← CareerCompass</a>

      <h1 style={S.h1}>Informativa sulla privacy</h1>
      <p style={S.small}>Ultimo aggiornamento: 13 luglio 2026 · English version below</p>

      <h2 style={S.h2}>Chi siamo</h2>
      <p>CareerCompass è uno strumento gratuito di orientamento post-diploma. Titolare del trattamento: il gestore del sito, contattabile all&apos;indirizzo indicato in fondo.</p>

      <h2 style={S.h2}>Quali dati trattiamo</h2>
      <ul>
        <li><b>Senza registrazione:</b> le tue risposte al questionario, gli interessi, i percorsi salvati e le preferenze (lingua, tema) restano <b>solo nel tuo browser</b> (localStorage). Non li riceviamo e non possiamo vederli.</li>
        <li><b>Account: al momento non esistono.</b> Non c&apos;è modo di registrarsi e non raccogliamo email. Se un giorno attiveremo l&apos;accesso, aggiorneremo questa pagina <i>prima</i> che diventi possibile usarlo.</li>
        <li><b>Niente tracciamento:</b> non usiamo cookie di profilazione né pubblicità. Non vendiamo dati.</li>
        <li><b>Niente terze parti:</b> il sito non carica caratteri, script o immagini da altri domini. Non c&apos;è nessuna richiesta a Google, a un CDN o a una rete pubblicitaria.</li>
      </ul>

      <h2 style={S.h2}>Dove sono i dati</h2>
      <p>Il sito è servito da GitHub Pages. Le uniche cose che lasciano il tuo browser sono le statistiche d&apos;uso anonime e i messaggi che ci mandi volontariamente dal riquadro di feedback: vanno a Supabase, su server nell&apos;Unione Europea (Francoforte).</p>

      <h2 style={S.h2}>Base giuridica ed età</h2>
      <p>Il legittimo interesse (art. 6.1.f GDPR) a capire dove lo strumento non funziona, con il minimo dei dati possibile: nessun identificativo persistente, nessun profilo, niente che permetta di riconoscerti a una seconda visita. Il servizio è pensato per studenti delle superiori: in Italia dai 14 anni si può prestare autonomamente il consenso digitale (d.lgs. 101/2018), ma qui non chiediamo consenso perché non trattiamo dati che ti identificano.</p>

      <h2 style={S.h2}>I tuoi diritti</h2>
      <p>I dati che restano nel browser li cancelli tu, svuotando i dati del sito dal browser: spariscono davvero, perché non ne abbiamo copia. Sulle statistiche anonime non possiamo esercitare accesso o cancellazione per una singola persona, per un motivo preciso: non sappiamo quali righe siano tue. Per qualsiasi domanda, scrivici.</p>

      <h2 style={S.h2}>Statistiche d&apos;uso</h2>
      <p>Per capire dove lo strumento confonde gli studenti registriamo passaggi anonimi (ad esempio &quot;questionario completato&quot;, &quot;corso salvato&quot;), con un identificativo casuale della sessione, la lingua e se sei da telefono o computer. Nessun cookie, nessun nome, nessuna email, nessuna delle tue risposte. L&apos;identificativo di sessione è casuale e sparisce quando chiudi la scheda: alla visita successiva non sei riconoscibile.</p>
      <p>Una precisazione che molti siti omettono: <b>non registriamo il tuo indirizzo IP</b> tra questi dati, ma i server che consegnano le pagine (GitHub) e che ricevono le statistiche (Supabase) lo vedono a livello di rete, come accade per qualsiasi sito che apri. Non lo conserviamo noi e non lo colleghiamo a quello che hai fatto sul sito.</p>

      <h2 style={S.h2}>I numeri che mostriamo</h2>
      <p>Occupazione e stipendi vengono dalle indagini sui laureati di AlmaLaurea e dal monitoraggio nazionale INDIRE per gli ITS. Dove un corso non ha un&apos;indagine propria mostriamo la mediana nazionale del suo gruppo disciplinare, dicendolo apertamente sulla scheda invece di far finta che sia un dato di quel corso. Gli stipendi netti sono indicativi. Ogni corso rimanda alla pagina ufficiale dell&apos;ateneo: verifica sempre lì prima di decidere.</p>

      <h2 style={S.h2}>Contatti</h2>
      <p>Per qualsiasi richiesta sulla privacy: <a style={S.a} href="mailto:bhati.mayank842@gmail.com">bhati.mayank842@gmail.com</a></p>

      <hr style={S.hr} />

      <h1 style={S.h1}>Privacy policy (English)</h1>
      <h2 style={S.h2}>What we process</h2>
      <ul>
        <li><b>Without an account:</b> your survey answers, interests, saved paths and preferences stay <b>in your browser only</b> (localStorage). We never receive them.</li>
        <li><b>Accounts: there aren&apos;t any.</b> There is no way to register and we collect no email addresses. If we ever enable sign-in, this page will be updated <i>before</i> it becomes usable.</li>
        <li><b>No tracking:</b> no profiling cookies, no ads, no selling of data.</li>
        <li><b>No third parties:</b> the site loads no fonts, scripts or images from other domains. Nothing here calls Google, a CDN or an ad network.</li>
      </ul>
      <h2 style={S.h2}>Where the data lives</h2>
      <p>The site is served by GitHub Pages. The only things that leave your browser are the anonymous usage steps and any message you deliberately send from the feedback box; those go to Supabase, on EU servers in Frankfurt.</p>
      <h2 style={S.h2}>Legal basis and age</h2>
      <p>Legitimate interest (GDPR art. 6.1.f) in learning where the tool fails students, on the smallest amount of data that answers the question: no persistent identifier, no profile, nothing that would recognise you on a second visit. The service is aimed at high-school students; in Italy the digital age of consent is 14, but we ask for no consent here because we process nothing that identifies you.</p>
      <h2 style={S.h2}>Your rights</h2>
      <p>Data kept in your browser is deleted by you, by clearing site data — and it is genuinely gone, because we hold no copy. For the anonymous statistics we cannot action an access or deletion request for one person, for a specific reason: we have no way of telling which rows are yours. Write to us with any question.</p>
      <h2 style={S.h2}>Usage statistics</h2>
      <p>To see where the tool confuses students we record anonymous steps (for example &quot;survey completed&quot;, &quot;course saved&quot;) with a random session identifier, the language, and whether you are on a phone or a computer. No cookies, no name, no email, none of your answers. The session identifier is random and disappears when you close the tab, so a later visit is not recognisable as you.</p>
      <p>One point most sites leave out: <b>we do not record your IP address</b> in that data, but the servers that deliver the pages (GitHub) and receive the statistics (Supabase) do see it at the network level, as happens with any site you open. We do not keep it and do not connect it to what you did here.</p>

      <h2 style={S.h2}>About the numbers</h2>
      <p>Employment and pay come from AlmaLaurea graduate surveys and, for ITS courses, the national INDIRE monitoring. Where a course has no survey of its own we show the national median for its disciplinary group and say so on the card, rather than passing it off as that course&apos;s own figure. Net salaries are indicative. Every course links to the institution&apos;s official page — always check there before deciding.</p>
      <h2 style={S.h2}>Contact</h2>
      <p><a style={S.a} href="mailto:bhati.mayank842@gmail.com">bhati.mayank842@gmail.com</a></p>
    </main>
  );
}
