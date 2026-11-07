import * as en from './data.js';

const profileHr = {
  role: 'Student računalnih znanosti',
  current: 'Diplomski studij · FOI',
  focus: 'Razvoj softvera i QA · MT-lab',
  about: 'Studiram na Fakultetu organizacije i informatike te radim na razvoju softvera i osiguravanju kvalitete u MT-labu. Volim pratiti ideju od implementacije do testiranja i surađivati s timom kako bi rješenje bilo pouzdano.',
};

const hrStops = [
  ['O meni', 'Studio', 'Profil', profileHr.about],
  ['Karijera', 'Ured', 'Radno iskustvo', 'Radim na razvoju softvera, testiranju, bazama podataka i tehničkoj podršci.'],
  ['Projekti', 'Radionica', 'Odabrani radovi', 'Projekti sa studija, iz laboratorija i sa stručne prakse.'],
  ['Vještine', 'Laboratorij', 'Tehnologije i certifikati', 'Visine stupova prate ljestvicu od jedne do tri zvjezdice iz mojeg CV-a.'],
  ['Obrazovanje', 'Knjižnica', 'Studij i volontiranje', 'Studij informacijskih sustava, programskog inženjerstva i razvoja aplikacija.'],
  ['Kontakt', 'Recepcija', 'Pronađi me na mreži', 'Javi se e-poštom ili na LinkedInu. Repozitoriji su dostupni na GitHubu.'],
];

const hrCareer = [
  ['Razvojni inženjer i QA tester', 'MT-lab · Fakultet organizacije i informatike', '2023. – danas', 'Razvoj softvera i osiguravanje kvalitete mobilnih i web aplikacija u fakultetskom laboratoriju.', ['Testirao funkcionalnost i korisničko iskustvo web aplikacije za udrugu Obitelj 3plus.', 'Razvijao interne Android aplikacije te sudjelovao u dizajnu i implementaciji novih rješenja.']],
  ['.NET razvojni inženjer', 'Knauf Insulation d.o.o.', 'ruj 2025. – kol 2026.', 'Razvoj i održavanje aplikacije KI Expert Plus.', ['Implementirao nove funkcionalnosti i doradio algoritme.', 'Održavao aplikaciju, rješavao greške i pružao tehničku podršku korisnicima.']],
  ['Web developer na stručnoj praksi', 'Karydia d.o.o.', 'tra – lip 2025.', 'Izradio WordPress integraciju tijekom stručne prakse.', ['Razvio PHP dodatak za automatski prijenos podataka iz vanjskog sustava.', 'Izradio prilagođene predloške za strukturirani prikaz uvezenih podataka.']],
  ['Oracle developer', 'InfoDom d.o.o.', 'ruj – lis 2024.', 'Razvoj baza podataka i podrška sustavima uz Oracle tehnologije.', ['Koristio PL/SQL za rad s bazama i sustavima.', 'Razvijao i implementirao rješenja uz Oracle APEX, BI Publisher i SQL Developer.']],
];

const hrProjects = [
  ['Desktop aplikacija otvorenog koda', 'Tauri desktop aplikacija za upravljanje Git repozitorijima.', ['Dizajnirana za svakodnevni rad s repozitorijima.', 'Objavljena kao projekt otvorenog koda.']],
  ['Duboko učenje', 'Sustav za prepoznavanje šarenice primjenom dubokog učenja.', ['Prikupio podatke za prepoznavanje.', 'Trenirao i evaluirao model.']],
  ['WordPress dodatak', 'PHP dodatak izrađen na praksi u Karydiji za uvoz podataka iz vanjskog API-ja.', ['Automatizirao prijenos podataka s API-ja.', 'Izradio WordPress predloške za prikaz podataka.']],
  ['Web aplikacija', 'Laravel aplikacija za izradu kvizova i vođenje natjecanja uživo.', ['Implementirao izradu vlastitih kvizova.', 'Dodao natjecateljski način rada po uzoru na Kahoot.']],
  ['Android aplikacija', 'Kotlin aplikacija izrađena u suradnji s OTP bankom za prijavu studenata na prakse i poslove.', ['Izradio Android sučelje pomoću Jetpack Composea.', 'Usmjerio aplikaciju na postupak prijave.']],
  ['Web aplikacija', 'Modularna web aplikacija za upravljanje podacima o glumcima i drugim ljudima iz filmske industrije.', ['Izradio aplikaciju u Angularu i Node.js-u uz TypeScript.', 'Dizajnirao module za rad s TMDB API-jem.']],
  ['Windows desktop aplikacija', 'WPF aplikacija za prijavu zahtjeva i pružanje podrške gradu.', ['Izradio desktop sučelje u XAML-u i .NET-u.', 'Organizirao aplikaciju u module za gradsku upravu.']],
  ['Web aplikacija', 'Sustav za glasanje u Node.js-u s odvojenim ulogama administratora i glasača.', ['Implementirao pristup na temelju uloga.', 'Dodao mjere za integritet glasanja i aplikacije.']],
  ['Višeplatformska mobilna aplikacija', 'Flutter aplikacija koja preporučuje zanimljiva mjesta duž rute.', ['Dodao navigaciju i planiranje stajališta.', 'Uključio statistiku putovanja.']],
  ['Oracle APEX aplikacija', 'Oracle APEX aplikacija za upravljanje medicinskim laboratorijem.', ['Analizirao procese i identificirao nedostatke.', 'Implementirao digitalne tijekove rada.']],
  ['Interaktivni web portfolio', 'Ova stranica spaja proceduralni 3D ured, kameru koja prati pomicanje i animirani portret.', ['Izradio modele i uredski inventar u Three.js-u.', 'Sinkronizirao vrh olovke sa SVG putanjama.']],
];

