/* Carnet d'entraînement — rendu à partir des fichiers JSON de data/. */

const $ = (s) => document.querySelector(s);
const MOIS = ['janv.','févr.','mars','avril','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const JOURS = ['Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.','Dim.'];

/* ---------- Formatage ---------- */

const pad = (n) => String(n).padStart(2, '0');

function chrono(s) {
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
function allureStr(tempsS, km) {
  if (!km) return '—';
  const s = Math.round(tempsS / km);
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}
function allureSec(tempsS, km) { return tempsS / km; }
function coutCardiaque(fc, tempsS, km) { return fc * (tempsS / 60) / km; }

function dateFr(iso, court) {
  const [a, m, j] = iso.split('-').map(Number);
  return court ? `${j} ${MOIS[m - 1]}` : `${j} ${MOIS[m - 1]} ${a}`;
}
// jour de semaine abrégé + quantième, ex. « Jeu. 20 » — pour les lignes
// compactes où le mois ne change pas le sens (on reste dans la semaine affichée)
function jourCourt(iso) {
  const [a, m, j] = iso.split('-').map(Number);
  const idx = (new Date(Date.UTC(a, m - 1, j)).getUTCDay() + 6) % 7;
  return `${JOURS[idx]} ${j}`;
}
function joursDepuis(iso) {
  return Math.round((new Date(iso) - new Date(new Date().toDateString())) / 86400000);
}
function numSemaine(iso) { return infosSemaineISO(iso).num; }

// numéro, année et bornes lundi–dimanche de la semaine ISO contenant `iso`
function infosSemaineISO(iso) {
  const d = new Date(iso + 'T12:00:00');
  const jeudi = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  jeudi.setUTCDate(jeudi.getUTCDate() + 4 - (jeudi.getUTCDay() || 7));
  const an = new Date(Date.UTC(jeudi.getUTCFullYear(), 0, 1));
  const num = Math.ceil(((jeudi - an) / 86400000 + 1) / 7);
  const lundi = new Date(jeudi); lundi.setUTCDate(jeudi.getUTCDate() - 3);
  const dimanche = new Date(jeudi); dimanche.setUTCDate(jeudi.getUTCDate() + 3);
  return {
    annee: jeudi.getUTCFullYear(),
    num,
    debut: lundi.toISOString().slice(0, 10),
    fin: dimanche.toISOString().slice(0, 10)
  };
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Ted ---------- */

// Tout ce qui relève de la consigne de coach passe par Ted : jamais en corps
// de texte. Le reste de l'interface garde sa voix impersonnelle (des noms pour
// les libellés, des verbes à l'impératif pour les actions).
const TED_HUMEURS = ['neutre', 'content', 'fier', 'coach', 'compatissant', 'malicieux', 'fatigue'];
// l'humeur suit la note de la séance
const TED_NOTE = { excellent: 'fier', bon: 'content', attention: 'compatissant', reference: 'coach' };

function ted(texte, humeur, titre) {
  if (!texte) return '';
  const h = TED_HUMEURS.includes(humeur) ? humeur : 'coach';
  return `<div class="ted" data-humeur="${h}">
    <span class="ted__avatar"><img src="assets/hello-ted/ted/ted-${h}.png" alt="Ted, humeur ${h}"></span>
    <p class="ted__bulle">${titre ? `<b class="ted__titre">${esc(titre)}</b>` : ''}<span class="ted__texte">${esc(texte)}</span></p>
  </div>`;
}

// Ted parle court — 1 à 2 phrases. Les analyses du carnet sont bien plus
// longues : la bulle n'en montre que le début (trois lignes) et le reste
// s'ouvre en superposition. On mesure le débordement réel plutôt que de
// compter les caractères, pour que le repli suive la largeur disponible.
function replierBulles(racine) {
  (racine || document).querySelectorAll('.ted__texte').forEach((t) => {
    const deborde = t.scrollHeight - t.clientHeight > 2;
    const bulle = t.closest('.ted__bulle');
    bulle.classList.toggle('ted__bulle--repliable', deborde);
    const existant = bulle.querySelector('.ted__plus');
    if (deborde && !existant) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ted__plus';
      b.textContent = 'Lire la suite';
      bulle.appendChild(b);
    } else if (!deborde && existant) {
      existant.remove();
    }
  });
}

function ouvrirTed(bulle) {
  const bloc = bulle.closest('.ted');
  const titre = bulle.querySelector('.ted__titre');
  $('#ted-modale-titre').textContent = titre ? titre.textContent : 'Ted';
  $('#ted-modale-texte').textContent = bulle.querySelector('.ted__texte').textContent;
  const humeur = (bloc && bloc.dataset.humeur) || 'coach';
  $('#ted-modale-avatar').src = `assets/hello-ted/ted/ted-${humeur}.png`;
  $('#ted-modale-avatar').alt = `Ted, humeur ${humeur}`;
  $('#ted-modale').showModal();
}

function activerTed() {
  const modale = $('#ted-modale');
  document.addEventListener('click', (e) => {
    const bulle = e.target.closest('.ted__bulle--repliable');
    if (bulle) { ouvrirTed(bulle); return; }
    // clic sur le fond de la modale (le <dialog> occupe toute la fenêtre)
    if (e.target === modale) modale.close();
  });
  $('#ted-modale-fermer').addEventListener('click', () => modale.close());
  // la largeur change, le nombre de lignes aussi
  window.addEventListener('resize', () => replierBulles());
}

// glyphes pixelarticons repris tels quels du design system (MIT) —
// aucune icône n'est redessinée à la main dans ce projet
const GLYPHE = {
  'arrow-down': 'M13 12h6v2h-2v2h-2v2h-2v2h-2v-2H9v-2H7v-2H5v-2h6V4h2v8Z',
  play: 'M15 11h-2V9h2zm0 4h-2v-2h2zm-2 2h-2v-2h2zm0-8h-2V7h2zm-2-2H9V5h2zM9 21H7V3h2zm6-8h2v-2h-2zm-6 4h2v2H9z',
  check: 'M10 18H8v-2h2v2Zm-2-2H6v-2h2v2Zm4-2v2h-2v-2h2Zm-6 0H4v-2h2v2Zm8 0h-2v-2h2v2Zm2-2h-2v-2h2v2Zm2-2h-2V8h2v2Zm2-2h-2V6h2v2Z',
  'chevron-right': 'M16 13v-2h-2v2h2Zm-2-2V9h-2v2h2Zm0 4v-2h-2v2h2Zm-2-6V7h-2v2h2Zm0 8v-2h-2v2h2ZM10 7V5H8v2h2Zm0 12v-2H8v2h2Z'
};
const glyphe = (nom) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${GLYPHE[nom]}"/></svg>`;

// La rampe d'effort va du vert clair à l'orange soutenu : l'encre lit bien sur
// le bas de la rampe, la crème sur le haut. Règle de la charte — le texte posé
// sur une couleur de marque est soit encre, soit crème, jamais autre chose.
function texteSur(fond) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(fond).trim());
  if (!m) return 'var(--encre)';
  const n = parseInt(m[1], 16);
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255);
  return L > 0.38 ? 'var(--encre)' : 'var(--cream-50)';
}

