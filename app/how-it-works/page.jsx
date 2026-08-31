// How it works — the public methodology page.
//
// Written to be checkable. Every number here (how many questions, the two
// weights in the ranking, the size of the catalogue) is the number the code
// actually uses, and the "what this does not measure" and "known limitations"
// sections are the parts that matter most: a guidance tool that only publishes
// its strengths is not being transparent, it is marketing.
import { S, CONTACT, DocStyle } from "../docStyles";
import COURSES from "../../data/courses-v2.json";
import QUESTIONS from "../../data/questions-v2.json";

export const metadata = { title: "Come funziona — CareerCompass" };

const REVIEW = { version: 3, reviewed: "29 agosto 2026", reviewedEn: "29 August 2026" };

// Counted from the real bank and the real catalogue, so this page cannot drift
// away from the product it describes. The per-run figures mirror the arguments
// CareerCompass.jsx passes to buildSurvey/pickLikert.
const BANK = QUESTIONS.binary.length + QUESTIONS.multi.length + QUESTIONS.likert.length;
const PER_RUN = { binary: 10, multi: 5, likert: 5 };
const ASKED = PER_RUN.binary + PER_RUN.multi + PER_RUN.likert;
const N = COURSES.length;
const CITIES = new Set(COURSES.map((c) => c.city)).size;
// Courses showing no employment figure at all, and why. Not all of them are
// AFAM: one is an AlmaLaurea row whose employment cell the consortium
// suppresses, and calling all 34 "conservatoires" would be wrong.
const noFigure = COURSES.filter((c) => {
  const o = c.outcomes || {};
  return o.employment1y == null && o.natRate == null && o.itsRate == null;
});
const AFAM_NO_DATA = noFigure.filter((c) => c.outcomes?.status === "afam").length;
const OTHER_NO_DATA = noFigure.length - AFAM_NO_DATA;
// "Altri 1 restano" is the same plural bug as "Continua (1 scelte)". Build the
// sentence for the count we actually have, and drop it entirely at zero rather
// than printing "A further 0".
const OTHER_IT = OTHER_NO_DATA === 0 ? null
  : OTHER_NO_DATA === 1 ? "Un altro corso resta senza cifra perché AlmaLaurea non pubblica quella casella."
    : `Altri ${OTHER_NO_DATA} corsi restano senza cifra perché AlmaLaurea non pubblica quella casella.`;
const OTHER_EN = OTHER_NO_DATA === 0 ? null
  : OTHER_NO_DATA === 1 ? "One more lacks a figure because AlmaLaurea suppresses that particular cell."
    : `A further ${OTHER_NO_DATA} lack one because AlmaLaurea suppresses that particular cell.`;