const hrEducation = [
  ['Fakultet organizacije i informatike', 'Informacijski i poslovni sustavi · Informacijsko i programsko inženjerstvo', '2022. – danas', 'Prijediplomski studij informacijskih i poslovnih sustava te diplomski studij informacijskog i programskog inženjerstva.', ['Magna cum laude.', 'Interesi uključuju baze podataka, web razvoj, programsko inženjerstvo i sigurnost programskih sustava.']],
  ['Srednja škola Vitez', 'Opća gimnazija', '2018. – 2022.', 'Završio program opće gimnazije.'],
];

const messages = {
  en: {
    locale: 'Hrvatski', cv: 'Download CV', about: 'Learn about me', close: 'Back to desk', world: 'Portfolio office',
    language: 'Language', skip: 'Skip to content', skipIntro: 'Skip intro',
    title: 'Developer Portfolio', portal: 'Entering the office', controls: 'Map controls',
    previous: 'Previous stop', next: 'Next stop', scroll: 'Scroll to travel', read: 'Read text', map: 'Return to map',
    region: 'Explore the 3D office by scrolling', source: 'View source', github: 'Open GitHub', linkedin: 'Open LinkedIn',
    email: 'Send email', stars: 'stars', at: 'Career & projects', tools: 'Technology columns',
    certificates: 'Certificates & distinctions', volunteering: 'Volunteering', languages: 'Languages', strengths: 'How I work',
    interests: 'Outside of code', profile: 'Profile', portrait: 'Portrait from my CV', focus: 'Current focus',
  },
  hr: {
    locale: 'English', cv: 'Preuzmi CV', about: 'Upoznaj me', close: 'Povratak na stol', world: 'Ured portfolija',
    language: 'Jezik', skip: 'Preskoči na sadržaj', skipIntro: 'Preskoči uvod',
    title: 'Developerski portfolio', portal: 'Ulazak u ured', controls: 'Kontrole karte',
    previous: 'Prethodna postaja', next: 'Sljedeća postaja', scroll: 'Skrolaj za kretanje', read: 'Čitaj tekst', map: 'Povratak na kartu',
    region: 'Istraži 3D ured pomicanjem', source: 'Otvori izvorni kod', github: 'Otvori GitHub', linkedin: 'Otvori LinkedIn',
    email: 'Pošalji e-poštu', stars: 'zvjezdice', at: 'Karijera i projekti', tools: 'Tehnološki stupovi',
    certificates: 'Certifikati i priznanja', volunteering: 'Volontiranje', languages: 'Jezici', strengths: 'Kako radim',
    interests: 'Izvan programiranja', profile: 'Profil', portrait: 'Portret iz mojeg životopisa', focus: 'Trenutni fokus',
  },
};

export function getLocale(language) {
  if (language !== 'hr') return { ...en, language: 'en', t: messages.en };
  const record = ([title, organization, dates, description, points]) => ({ title, organization, dates, description, points });
  return {
    ...en, language: 'hr', t: messages.hr,
    profile: { ...en.profile, ...profileHr },
    stops: en.stops.map((stop, index) => {
      const [title, place, tag, description] = hrStops[index];
      return { ...stop, title, place, tag, description };
    }),
    experience: en.experience.map((item, index) => ({ ...item, ...record(hrCareer[index]) })),
    projects: en.projects.map((item, index) => {
      const [type, description, points] = hrProjects[index];
      return { ...item, type, description, points };
    }),
    education: en.education.map((item, index) => ({ ...item, ...record(hrEducation[index]) })),
    skills: en.skills.map((skill, index) => ({ ...skill, title: ['Programski jezici', 'Web razvoj', 'Desktop i mobilni razvoj', 'Podaci i baze podataka', 'Razvojni alati', 'Verzioniranje i suradnja'][index] })),
    credentials: ['Certifikat za osnove WordPressa', 'Digitalni inovacijski inkubator · priznanje za četvrto mjesto', 'Lumen Development · certifikat za polufinale', 'Certifikat Google Ads for Beginners', 'FINA Akademija · diploma za testiranje softvera', 'Diploma natjecanja izrade tematskog ETF-a'],
    volunteering: ['Kruh svetog Ante · socijalna samoposluga', 'RoboCup 2023 · Europsko prvenstvo', 'Član FOI centra za volontiranje'],
    languages: ['Hrvatski · materinski', 'Engleski · tečno', 'Njemački · osnove'],
    softSkills: ['Kritičko razmišljanje', 'Komunikacija', 'Prezentiranje', 'Prilagodljivost', 'Rješavanje problema', 'Upravljanje vremenom'],
    interests: ['Film', 'Videoigre', 'Nogomet', 'Planinarenje'],
  };
}