/* ---------- État ---------- */

let A, P, S, R, ZONES;
let S_REALISE = [];
let S_COURSE_REALISEE = []; // séances réalisées porteuses de distance/temps/FC — exclut renfo et repos, qui n'ont pas ces champs
let SEM_LISTE = [], semaineIdx = 0;
const zoneDe = (fc) => ZONES.find((z) => fc >= z.min && fc < z.max) || ZONES[fc < ZONES[0].min ? 0 : ZONES.length - 1];

/* ---------- Chargement ---------- */

Promise.all([
  fetch('data/athlete.json').then((r) => r.json()),
  fetch('data/programme.json').then((r) => r.json()),
  fetch('data/seances.json').then((r) => r.json()),
  fetch('data/renforcement.json').then((r) => r.json())
]).then(([a, p, s, r]) => {
  A = a; P = p; S = s.seances; R = r; ZONES = a.zones;
  // journal unifié : passé et futur, course et renforcement — statut 'realise' ou 'prevu'
  S.sort((x, y) => x.date.localeCompare(y.date));
  S_REALISE = S.filter((x) => x.statut === 'realise');
  S_COURSE_REALISEE = S_REALISE.filter((x) => x.distance_km !== undefined);
  demarrer();
}).catch((e) => {
  console.error(e);
  $('#erreur').hidden = false;
});

function demarrer() {
  const blocActif = P.blocs.find((b) => aujourdhuiDans(b.debut, b.fin)) || P.blocs[0];
  document.documentElement.style.setProperty('--accent', blocActif.couleur);

  rendreTete();
  rendreRegle();
  rendreDiagnostic();
  rendreZones();
  rendreBlocs(blocActif);
  rendreJalons();
  rendreRenfo();
  activerNavSemaines();
  activerDetailSeance();
  rendreStats();

  $('#app').hidden = false;
  activerTed();
  activerOnglets();
}
function aujourdhuiDans(d, f) {
  const t = new Date().toISOString().slice(0, 10);
  return t >= d && t <= f;
}

/* ---------- Barre d'onglets basse ---------- */

const ONGLETS = ['accueil', 'programme', 'seances', 'stats'];

function activerOnglets() {
  const boutons = [...document.querySelectorAll('.tabbar__item')];
  if (!boutons.length) return;

  const depart = ONGLETS.includes(location.hash.slice(1)) ? location.hash.slice(1) : (localStorage.getItem('onglet') || 'accueil');

  const afficher = (id) => {
    ONGLETS.forEach((o) => {
      $('#onglet-' + o).hidden = o !== id;
    });
    boutons.forEach((b) => b.setAttribute('aria-selected', b.dataset.onglet === id));
    localStorage.setItem('onglet', id);
    // on rentre toujours sur la liste, jamais sur la dernière page détail ouverte
    if (id === 'seances') fermerDetail();
    // un onglet masqué mesure 0 : on ne peut replier ses bulles qu'une fois visible
    replierBulles();
  };

  boutons.forEach((b) => {
    b.addEventListener('click', () => {
      afficher(b.dataset.onglet);
      window.scrollTo(0, 0);
    });
  });

  afficher(depart);
}

/* ---------- Tête ---------- */

function rendreTete() {
  $('#tete-ville').textContent = A.ville;
  $('#tete-maj').textContent = dateFr(A.maj);
  $('#tete-sous').textContent = A.diagnostic.titre;

  const o10 = A.objectifs.find((o) => o.id === 'sub50');
  const cible = A.chronos_10km.find((c) => c.type === 'cible');
  const j = joursDepuis(cible.date);
  $('#compteur-10k').innerHTML =
    `<b>${j > 0 ? j : '—'}</b> jours avant la course <span class="compteur__date">${esc(o10.fenetre)}</span>`;
  $('#compteur-semi').innerHTML =
    `<b>${Math.round(joursDepuis('2027-06-13') / 7)}</b> semaines avant le semi Pégasus`;
}

/* ---------- Règle chrono ---------- */

const TYPE_CHRONO = { reference: 'Référence', course: 'Course', test: 'Test' };

