// Data and sources — the public register of where every figure comes from.
//
// The classification vocabulary here is the same one lib/provenance.js returns
// and the cards display; the counts are computed from the live catalogue at
// build time rather than typed in, so this page cannot quietly fall out of step
// with the data it describes. If a figure disappears from the catalogue, the
// number on this page moves with it.
import { S, CONTACT, DocStyle } from "../docStyles";
import { VERIFIED } from "../../lib/provenance";
import COURSES from "../../data/courses-v2.json";

export const metadata = { title: "Dati e fonti — CareerCompass" };

// Computed at build time from the catalogue itself.
const N = COURSES.length;
const status = COURSES.reduce((m, c) => {
  const s = c.outcomes?.status || "unknown";
  m[s] = (m[s] || 0) + 1;
  return m;
}, {});
const withFigure = COURSES.filter((c) => {
  const o = c.outcomes || {};
  return o.employment1y != null || o.natRate != null || o.itsRate != null;
}).length;
const estimatedRent = COURSES.filter((c) => c.rentEstimated).length;
const cities = new Set(COURSES.map((c) => c.city)).size;
const institutions = new Set(COURSES.map((c) => c.inst)).size;

function Row({ label, children }) {
  return (
    <tr>
      <td style={{ ...S.td, whiteSpace: "nowrap" }}><b>{label}</b></td>
      <td style={S.td}>{children}</td>
    </tr>
  );
}