export default function HowItWorks() {
  return (
    <main style={S.page} className="cc-doc">
      <DocStyle />
      <a href="../" style={S.a}>← CareerCompass</a>

      <h1 style={S.h1}>Come funziona</h1>
      <p style={S.small}>
        Metodo versione {REVIEW.version} · ultima revisione {REVIEW.reviewed} · English version below
      </p>

      <div style={S.note}>
        <b>Questo test non misura la tua intelligenza, la tua personalità o le tue capacità.</b>{" "}
        Usa le preferenze che indichi per suggerire percorsi di studio e di lavoro che vale la pena
        esplorare. Niente di più.
      </div>

      <h2 style={S.h2}>A cosa serve</h2>
      <p>
        Serve a restringere il campo. A 18 anni nessuno può conoscere tutti i percorsi che esistono in
        Italia: l&apos;obiettivo è farti incontrare quelli compatibili con quello che dici di
        preferire — soprattutto quelli di cui non avevi mai sentito parlare — e poi darti i dati veri
        per valutarli. La scelta resta tua, e resta reversibile.
      </p>

      <h2 style={S.h2}>Cosa misura il test</h2>
      <p>Solo preferenze dichiarate, su sei dimensioni:</p>
      <ul>
        <li><b>Costruttore</b> — mani, attrezzi, macchine, il mondo fisico.</li>
        <li><b>Pensatore</b> — perché le cose funzionano, dati, comprensione profonda.</li>
        <li><b>Creativo</b> — idee, design, espressione, originalità.</li>
        <li><b>Altruista</b> — persone, cura, insegnamento, relazione.</li>
        <li><b>Leader</b> — convincere, decidere, costruire iniziative.</li>
        <li><b>Organizzatore</b> — ordine, precisione, piani che funzionano.</li>
      </ul>
      <p>
        Sono le sei dimensioni del modello RIASEC di John Holland, uno schema pubblicato e molto usato
        nell&apos;orientamento. La nostra implementazione si ispira a quel modello: <b>non è lo
        strumento psicometrico validato di Holland</b>, e non va confusa con esso.
      </p>
      <p>
        Un secondo questionario, facoltativo, di otto domande, raccoglie le tue <b>circostanze</b> —
        quanto puoi spostarti, quanto può sostenere la tua famiglia, la fascia ISEE, quanta matematica
        reggi. Serve solo a <b>riordinare l&apos;elenco dei corsi</b>: non tocca il tuo profilo e non
        cambia chi pensiamo che tu sia.
      </p>

      <h2 style={S.h2}>Cosa il test NON misura</h2>
      <ul>
        <li>L&apos;intelligenza.</li>
        <li>Le capacità o il rendimento scolastico.</li>
        <li>La personalità in senso clinico o psicologico validato.</li>
        <li>Come andrai in futuro.</li>
        <li>La garanzia di trovare lavoro.</li>
        <li>Il reddito della tua famiglia.</li>
        <li>Se sarai ammesso da qualche parte.</li>
        <li>Quale sia la carriera &laquo;migliore&raquo; in assoluto.</li>
        <li>Chi sei e cosa puoi diventare.</li>
      </ul>

      <h2 style={S.h2}>Come sono fatte le domande</h2>
      <p>
        Ogni test estrae <b>{ASKED} domande</b> da un archivio di <b>{BANK}</b>: {PER_RUN.binary} a scelta
        binaria fra due attività concrete, {PER_RUN.multi} a scelta multipla, {PER_RUN.likert} a
        intensità (&laquo;quanto ti somiglia&raquo;).
      </p>
      <ul>
        <li>
          <b>Una domanda, un concetto.</b> Nelle binarie ogni opzione pesa su una sola dimensione, così
          la risposta non mescola due cose insieme.
        </li>
        <li>
          <b>Niente oggetti che non tutti hanno.</b> Le domande parlano di attività, non di attrezzature:
          chiedere &laquo;monti il PC da zero?&raquo; misura anche quanto sei benestante, e un ragazzo
          sportivo che non usa il computer non ha modo di rispondere. Le versioni con oggetti specifici
          sono state riscritte.
        </li>
        <li>
          <b>Un test diverso ogni volta.</b> Le binarie sono estratte con campionamento stratificato sulle
          coppie di dimensioni, così tutte e sei restano coperte anche se le domande cambiano. Le domande
          di intensità sono adattive: si concentrano sulle tue due dimensioni più forti.
        </li>
        <li>
          <b>Nessuna risposta è sbagliata</b> e nessuna combinazione è &laquo;migliore&raquo; di
          un&apos;altra.
        </li>
      </ul>
      <p>
        <b>Onestamente:</b> le domande sono state provate in modo informale con un piccolo numero di
        persone e corrette in base a quello che non funzionava. <b>Non</b> sono state validate
        psicometricamente, né testate in modo strutturato per comprensibilità con studenti di 17-19
        anni, né sottoposte a una revisione formale dei bias. È una limitazione reale ed è elencata
        sotto.
      </p>

      <h2 style={S.h2}>Come vengono calcolati i risultati</h2>
      <p>Le tue risposte diventano un punteggio su ognuna delle sei dimensioni. Da lì:</p>
      <ol>
        <li>
          I mondi e le professioni hanno a loro volta un profilo sulle stesse sei dimensioni.
          L&apos;ordine nasce da due componenti sommate: <b>55% allineamento</b> (quanto il tuo profilo
          somiglia a quello del mondo) e <b>45% affinità</b> (quanti degli interessi che hai spuntato
          quel mondo usa davvero).
        </li>
        <li>
          Dopo il test ti proponiamo alcuni <b>interessi</b> dedotti dalle risposte. Puoi aggiungerli e
          toglierli: comandi tu. Le modifiche rientrano nel calcolo e <b>riordinano davvero</b> l&apos;elenco
          — l&apos;affinità è calcolata mondo per mondo, quindi spuntare &laquo;Salute e corpo&raquo; alza
          Salute e cura senza toccare Impresa e denaro.
        </li>
        <li>
          Per i singoli corsi il punteggio si divide in tre: <b>interessi</b>, <b>esiti</b> (occupazione e
          stipendio reali) e <b>ambiente</b> (costi, distanza, città, carico di matematica). Quando un dato
          manca, quella componente <b>non viene indovinata</b>: esce dal calcolo e la scheda dice perché.
        </li>
        <li>
          Se salti delle domande, le dimensioni non toccate restano semplicemente più basse. Non
          inventiamo le risposte mancanti.
        </li>
      </ol>
      <div style={S.note}>
        Le percentuali dicono <b>quanto un percorso è compatibile con le preferenze che hai indicato
        oggi</b>. Non sono una probabilità di riuscita, non sono un voto, e non sono una previsione.
        Rifai il test fra sei mesi e cambieranno — è normale, ed è il motivo per cui salviamo ogni
        risultato con la sua data.
      </div>

      <h2 style={S.h2}>Informazioni sulla revisione</h2>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <tbody>
            <tr>
              <td style={S.td}><b>Versione del metodo</b></td>
              <td style={S.td}>{REVIEW.version} — ogni risultato salvato registra la versione che lo ha prodotto</td>
            </tr>
            <tr>
              <td style={S.td}><b>Ultima revisione</b></td>
              <td style={S.td}>{REVIEW.reviewed}</td>
            </tr>
            <tr>
              <td style={S.td}><b>Fonti usate</b></td>
              <td style={S.td}>
                AlmaLaurea, INDIRE, pagine ufficiali degli atenei, Immobiliare.it Insights —{" "}
                <a style={S.a} href="../data-sources/">dettaglio completo</a>
              </td>
            </tr>
            <tr>
              <td style={S.td}><b>Segnalare un errore</b></td>
              <td style={S.td}><a style={S.a} href={`mailto:${CONTACT}`}>{CONTACT}</a>, o il pulsante &laquo;Segnala un problema&raquo; nel sito</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 style={S.h2}>Limiti noti</h2>
      <ul>
        <li>Il questionario <b>non è uno strumento psicometrico validato</b> e non deve essere usato come tale.</li>
        <li>Le domande non hanno avuto una verifica strutturata di comprensibilità con la fascia 17-19 anni né una revisione formale dei bias.</li>
        <li>
          I dati AlmaLaurea sono per <b>ateneo × gruppo disciplinare × livello</b>, non per singolo corso:
          descrivono un insieme più ampio di quello che stai guardando.
        </li>
        <li>{AFAM_NO_DATA} corsi su {N} — conservatori e accademie — non hanno alcuna cifra di occupazione: <b>in Italia non esiste un&apos;indagine sugli esiti del settore AFAM</b>. {OTHER_IT} Su quelle schede non c&apos;è un numero perché non c&apos;è una fonte.</li>
        <li>Il catalogo copre {N} corsi in {CITIES} città: è una parte dell&apos;offerta italiana, non tutta.</li>
        <li>I costi della vita sono <b>stime</b>, presentate come intervalli e mai come misure.</li>
        <li>Gli stipendi sono valori tipici di ingresso, non quello che guadagnerai tu.</li>
        <li>Il test è disponibile in tre lingue; i contenuti sono stati scritti in inglese e tradotti.</li>
      </ul>

      <hr style={S.hr} />

      <h1 style={S.h1}>How it works (English)</h1>
      <p style={S.small}>Method version {REVIEW.version} · last reviewed {REVIEW.reviewedEn}</p>

      <div style={S.note}>
        <b>This test does not evaluate your intelligence, personality, or abilities.</b> It uses the
        preferences you indicate to suggest study and career paths worth exploring. Nothing more.
      </div>

      <h2 style={S.h2}>What it is for</h2>
      <p>
        Narrowing the field. Nobody at 18 can know every path that exists in Italy; the point is to put
        you in front of the ones compatible with what you say you prefer — especially the ones you had
        never heard of — and then give you real data to judge them. The decision stays yours, and it
        stays reversible.
      </p>

      <h2 style={S.h2}>What the test measures</h2>
      <p>Stated preferences only, across six dimensions: <b>Maker</b> (hands, tools, the physical
        world), <b>Thinker</b> (why things work, data), <b>Creator</b> (ideas, design, expression),
        <b> Helper</b> (people, care, teaching), <b>Leader</b> (persuading, deciding, building), and{" "}
        <b>Organizer</b> (order, precision, plans that work).</p>
      <p>
        These are the six dimensions of John Holland&apos;s RIASEC model, a published and widely used
        careers-guidance framework. Our implementation is <b>informed by</b> that model; it is{" "}
        <b>not Holland&apos;s validated instrument</b> and should not be mistaken for it.
      </p>
      <p>
        A second, optional eight-question survey collects your <b>circumstances</b> — how far you could
        travel, what your family could manage monthly, your ISEE band, how much maths you can live
        with. It only <b>reorders the course list</b>. It never touches your profile.
      </p>

      <h2 style={S.h2}>What the test does NOT measure</h2>
      <ul>
        <li>Intelligence.</li>
        <li>Academic ability.</li>
        <li>Personality in a clinical or validated psychological sense.</li>
        <li>Future performance.</li>
        <li>Guaranteed employability.</li>
        <li>Family income.</li>
        <li>Eligibility for admission.</li>
        <li>The objectively &ldquo;best&rdquo; career.</li>
        <li>Your complete identity or potential.</li>
      </ul>

      <h2 style={S.h2}>How the questions are built</h2>
      <p>
        Each run draws <b>{ASKED} questions</b> from a bank of <b>{BANK}</b>: {PER_RUN.binary} forced
        choices between two concrete activities, {PER_RUN.multi} multi-select, {PER_RUN.likert}
        intensity items.
      </p>
      <ul>
        <li><b>One question, one concept.</b> In the forced choices each option loads on a single dimension, so an answer never bundles two things together.</li>
        <li>
          <b>No objects not everyone owns.</b> Questions describe activities, not equipment. Asking
          &ldquo;do you build a PC from scratch?&rdquo; also measures how well-off you are, and a sporty
          teenager who does not use a computer has no way in. Object-specific versions were rewritten.
        </li>
        <li>
          <b>A different test every time.</b> The forced choices are drawn by stratified sampling across
          dimension pairs, so all six stay covered even as the questions change. Intensity items are
          adaptive — they spend themselves on your two leading dimensions.
        </li>
        <li><b>No answer is wrong</b> and no combination is better than another.</li>
      </ul>
      <p>
        <b>Honestly:</b> the questions were tried informally with a small number of people and corrected
        where they failed. They have <b>not</b> been psychometrically validated, structurally tested for
        comprehension with 17-19 year olds, or put through a formal bias review. That is a real
        limitation and it is listed below.
      </p>

      <h2 style={S.h2}>How results are calculated</h2>
      <ol>
        <li>
          Worlds and careers carry a profile on the same six dimensions. The order comes from two
          components added together: <b>55% alignment</b> (how closely your profile resembles the
          world&apos;s) and <b>45% affinity</b> (how many of the interests you ticked that world actually
          runs on).
        </li>
        <li>
          After the test we suggest <b>interests</b> inferred from your answers. You can add and remove
          them, and your edits go back into the calculation and <b>genuinely reorder</b> the list —
          affinity is computed per world, so ticking &ldquo;Health &amp; body&rdquo; lifts Health &amp;
          care without touching Business &amp; money.
        </li>
        <li>
          For individual courses the score splits three ways: <b>interests</b>, <b>outcomes</b> (real
          employment and pay) and <b>environment</b> (cost, distance, city, maths load). When a figure is
          missing, that component is <b>not guessed</b> — it drops out of the calculation and the card
          says why.
        </li>
        <li>If you skip questions, the untouched dimensions simply stay lower. We do not invent the missing answers.</li>
      </ol>
      <div style={S.note}>
        Percentages say <b>how compatible a path is with the preferences you gave today</b>. They are
        not a probability of success, not a grade, and not a prediction. Retake the test in six months
        and they will change — which is normal, and why every result is saved with its date.
      </div>

      <h2 style={S.h2}>Review information</h2>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <tbody>
            <tr><td style={S.td}><b>Method version</b></td><td style={S.td}>{REVIEW.version} — every saved result records the version that produced it</td></tr>
            <tr><td style={S.td}><b>Last reviewed</b></td><td style={S.td}>{REVIEW.reviewedEn}</td></tr>
            <tr><td style={S.td}><b>Sources used</b></td><td style={S.td}>AlmaLaurea, INDIRE, official institution pages, Immobiliare.it Insights — <a style={S.a} href="../data-sources/">full detail</a></td></tr>
            <tr><td style={S.td}><b>Reporting an error</b></td><td style={S.td}><a style={S.a} href={`mailto:${CONTACT}`}>{CONTACT}</a>, or the &ldquo;report a problem&rdquo; button in the site</td></tr>
          </tbody>
        </table>
      </div>

      <h2 style={S.h2}>Known limitations</h2>
      <ul>
        <li>The questionnaire is <b>not a validated psychometric instrument</b> and must not be used as one.</li>
        <li>The questions have had no structured comprehension testing with 17-19 year olds and no formal bias review.</li>
        <li>AlmaLaurea data is published by <b>university × subject group × level</b>, not per course, so it describes a wider population than the one you are looking at.</li>
        <li>{AFAM_NO_DATA} of {N} courses — conservatoires and art academies — carry no employment figure at all: <b>Italy publishes no outcomes survey for the AFAM sector</b>. {OTHER_EN} Those cards carry no figure because there is no source.</li>
        <li>The catalogue covers {N} courses across {CITIES} cities. It is part of the Italian offering, not all of it.</li>
        <li>Living costs are <b>estimates</b>, shown as ranges and never as measurements.</li>
        <li>Salaries are typical entry-level figures, not what you personally will earn.</li>
        <li>The tool exists in three languages; content was written in English and translated.</li>
      </ul>

      <p style={{ ...S.small, marginTop: 34 }}>
        <a style={S.a} href="../data-sources/">Dati e fonti / Data and sources</a>
        {" · "}
        <a style={S.a} href="../privacy/">Privacy</a>
        {" · "}
        <a style={S.a} href="../terms/">Termini / Terms</a>
      </p>
    </main>
  );
}