// une mini-jauge par chrono plutôt qu'un seul axe partagé : sur mobile, du vrai
// texte HTML (jamais rétréci par un viewBox SVG) et aucune étiquette qui se chevauche,
// même quand deux chronos sont très proches en valeur.
function rendreRegle() {
  const MIN = 2880, MAX = 3360; // 48:00 (rapide) → 56:00 (lent)
  const pos = (t) => ((MAX - t) / (MAX - MIN)) * 100;

  const cible = A.chronos_10km.find((c) => c.type === 'cible');
  const posCible = pos(cible.temps_s);

  const lignes = A.chronos_10km
    .filter((c) => c.type !== 'cible')
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => {
      const couleur = c.type === 'course' ? 'var(--or)' : 'var(--encre)';
      return `<div class="regle-ligne">
        <div class="regle-ligne__tete">
          <span class="regle-ligne__date">${dateFr(c.date).toUpperCase()} · ${esc(TYPE_CHRONO[c.type] || c.type)}</span>
          <span class="regle-ligne__chrono">${chrono(c.temps_s)}<small class="regle-ligne__allure">${esc(c.allure)}</small></span>
        </div>
        <h4 class="regle-ligne__titre">${esc(c.libelle)}</h4>
        <div class="regle-ligne__jauge">
          <div class="regle-ligne__zone" style="width:${100 - posCible}%"></div>
          <div class="regle-ligne__cible" style="left:${posCible}%"></div>
          <div class="regle-ligne__point" style="left:${pos(c.temps_s)}%; --point-couleur:${couleur}"></div>
        </div>
        <p class="regle-ligne__note">${esc(c.note)}</p>
      </div>`;
    }).join('');

  $('#regle-chrono').innerHTML = `
    <div class="regle-objectif">
      <span class="regle-objectif__label">Objectif</span>
      <span class="regle-objectif__chrono">${chrono(cible.temps_s)}</span>
      <span class="regle-objectif__date">${dateFr(cible.date)}</span>
    </div>
    <div class="regle-lignes">${lignes}</div>
    <div class="regle-legende"><span>plus lent · 56:00</span><span>plus rapide · 48:00</span></div>
  `;
}

/* ---------- Diagnostic & zones ---------- */

function rendreDiagnostic() {
  $('#diag-titre').textContent = A.diagnostic.titre;
  $('#diag-corps').textContent = A.diagnostic.corps;
  $('#diag-leviers').innerHTML = A.diagnostic.leviers.map((l) => `<li>${esc(l)}</li>`).join('');
}

function rendreZones() {
  const MIN = 120, MAX = 190, W = 1000, H = 74;
  const x = (b) => ((b - MIN) / (MAX - MIN)) * (W - 20) + 10;
  let g = '';
  ZONES.forEach((z) => {
    const x1 = x(z.min), x2 = x(z.max);
    g += `<rect x="${x1}" y="14" width="${x2 - x1 - 2}" height="26" fill="${z.couleur}" stroke="var(--encre)" stroke-width="2"/>`;
    g += `<text class="zone-label" x="${(x1 + x2) / 2}" y="31" text-anchor="middle" fill="${texteSur(z.couleur)}">${z.id}</text>`;
    g += `<text class="zone-borne" x="${x1}" y="53" text-anchor="middle">${z.min}</text>`;
  });
  g += `<text class="zone-borne" x="${x(187)}" y="53" text-anchor="middle">187</text>`;
  const xp = x(A.physio.plafond_z2_pratique);
  g += `<line x1="${xp}" y1="6" x2="${xp}" y2="46" stroke="var(--encre)" stroke-width="2"/>`;
  g += `<text class="zone-borne" x="${xp}" y="68" text-anchor="middle" fill="var(--encre)">plafond de travail ${A.physio.plafond_z2_pratique} bpm</text>`;
  $('#zones-echelle').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Échelle des zones cardiaques de 120 à 190 battements par minute">${g}</svg>`;

  $('#zones-table').innerHTML = ZONES.map((z) => `<tr>
    <td><span class="z-pastille" style="background:${z.couleur};color:${texteSur(z.couleur)}">${z.id}</span></td>
    <td class="z-plage">${z.min}–${z.max}</td>
    <td>${esc(z.nom)}</td>
    <td class="z-role">${esc(z.role)}</td></tr>`).join('');

  $('#zones-note').textContent = A.physio.note_plafond;
}

/* ---------- Blocs ---------- */

function rendreBlocs(actif) {
  $('#blocs').innerHTML = P.blocs.map((b) => `
    <article class="bloc${b.id === actif.id ? ' bloc--actif' : ''}">
      <div class="bloc__dates">${dateFr(b.debut, true)}<br>→ ${dateFr(b.fin, true)} ${b.fin.slice(0, 4)}</div>
      <div>
        <div class="bloc__barre" style="background:${b.couleur}"></div>
        <h3 class="bloc__nom">${esc(b.nom)}<span class="bloc__zone" style="background:${b.couleur};color:${texteSur(b.couleur)}">${esc(b.zone_dominante)}</span>${b.id === actif.id ? '<span class="badge-actif">en cours</span>' : ''}</h3>
        <p class="bloc__intention">${esc(b.intention)}</p>
        <p class="bloc__cle"><span>séance clé</span>${esc(b.sortie_cle)}</p>
      </div>
    </article>`).join('');
}

/* ---------- Jalons ---------- */

function rendreJalons() {
  const auj = new Date().toISOString().slice(0, 10);
  $('#jalons').innerHTML = P.jalons.map((j) => {
    const passe = j.date < auj;
    return `<div class="jalon ${passe ? 'jalon--passe' : 'jalon--avenir'}">
      <div class="jalon__marque"></div>
      <div class="jalon__corps">
        <div class="jalon__date">${dateFr(j.date)}${passe ? '' : `<span class="jalon__compte">J-${joursDepuis(j.date)}</span>`}</div>
        <h4 class="jalon__libelle">${esc(j.libelle)}</h4>
        <p class="jalon__detail">${esc(j.detail)}</p>
      </div>
    </div>`;
  }).join('');
}

/* ---------- Semaines ---------- */

const ETAT = { termine: 'terminée', en_cours: 'en cours', a_venir: 'à venir' };
// la note de la séance se lit sur un badge, plus sur un liseré de bordure
const NOTE = { excellent: 'excellent', bon: 'bon', attention: 'attention', reference: 'référence' };