export default function DataSources() {
  return (
    <main style={S.page} className="cc-doc">
      <DocStyle />
      <a href="../" style={S.a}>← CareerCompass</a>

      <h1 style={S.h1}>Dati e fonti</h1>
      <p style={S.small}>
        {N} corsi · {institutions} istituti · {cities} città · English version below
      </p>

      <div style={S.note}>
        La regola che sta sotto a tutto: <b>un dato nazionale non viene mai presentato come se
        descrivesse questo corso.</b> Ogni numero nel sito porta con sé la popolazione che descrive
        davvero — tocca l&apos;etichetta sotto una cifra per vederla.
      </div>

      <h2 style={S.h2}>Quali fonti accettiamo</h2>
      <ul>
        <li>Pagine ufficiali degli istituti e regolamenti didattici.</li>
        <li>Bandi e avvisi di ammissione ufficiali.</li>
        <li>Fonti governative e ministeriali.</li>
        <li>Enti pubblici regionali.</li>
        <li><b>AlmaLaurea</b> — indagini sui laureati.</li>
        <li><b>INDIRE</b> — monitoraggio nazionale degli ITS.</li>
        <li>Pagine ufficiali su borse di studio e diritto allo studio.</li>
        <li>Stime dichiarate, solo dove un dato ufficiale non esiste.</li>
      </ul>

      <h2 style={S.h2}>Come classifichiamo ogni dato</h2>
      <p>Ogni singola cifra nel sito porta una di queste sei etichette:</p>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr><th style={S.th}>Etichetta</th><th style={S.th}>Significa</th></tr>
          </thead>
          <tbody>
            <Row label="Dato ufficiale dell'ateneo">Pubblicato dall&apos;istituto stesso — tasse, regolamenti, requisiti.</Row>
            <Row label="Dato pubblico ufficiale">Rilevazione pubblica su questo ateneo e questa materia, come le indagini AlmaLaurea.</Row>
            <Row label="Dato di monitoraggio nazionale">Misurazione reale, ma di una popolazione più ampia: il monitoraggio INDIRE degli ITS, o la mediana nazionale di un gruppo disciplinare. <b>Descrive il settore, non questo corso.</b></Row>
            <Row label="Stima di CareerCompass">Composto da noi a partire da altre fonti — i costi della vita sono tutti qui.</Row>
            <Row label="Dato non disponibile">Nessuna fonte lo pubblica. La scheda lo dice, invece di lasciare un trattino.</Row>
            <Row label="Dato da confermare">Il dato esiste ma non l&apos;abbiamo ancora verificato alla fonte.</Row>
          </tbody>
        </table>
      </div>

      <h2 style={S.h2}>Cosa copre davvero il catalogo, oggi</h2>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <tbody>
            <Row label="Corsi totali">{N}</Row>
            <Row label="Con una cifra di occupazione">{withFigure} su {N}</Row>
            <Row label="Indagine propria (AlmaLaurea)">{(status.ok || 0) + (status.partial || 0)}</Row>
            <Row label="Monitoraggio ITS (INDIRE)">{status.its || 0}</Row>
            <Row label="Mediana nazionale del settore">{(status.not_member || 0) + (status.no_survey || 0)} — atenei fuori dal consorzio AlmaLaurea, o combinazioni materia/livello che il consorzio non pubblica</Row>
            <Row label="Nessun dato possibile">{status.afam || 0} — conservatori e accademie: in Italia non esiste un&apos;indagine sugli esiti del settore AFAM</Row>
            <Row label="Costo della vita stimato senza indagine">{estimatedRent} corsi, in città che nessuna rilevazione sugli affitti studenteschi copre</Row>
          </tbody>
        </table>
      </div>

      <h2 style={S.h2}>Le fonti, una per una</h2>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Fonte</th><th style={S.th}>Cosa ne prendiamo</th>
              <th style={S.th}>Ambito</th><th style={S.th}>Ultimo controllo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}><a style={S.a} href="https://statistiche.almalaurea.it/" target="_blank" rel="noreferrer">AlmaLaurea</a></td>
              <td style={S.td}>Occupazione a 1 anno, stipendio netto, soddisfazione, laurea in corso</td>
              <td style={S.td}>Ateneo × gruppo disciplinare × livello — <b>non il singolo corso</b></td>
              <td style={{ ...S.td, ...S.mono }}>{VERIFIED.almalaurea}</td>
            </tr>
            <tr>
              <td style={S.td}><a style={S.a} href="https://www.indire.it/" target="_blank" rel="noreferrer">INDIRE</a></td>
              <td style={S.td}>Esiti occupazionali degli ITS, ranking nazionale</td>
              <td style={S.td}>Per corso ITS dove la riga è identificabile, altrimenti per academy</td>
              <td style={{ ...S.td, ...S.mono }}>{VERIFIED.indire}</td>
            </tr>
            <tr>
              <td style={S.td}>Pagine ufficiali degli istituti</td>
              <td style={S.td}>Tasse per fascia ISEE, prove di ammissione, piani di studio</td>
              <td style={S.td}>Il singolo corso o istituto</td>
              <td style={{ ...S.td, ...S.mono }}>{VERIFIED.fees}</td>
            </tr>
            <tr>
              <td style={S.td}><a style={S.a} href="https://www.immobiliare.it/info/ufficio-stampa/2025/stanze-prezzi-in-crescita-domanda-stabile-milano-supera-i-730-euro-mese-per-una-singola-2718/" target="_blank" rel="noreferrer">Immobiliare.it Insights</a></td>
              <td style={S.td}>Affitto medio di una stanza singola e di un posto letto in doppia</td>
              <td style={S.td}>Città, non quartiere. 19 città rilevate, 8 stimate</td>
              <td style={{ ...S.td, ...S.mono }}>{VERIFIED.rents}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 style={S.h3}>Come costruiamo il costo della vita</h3>
      <p>
        Affitto + utenze + spesa + trasporti, come <b>intervallo</b>: l&apos;estremo basso è un posto
        letto in doppia, quello alto una stanza singola. Fra i due c&apos;è l&apos;unica decisione che
        pesa davvero e che dipende da te. <b>Le tasse non sono mai incluse</b> in questa cifra, perché
        dipendono dall&apos;ISEE della tua famiglia e sono un&apos;altra categoria di spesa.
      </p>

      <h2 style={S.h2}>Quando le fonti si contraddicono</h2>
      <ol>
        <li>Vince la fonte ufficiale <b>più specifica</b> per quel corso.</li>
        <li>A parità di specificità, vince la <b>più recente</b> applicabile.</li>
        <li>La discordanza viene <b>registrata</b>, non cancellata.</li>
        <li>Se la differenza può cambiare una decisione, la <b>mostriamo</b> invece di sceglierne una in silenzio.</li>
        <li>Non sostituiamo mai un valore con un altro senza dirlo.</li>
      </ol>

      <h2 style={S.h2}>Cosa conserviamo per ogni dato</h2>
      <p style={S.mono}>
        campo · valore · unità · istituto · corso · città · URL della fonte · tipo di fonte ·
        data di raccolta · data di verifica · anno di riferimento · stato · livello di affidabilità ·
        nota metodologica · versione
      </p>
      <p style={S.small}>
        Non tutti i campi sono già popolati per ogni dato: lo schema è quello verso cui stiamo
        lavorando, e la scheda mostra sempre quelli che abbiamo.
      </p>

      <h2 style={S.h2}>Cosa NON facciamo</h2>
      <ul>
        <li>Non inventiamo un numero quando la fonte non lo pubblica.</li>
        <li>Non attribuiamo il dato nazionale INDIRE a ogni singolo corso ITS.</li>
        <li>Non mescoliamo tasse, affitto, spesa e trasporti in un unico numero senza dire che è una somma.</li>
        <li>Non mettiamo accanto cifre di indagini diverse come se fossero confrontabili.</li>
        <li>Non aggiorniamo una data di verifica se non abbiamo davvero riletto la fonte.</li>
      </ul>

      <div style={S.note}>
        <b>Hai visto un numero che non torna?</b> Scrivici a{" "}
        <a style={S.a} href={`mailto:${CONTACT}`}>{CONTACT}</a> o usa il pulsante
        &laquo;Segnala un problema&raquo; nel sito. Le segnalazioni sugli errori nei dati hanno la
        precedenza su tutto il resto.
      </div>

      <hr style={S.hr} />

      <h1 style={S.h1}>Data and sources (English)</h1>
      <p style={S.small}>{N} courses · {institutions} institutions · {cities} cities</p>

      <div style={S.note}>
        The rule underneath everything: <b>a national figure is never presented as if it described
        this course.</b> Every number in the site carries the population it actually describes — tap
        the label under a figure to see it.
      </div>

      <h2 style={S.h2}>Which sources we accept</h2>
      <ul>
        <li>Official institution pages and course regulations.</li>
        <li>Official admission notices.</li>
        <li>Government and ministry sources.</li>
        <li>Regional public bodies.</li>
        <li><b>AlmaLaurea</b> — graduate surveys.</li>
        <li><b>INDIRE</b> — national ITS monitoring.</li>
        <li>Official scholarship and student-services pages.</li>
        <li>Declared estimates, only where official data does not exist.</li>
      </ul>

      <h2 style={S.h2}>How every figure is classified</h2>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Label</th><th style={S.th}>Meaning</th></tr></thead>
          <tbody>
            <Row label="Official institution data">Published by the institution itself — fees, regulations, requirements.</Row>
            <Row label="Official public data">A public survey of this university and this subject, such as AlmaLaurea.</Row>
            <Row label="National monitoring data">A real measurement, but of a wider population: INDIRE&apos;s ITS monitoring, or the national median for a subject group. <b>It describes the field, not this course.</b></Row>
            <Row label="Estimate by CareerCompass">Assembled by us from other sources — all living costs are here.</Row>
            <Row label="Data not available">No source publishes it. The card says so instead of leaving a dash.</Row>
            <Row label="Data to be confirmed">The figure exists but we have not yet verified it at source.</Row>
          </tbody>
        </table>
      </div>

      <h2 style={S.h2}>What the catalogue actually covers today</h2>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <tbody>
            <Row label="Total courses">{N}</Row>
            <Row label="Carrying an employment figure">{withFigure} of {N}</Row>
            <Row label="Their own survey (AlmaLaurea)">{(status.ok || 0) + (status.partial || 0)}</Row>
            <Row label="ITS monitoring (INDIRE)">{status.its || 0}</Row>
            <Row label="National median for the field">{(status.not_member || 0) + (status.no_survey || 0)} — universities outside the AlmaLaurea consortium, or subject/level combinations the consortium does not publish</Row>
            <Row label="No figure possible">{status.afam || 0} — conservatoires and academies: Italy publishes no outcomes survey for the AFAM sector</Row>
            <Row label="Living cost estimated without a survey">{estimatedRent} courses, in cities no student-rent survey covers</Row>
          </tbody>
        </table>
      </div>

      <h2 style={S.h2}>The sources, one by one</h2>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr><th style={S.th}>Source</th><th style={S.th}>What we take</th><th style={S.th}>Scope</th><th style={S.th}>Last checked</th></tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}><a style={S.a} href="https://statistiche.almalaurea.it/" target="_blank" rel="noreferrer">AlmaLaurea</a></td>
              <td style={S.td}>Employment at 1 year, net pay, satisfaction, on-time graduation</td>
              <td style={S.td}>University × subject group × level — <b>not the individual course</b></td>
              <td style={S.td}>{VERIFIED.almalaurea}</td>
            </tr>
            <tr>
              <td style={S.td}><a style={S.a} href="https://www.indire.it/" target="_blank" rel="noreferrer">INDIRE</a></td>
              <td style={S.td}>ITS employment outcomes, national ranking</td>
              <td style={S.td}>Per ITS course where the row is identifiable, otherwise per academy</td>
              <td style={S.td}>{VERIFIED.indire}</td>
            </tr>
            <tr>
              <td style={S.td}>Official institution pages</td>
              <td style={S.td}>Fees by ISEE band, admission tests, study plans</td>
              <td style={S.td}>The individual course or institution</td>
              <td style={S.td}>{VERIFIED.fees}</td>
            </tr>
            <tr>
              <td style={S.td}><a style={S.a} href="https://www.immobiliare.it/info/ufficio-stampa/2025/stanze-prezzi-in-crescita-domanda-stabile-milano-supera-i-730-euro-mese-per-una-singola-2718/" target="_blank" rel="noreferrer">Immobiliare.it Insights</a></td>
              <td style={S.td}>Average price of a single room and of a bed in a shared room</td>
              <td style={S.td}>City, not neighbourhood. 19 cities surveyed, 8 estimated</td>
              <td style={S.td}>{VERIFIED.rents}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 style={S.h3}>How the living cost is built</h3>
      <p>
        Rent + utilities + food + transport, as a <b>range</b>: the low end is a bed in a shared room,
        the high end a private single. Between them sits the one decision that genuinely moves the
        number and is genuinely yours. <b>Tuition is never included</b> in that figure, because it
        depends on your family&apos;s ISEE and is a different category of cost.
      </p>

      <h2 style={S.h2}>When sources disagree</h2>
      <ol>
        <li>The <b>most specific</b> official source for that course wins.</li>
        <li>At equal specificity, the <b>most recent</b> applicable one wins.</li>
        <li>The disagreement is <b>recorded</b>, not erased.</li>
        <li>Where the difference could change a decision, we <b>show it</b> rather than silently picking one.</li>
        <li>We never replace one value with another without saying so.</li>
      </ol>

      <h2 style={S.h2}>What we store for each figure</h2>
      <p style={S.mono}>
        field · value · unit · institution · course · city · source URL · source type ·
        collection date · verification date · reference year · status · reliability level ·
        methodological note · version
      </p>
      <p style={S.small}>
        Not every field is populated for every figure yet: this is the schema we are working towards,
        and the card always shows the ones we do have.
      </p>

      <h2 style={S.h2}>What we do NOT do</h2>
      <ul>
        <li>Invent a number when the source does not publish one.</li>
        <li>Attribute INDIRE&apos;s national result to every individual ITS course.</li>
        <li>Merge tuition, rent, food and transport into one figure without saying it is a sum.</li>
        <li>Place figures from different surveys side by side as if they were comparable.</li>
        <li>Move a verification date without having actually re-read the source.</li>
      </ul>

      <div style={S.note}>
        <b>Spotted a number that looks wrong?</b> Write to{" "}
        <a style={S.a} href={`mailto:${CONTACT}`}>{CONTACT}</a> or use the &ldquo;report a
        problem&rdquo; button in the site. Reports about wrong data take priority over everything else.
      </div>

      <p style={{ ...S.small, marginTop: 34 }}>
        <a style={S.a} href="../how-it-works/">Come funziona / How it works</a>
        {" · "}
        <a style={S.a} href="../privacy/">Privacy</a>
        {" · "}
        <a style={S.a} href="../terms/">Termini / Terms</a>
      </p>
    </main>
  );
}