/* ---------- Renforcement — ressources générales (les exercices vivent dans les cartes de séance) ---------- */

function rendreRenfo() {
  if (!R) return;
  $('#renfo-intro').textContent = R.intro;
  $('#renfo-avertissement').textContent = R.avertissement;
  $('#renfo-principe').textContent = R.principe;

  $('#renfo-ressources').innerHTML = `<div class="renfo-ress">${R.ressources.map((r) => `
    <a class="ress" href="${esc(r.url)}" target="_blank" rel="noopener">
      <span class="ress__src">${esc(r.source)} · ${esc(r.duree)}</span>
      <span class="ress__titre">${esc(r.titre)}</span>
      <span class="ress__note">${esc(r.note)}</span>
    </a>`).join('')}</div>`;
}

// exercices d'un bloc de renforcement, pour la carte de séance correspondante
function blocRenfo(id) {
  return R && R.blocs.find((b) => b.id === id);
}

// dose_seance.series écrase le nombre de séries de la dose du bloc — seul ce
// nombre change, répétitions/durées/côtés (« par jambe », « 45 s par pied »)
// restent ceux du bloc
function doseAvecSeries(dose, series) {
  return dose.replace(/^\d+/, series);
}

/* ---------- Séances ---------- */

function bandeFC(s) {
  const MIN = 115, MAX = 190, W = 1000, H = 56;
  const x = (b) => ((b - MIN) / (MAX - MIN)) * (W - 20) + 10;
  let g = '';
  ZONES.forEach((z) => {
    g += `<rect x="${x(z.min)}" y="20" width="${x(z.max) - x(z.min) - 1.5}" height="14" fill="color-mix(in srgb, ${z.couleur} 35%, var(--page))"/>`;
    g += `<text class="bande-txt" x="${(x(z.min) + x(z.max)) / 2}" y="47" text-anchor="middle">${z.id}</text>`;
  });

  const fcs = (s.splits || []).map((k) => k.fc_moy).filter(Boolean);
  const bas = fcs.length ? Math.min(...fcs) : s.fc_moy;
  g += `<rect x="${x(bas)}" y="22" width="${Math.max(x(s.fc_max) - x(bas), 2)}" height="10" fill="var(--ink-200)"/>`;

  const xp = x(A.physio.plafond_z2_pratique);
  g += `<line x1="${xp}" y1="12" x2="${xp}" y2="38" stroke="var(--encre)" stroke-width="1.5" stroke-dasharray="3 2.5"/>`;
  g += `<text class="bande-txt" x="${xp}" y="9" text-anchor="middle" fill="var(--encre)">155</text>`;

  const zm = zoneDe(s.fc_moy);
  g += `<rect x="${x(s.fc_moy) - 7}" y="20" width="14" height="14" fill="${zm.couleur}" stroke="var(--encre)" stroke-width="2"/>`;
  g += `<text class="bande-val" x="${x(s.fc_moy)}" y="12" text-anchor="middle">${s.fc_moy} moy</text>`;
  g += `<line x1="${x(s.fc_max)}" y1="18" x2="${x(s.fc_max)}" y2="36" stroke="var(--encre)" stroke-width="2"/>`;
  g += `<text class="bande-txt" x="${x(s.fc_max)}" y="12" text-anchor="middle" fill="var(--encre-douce)">${s.fc_max} max</text>`;

  return `<div class="bande"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Fréquence cardiaque moyenne ${s.fc_moy}, maximale ${s.fc_max}, sur l'échelle des zones">${g}</svg></div>`;
}

// une carte par séance du journal, dans la liste hebdo — compacte, jamais
// d'accordéon : elle ouvre la page détail (voir detailSeance)
function carteSeance(s) {
  return s.statut === 'realise' ? carteListeRealisee(s) : carteListePrevue(s);
}

// ce que montre une séance à venir sous le titre, quand elle n'est pas
// encore réalisée : le créneau pour une course, créneau + durée pour un renfo
function seanceSousInfo(s) {
  if (s.type !== 'renfo') return s.creneau || '';
  const duree = s.cible && s.cible.duree_min ? `${s.cible.duree_min} min` : '';
  return [s.creneau, duree].filter(Boolean).join(' · ');
}

function carteListePrevue(s) {
  const sousInfo = seanceSousInfo(s);
  return `<button type="button" class="seance seance--prevue seance--nav" data-date="${s.date}" data-type="${s.type}">
    <div class="seance__tete">
      <div class="seance__ident">
        <div class="seance__jour">${esc(jourCourt(s.date))}<span class="seance__semaine">S${numSemaine(s.date)}</span></div>
        <div class="seance__titre">${esc(s.titre)}</div>
      </div>
      ${sousInfo ? `<div class="seance__date">${esc(sousInfo)}</div>` : ''}
    </div>
    <span class="seance__nav" aria-hidden="true">${glyphe('chevron-right')}</span>
  </button>`;
}

function carteListeRealisee(s) {
  return `<button type="button" class="seance seance--realisee seance--nav" data-date="${s.date}" data-type="${s.type}">
    <span class="seance__check" aria-hidden="true">${glyphe('check')}</span>
    <span class="seance__resume-jour">${esc(jourCourt(s.date))}</span>
    <span class="seance__resume-titre">${esc(s.titre)}</span>
    ${s.analyse ? `<span class="seance__note seance__note--${esc(s.analyse.note)}">${esc(NOTE[s.analyse.note] || s.analyse.note)}</span>` : ''}
    <span class="seance__nav" aria-hidden="true">${glyphe('chevron-right')}</span>
  </button>`;
}

/* ---------- Page détail d'une séance ---------- */

// le rendu complet dépend du statut et du type — c'est exactement ce que
// montrait l'accordéon avant, mais sur sa propre page
function detailSeance(s) {
  if (s.type === 'renfo') return detailRenfo(s);
  if (s.type === 'repos') return detailCoursePrevue(s);
  return s.statut === 'realise' ? detailCourseRealisee(s) : detailCoursePrevue(s);
}

function detailCoursePrevue(s) {
  const { puces, structure } = formaterCible(s.cible);
  return `<div class="seance__tete">
      <div class="seance__ident">
        <div class="seance__jour">${esc(jourCourt(s.date))}<span class="seance__semaine">S${numSemaine(s.date)}</span></div>
        <h2 class="seance__titre">${esc(s.titre)}</h2>
      </div>
      ${s.creneau ? `<div class="seance__date">${esc(s.creneau)}</div>` : ''}
    </div>
    <div class="seance__meta">${dateFr(s.date)} · S${numSemaine(s.date)}</div>
    ${ted(s.consigne, 'coach')}
    ${s.lieu ? `<p class="seance__lieu">${esc(s.lieu)}</p>` : ''}
    ${puces.length ? `<div class="cible-puces">${puces.map((p) => `<span class="cible-puce">${esc(p)}</span>`).join('')}</div>` : ''}
    ${structure ? `<p class="seance__structure">${esc(structure)}</p>` : ''}
    <a class="seance__montre" data-date="${s.date}" data-type="${s.type}" hidden>${glyphe('arrow-down')}Envoyer sur la montre</a>`;
}

function detailCourseRealisee(s) {
  const cc = coutCardiaque(s.fc_moy, s.temps_s, s.distance_km);
  const splits = (s.splits || []).map((k) => {
    if (k.libelle) {
      return `<div class="split"><div class="split__k">${esc(k.libelle)}</div>
        <div class="split__a">${chrono(k.temps_s)}</div>
        <div class="split__f" style="background:${zoneDe(k.fc_moy).couleur};color:${texteSur(zoneDe(k.fc_moy).couleur)}">${k.fc_moy}</div></div>`;
    }
    const d = k.dist_km || 1;
    return `<div class="split${k.dist_km ? ' split--partiel' : ''}"><div class="split__k">KM ${k.km}${k.dist_km ? ` · ${Math.round(d * 1000)} m` : ''}</div>
      <div class="split__a">${allureStr(k.temps_s, d)}</div>
      <div class="split__f" style="background:${zoneDe(k.fc_moy).couleur};color:${texteSur(zoneDe(k.fc_moy).couleur)}">${k.fc_moy}</div></div>`;
  }).join('');

  return `<div class="seance__tete">
      <div class="seance__ident">
        <div class="seance__jour">${esc(jourCourt(s.date))}<span class="seance__semaine">S${numSemaine(s.date)}</span></div>
        <h2 class="seance__titre">${esc(s.titre)}</h2>
      </div>
      <span class="seance__note seance__note--${esc(s.analyse.note)}">${esc(NOTE[s.analyse.note] || s.analyse.note)}</span>
    </div>
    <div class="seance__meta">${dateFr(s.date)} · S${numSemaine(s.date)}</div>
    <p class="seance__lieu">${esc(s.lieu)}${s.conditions ? ` · ${esc(s.conditions)}` : ''}</p>

    <div class="chiffres">
      <div class="chiffre"><span class="chiffre__v">${s.distance_km.toFixed(2).replace('.', ',')}<span class="chiffre__u">km</span></span><span class="chiffre__l">Distance</span></div>
      <div class="chiffre"><span class="chiffre__v">${chrono(s.temps_s)}</span><span class="chiffre__l">Durée</span></div>
      <div class="chiffre"><span class="chiffre__v">${allureStr(s.temps_s, s.distance_km)}<span class="chiffre__u">/km</span></span><span class="chiffre__l">Allure</span></div>
      <div class="chiffre"><span class="chiffre__v">${s.fc_moy}<span class="chiffre__u">bpm</span></span><span class="chiffre__l">FC moyenne</span></div>
      <div class="chiffre chiffre--phare"><span class="chiffre__v">${Math.round(cc)}<span class="chiffre__u">b/km</span></span><span class="chiffre__l">Coût cardiaque</span></div>
      <div class="chiffre"><span class="chiffre__v">${s.cadence_spm}<span class="chiffre__u">ppm</span></span><span class="chiffre__l">Cadence</span></div>
      <div class="chiffre"><span class="chiffre__v">${s.effort_relatif}</span><span class="chiffre__l">Effort relatif</span></div>
    </div>

    ${bandeFC(s)}
    <div class="splits">${splits}</div>
    ${s.commentaire_athlete ? `<p class="citation">« ${esc(s.commentaire_athlete)} »</p>` : ''}

    <div class="analyse">
      <p class="analyse__verdict">${esc(s.analyse.verdict)}</p>
      <p class="analyse__corps">${esc(s.analyse.corps)}</p>
      ${ted(s.analyse.a_retenir, TED_NOTE[s.analyse.note], 'À retenir')}
    </div>`;
}

// n'affiche que les clés de `cible` réellement présentes — elles varient selon le type de séance
function formaterCible(c) {
  if (!c) return { puces: [], structure: '' };
  const puces = [];
  if (c.duree_min) puces.push(`${c.duree_min} min`);
  if (c.distance_km) puces.push(`≈ ${String(c.distance_km).replace('.', ',')} km`);
  if (c.allure) puces.push(`${c.allure}/km`);
  if (c.fc_min && c.fc_max) puces.push(`FC ${c.fc_min}–${c.fc_max}`);
  else if (c.fc_max) puces.push(`FC ≤ ${c.fc_max}`);
  else if (c.fc_min) puces.push(`FC ≥ ${c.fc_min}`);
  if (c.temps_au_seuil_min) puces.push(`${c.temps_au_seuil_min} min au seuil`);
  if (c.distance_test_m) puces.push(String(c.distance_test_m));
  return { puces, structure: c.structure || '' };
}

// les .fit sont stockés en base64 dans /workouts (AAAA-MM-JJ-<type>.fit.b64,
// voir workouts/README.md — le MCP GitHub ne transporte pas de binaire).
// on ne montre le bouton que si le fichier correspondant existe, et on
// décode le .fit à la volée pour proposer un vrai téléchargement binaire.
function verifierWorkoutsMontre() {
  document.querySelectorAll('.seance__montre[data-date]').forEach((a) => {
    const chemin = `workouts/${a.dataset.date}-${a.dataset.type}.fit.b64`;
    fetch(chemin)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((b64) => {
        const bin = atob(b64.replace(/\s+/g, ''));
        const octets = Uint8Array.from(bin, (c) => c.charCodeAt(0));
        a.href = URL.createObjectURL(new Blob([octets], { type: 'application/octet-stream' }));
        a.download = `${a.dataset.date}-${a.dataset.type}.fit`;
        a.hidden = false;
      })
      .catch(() => {});
  });
}

// une séance de renforcement, réalisée ou à venir : les exercices du bloc
// correspondant, contrôle/erreur repliés exercice par exercice
function detailRenfo(s) {
  const bloc = blocRenfo(s.bloc_renfo);
  const duree = s.cible && s.cible.duree_min ? `${s.cible.duree_min} min` : '';
  const droite = [s.creneau, duree].filter(Boolean).join(' · ');
  const doseSeance = s.dose_seance;

  const noteDose = doseSeance && doseSeance.note
    ? `<p class="dose-modulee"><b class="dose-modulee__badge">Dose modulée</b>${esc(doseSeance.note)}</p>` : '';

  const exos = bloc ? `<div class="exos">${bloc.exercices.map((e) => `
      <article class="exo">
        <h4 class="exo__nom">${esc(e.nom)}</h4>
        <p class="exo__dose${doseSeance ? ' exo__dose--modulee' : ''}">${esc(doseSeance ? doseAvecSeries(e.dose, doseSeance.series) : e.dose)}</p>
        ${e.video ? `<a class="exo__video" href="${esc(e.video)}" target="_blank" rel="noopener">${glyphe('play')}${esc(e.video_titre || 'Vidéo de l’exercice')}</a>` : ''}
        <details class="exo__repli">
          <summary>Point de contrôle &amp; erreur fréquente</summary>
          <p class="exo__role">${esc(e.role)}</p>
          <p class="exo__controle"><b>Point de contrôle</b>${esc(e.controle)}</p>
          <p class="exo__erreur"><b>Erreur fréquente</b>${esc(e.erreur)}</p>
        </details>
      </article>`).join('')}</div>` : `<p class="note">Bloc de renforcement « ${esc(s.bloc_renfo || '?')} » introuvable dans le référentiel.</p>`;

  return `<div class="seance__tete">
      <div class="seance__ident">
        <div class="seance__jour">${esc(jourCourt(s.date))}<span class="seance__semaine">S${numSemaine(s.date)}</span></div>
        <h2 class="seance__titre">${esc(s.titre)}</h2>
      </div>
      ${s.statut !== 'realise' && droite ? `<div class="seance__date">${esc(droite)}</div>` : ''}
    </div>
    <div class="seance__meta">${dateFr(s.date)} · S${numSemaine(s.date)}</div>
    ${ted(s.consigne, 'coach')}
    ${noteDose}
    ${exos}`;
}

/* ---------- Séances — navigation semaine par semaine ---------- */

// fusionne les semaines du programme avec les semaines "hors programme"
// (séances réelles antérieures au début du plan, ex. courses de référence)
function construireSemaines() {
  const map = new Map();

  P.semaines.forEach((w) => map.set('p' + w.num, {
    num: w.num, debut: w.debut, fin: w.fin,
    titre: w.titre, objectif: w.objectif, statut: w.statut, programme: true
  }));

  S.forEach((s) => {
    if (P.semaines.some((w) => s.date >= w.debut && s.date <= w.fin)) return;
    const info = infosSemaineISO(s.date);
    const cle = 'h' + info.annee + '-' + info.num;
    if (!map.has(cle)) map.set(cle, {
      num: info.num, debut: info.debut, fin: info.fin,
      titre: '', objectif: '', statut: null, programme: false
    });
  });

  SEM_LISTE = [...map.values()].sort((a, b) => a.debut.localeCompare(b.debut));
}

function semaineParDefaut() {
  let i = SEM_LISTE.findIndex((w) => w.statut === 'en_cours');
  if (i !== -1) return i;

  const auj = new Date().toISOString().slice(0, 10);
  i = SEM_LISTE.findIndex((w) => auj >= w.debut && auj <= w.fin);
  if (i !== -1) return i;

  for (let k = SEM_LISTE.length - 1; k >= 0; k--) {
    if (S.some((s) => s.date >= SEM_LISTE[k].debut && s.date <= SEM_LISTE[k].fin)) return k;
  }
  return SEM_LISTE.length - 1;
}

function activerNavSemaines() {
  construireSemaines();
  semaineIdx = semaineParDefaut();

  $('#semnav-prev').addEventListener('click', () => rendreSeances(semaineIdx - 1));
  $('#semnav-next').addEventListener('click', () => rendreSeances(semaineIdx + 1));

  rendreSeances(semaineIdx);
}

function rendreSeances(idx) {
  semaineIdx = Math.max(0, Math.min(idx, SEM_LISTE.length - 1));
  const sem = SEM_LISTE[semaineIdx];
  const planSemaine = sem.programme ? P.semaines.find((w) => w.num === sem.num) : null;

  $('#sem-tete').hidden = !sem.programme;
  $('#sem-badge').hidden = !sem.programme;
  if (sem.programme) {
    $('#sem-badge').textContent = ETAT[sem.statut];
    $('#sem-badge').className = 'sem-tete__badge sem-tete__badge--' + sem.statut;
    $('#sem-titre').textContent = sem.titre;
    $('#sem-objectif').textContent = sem.objectif;
    $('#sem-bilan').hidden = !planSemaine.bilan;
    $('#sem-bilan').innerHTML = ted(planSemaine.bilan, 'content', 'Bilan');
  }

  // journal unifié de la semaine : les séances à venir d'abord (la prochaine
  // en tête), les séances réalisées repliées ensuite — chaque groupe dans
  // l'ordre chronologique
  const parStatut = S.filter((s) => s.date >= sem.debut && s.date <= sem.fin)
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce((acc, s) => { acc[s.statut === 'realise' ? 1 : 0].push(s); return acc; }, [[], []]);
  const liste = [...parStatut[0], ...parStatut[1]];

  $('#seances').innerHTML = liste.length
    ? liste.map(carteSeance).join('')
    : '<p class="seances-vide">Aucune séance enregistrée pour cette semaine.</p>';
  replierBulles();

  $('#semnav-num').textContent = 'Semaine ' + sem.num;
  $('#semnav-dates').textContent = `${dateFr(sem.debut, true)} – ${dateFr(sem.fin, true)}`;
  $('#semnav-prev').disabled = semaineIdx === 0;
  $('#semnav-next').disabled = semaineIdx === SEM_LISTE.length - 1;

  if (!$('#onglet-seances').hidden) window.scrollTo(0, 0);
}

/* ---------- Séances — page détail ---------- */

// tape une carte de la liste, arrive sur sa page détail ; la flèche du haut
// ramène à la liste — jamais d'accordéon pour l'analyse d'une séance
function ouvrirDetail(date, type) {
  const s = S.find((x) => x.date === date && x.type === type);
  if (!s) return;
  const corps = $('#detail-corps');
  corps.className = 'detail-carte' + (s.statut === 'realise' ? '' : ' detail-carte--prevue');
  corps.innerHTML = detailSeance(s);
  verifierWorkoutsMontre();
  $('#seances-liste').hidden = true;
  $('#semnav').hidden = true;
  $('#seance-detail').hidden = false;
  window.scrollTo(0, 0);
}

function fermerDetail() {
  $('#seance-detail').hidden = true;
  $('#seances-liste').hidden = false;
  $('#semnav').hidden = false;
  window.scrollTo(0, 0);
}

function activerDetailSeance() {
  $('#seances').addEventListener('click', (e) => {
    const carte = e.target.closest('.seance--nav');
    if (!carte) return;
    ouvrirDetail(carte.dataset.date, carte.dataset.type);
  });
  $('#detail-retour').addEventListener('click', fermerDetail);
}

/* ---------- Statistiques ---------- */

function rendreStats() {
  const depuisReprise = S_COURSE_REALISEE.filter((s) => s.date >= '2026-08-01');
  const kmTot = depuisReprise.reduce((a, s) => a + s.distance_km, 0);
  const tempsTot = depuisReprise.reduce((a, s) => a + s.temps_s, 0);
  const z2 = depuisReprise.filter((s) => s.fc_max <= A.physio.plafond_z2_pratique);
  const meilleurCC = Math.min(...S_COURSE_REALISEE.map((s) => coutCardiaque(s.fc_moy, s.temps_s, s.distance_km)));

  const stats = [
    { v: kmTot.toFixed(1).replace('.', ','), u: 'km', l: 'Depuis la reprise' },
    { v: depuisReprise.length, u: '', l: 'Séances en août' },
    { v: chrono(tempsTot), u: '', l: 'Temps de course' },
    { v: Math.round(100 * z2.length / depuisReprise.length), u: '%', l: 'Séances jamais au-dessus de 155' },
    { v: Math.round(meilleurCC), u: 'b/km', l: 'Meilleur coût cardiaque' },
    { v: Math.round(depuisReprise.reduce((a, s) => a + s.effort_relatif, 0)), u: '', l: 'Effort relatif cumulé' }
  ];
  $('#stats-cles').innerHTML = stats.map((s) =>
    `<div class="stat"><div class="stat__v">${s.v}${s.u ? `<span class="stat__u">${s.u}</span>` : ''}</div><div class="stat__l">${s.l}</div></div>`).join('');

  grapheVolume();
  grapheCout();
  grapheNuage();
}

function grapheVolume() {
  const parSem = {};
  S_COURSE_REALISEE.filter((s) => s.date >= '2026-08-01').forEach((s) => {
    const n = numSemaine(s.date);
    parSem[n] = (parSem[n] || 0) + s.distance_km;
  });
  const sems = P.semaines.filter((s) => s.num >= 32 && s.num <= 40);
  const max = Math.max(...sems.map((s) => s.volume_cible_km), ...Object.values(parSem)) * 1.12;

  const W = 1000, H = 220, bas = H - 34, g0 = 34;
  const bw = (W - g0 - 10) / sems.length;
  let g = `<line class="g-axe" x1="${g0}" y1="${bas}" x2="${W - 10}" y2="${bas}"/>`;
  [0, 10, 20, 30].forEach((v) => {
    const y = bas - (v / max) * (bas - 12);
    g += `<line class="g-axe" x1="${g0}" y1="${y}" x2="${W - 10}" y2="${y}" opacity="0.5"/>`;
    g += `<text class="g-txt" x="${g0 - 6}" y="${y + 3}" text-anchor="end">${v}</text>`;
  });

  sems.forEach((s, i) => {
    const x = g0 + i * bw + bw * 0.18, w = bw * 0.64;
    const hc = (s.volume_cible_km / max) * (bas - 12);
    g += `<rect class="g-barre" x="${x}" y="${bas - hc}" width="${w}" height="${hc}"/>`;
    const fait = parSem[s.num];
    if (fait) {
      const hf = (fait / max) * (bas - 12);
      g += `<rect class="g-barre--fait" x="${x}" y="${bas - hf}" width="${w}" height="${hf}"/>`;
      g += `<text class="g-val" x="${x + w / 2}" y="${bas - hf - 6}" text-anchor="middle">${fait.toFixed(1).replace('.', ',')}</text>`;
    }
    g += `<text class="g-txt" x="${x + w / 2}" y="${bas + 14}" text-anchor="middle">S${s.num}</text>`;
    g += `<text class="g-txt" x="${x + w / 2}" y="${bas + 25}" text-anchor="middle" opacity="0.7">${dateFr(s.debut, true)}</text>`;
  });
  g += `<rect class="g-barre--fait" x="${g0}" y="4" width="9" height="9"/><text class="g-txt" x="${g0 + 14}" y="12">réalisé</text>`;
  g += `<rect class="g-barre" x="${g0 + 66}" y="4" width="9" height="9"/><text class="g-txt" x="${g0 + 80}" y="12">cible</text>`;

  $('#graphe-volume').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Volume hebdomadaire réalisé contre cible, en kilomètres">${g}</svg>`;
}

function grapheCout() {
  const pts = S_COURSE_REALISEE.map((s) => ({ d: s.date, v: coutCardiaque(s.fc_moy, s.temps_s, s.distance_km), t: s.type }));
  const W = 1000, H = 230, bas = H - 34, g0 = 46;
  const vmin = 850, vmax = Math.max(...pts.map((p) => p.v)) * 1.03;
  const x = (i) => g0 + (i / (pts.length - 1)) * (W - g0 - 20);
  const y = (v) => bas - ((v - vmin) / (vmax - vmin)) * (bas - 16);

  let g = '';
  [900, 1000, 1100].forEach((v) => {
    if (v > vmax) return;
    g += `<line class="g-axe" x1="${g0}" y1="${y(v)}" x2="${W - 20}" y2="${y(v)}" opacity="0.5"/>`;
    g += `<text class="g-txt" x="${g0 - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
  });
  g += `<line class="g-axe" x1="${g0}" y1="${bas}" x2="${W - 20}" y2="${bas}"/>`;
  g += `<path class="g-ligne" d="${pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.v)}`).join(' ')}"/>`;

  pts.forEach((p, i) => {
    const meilleur = p.v === Math.min(...pts.map((q) => q.v));
    g += `<rect x="${x(i) - (meilleur ? 6 : 4)}" y="${y(p.v) - (meilleur ? 6 : 4)}" width="${meilleur ? 12 : 8}" height="${meilleur ? 12 : 8}" fill="${meilleur ? 'var(--accent)' : 'var(--page)'}" stroke="var(--encre)" stroke-width="2"/>`;
    g += `<text class="g-val" x="${x(i)}" y="${y(p.v) - 12}" text-anchor="middle">${Math.round(p.v)}</text>`;
    g += `<text class="g-txt" x="${x(i)}" y="${bas + 15}" text-anchor="middle">${dateFr(p.d, true)}</text>`;
  });
  $('#graphe-cout').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution du coût cardiaque en battements par kilomètre">${g}</svg>`;
}

function grapheNuage() {
  const pts = S_COURSE_REALISEE.map((s) => ({ x: allureSec(s.temps_s, s.distance_km), y: s.fc_moy, d: s.date, t: s.type }));
  const W = 1000, H = 300, bas = H - 34, g0 = 46;
  const xmin = 280, xmax = 460, ymin = 130, ymax = 185;
  const px = (v) => g0 + ((v - xmin) / (xmax - xmin)) * (W - g0 - 24);
  const py = (v) => bas - ((v - ymin) / (ymax - ymin)) * (bas - 16);

  let g = '';
  ZONES.forEach((z) => {
    if (z.max < ymin || z.min > ymax) return;
    const y1 = py(Math.min(z.max, ymax)), y2 = py(Math.max(z.min, ymin));
    g += `<rect x="${g0}" y="${y1}" width="${W - g0 - 24}" height="${y2 - y1}" fill="color-mix(in srgb, ${z.couleur} 14%, var(--page))"/>`;
    g += `<text class="g-txt" x="${W - 28}" y="${(y1 + y2) / 2 + 3}" text-anchor="end" fill="${z.couleur}">${z.id}</text>`;
  });
  const yp = py(A.physio.plafond_z2_pratique);
  g += `<line x1="${g0}" y1="${yp}" x2="${W - 24}" y2="${yp}" stroke="var(--encre)" stroke-width="1.2" stroke-dasharray="4 3"/>`;
  g += `<text class="g-txt" x="${g0 + 4}" y="${yp - 5}" fill="var(--encre)">plafond 155 bpm</text>`;

  for (let a = 300; a <= 440; a += 20) {
    g += `<line class="g-axe" x1="${px(a)}" y1="16" x2="${px(a)}" y2="${bas}" opacity="0.4"/>`;
    g += `<text class="g-txt" x="${px(a)}" y="${bas + 15}" text-anchor="middle">${allureStr(a, 1)}</text>`;
  }
  [140, 150, 160, 170, 180].forEach((v) => {
    g += `<text class="g-txt" x="${g0 - 6}" y="${py(v) + 3}" text-anchor="end">${v}</text>`;
  });
  g += `<line class="g-axe" x1="${g0}" y1="${bas}" x2="${W - 24}" y2="${bas}"/>`;
  g += `<text class="g-txt" x="${W - 24}" y="${bas + 28}" text-anchor="end">allure moyenne · min/km</text>`;

  pts.forEach((p) => {
    const col = p.t === 'course' ? 'var(--or)' : zoneDe(p.y).couleur;
    g += `<rect x="${px(p.x) - 6}" y="${py(p.y) - 6}" width="12" height="12" fill="${col}" stroke="var(--encre)" stroke-width="2"/>`;
    g += `<text class="g-txt" x="${px(p.x)}" y="${py(p.y) - 11}" text-anchor="middle" fill="var(--encre-douce)">${dateFr(p.d, true)}</text>`;
  });
  $('#graphe-nuage').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Nuage de points allure contre fréquence cardiaque moyenne par séance">${g}</svg>`;
}
