/**
 * Capucine's CV as a parameterized HTML template.
 * Gemini only returns JSON overrides — the design never changes.
 *
 * IMPORTANT: This template reproduces the EXACT layout of the original PDF CV.
 * The oval featured job, curved traits around photo, large formations, etc.
 * must match pixel-perfectly.
 */

export interface CvData {
  name: string;
  age: string;
  license: string;
  degree: string;
  phone: string;
  email: string;
  photoUrl: string;
  traits: [string, string]; // Two personality traits shown curved around the photo
  formations: Array<{
    label: string; // e.g. "Master 2 INSEEC 2023"
    title: string; // e.g. "Management de projet et ingénierie commerciale"
  }>;
  featuredJob: {
    company: string;
    role: string;
    period: string;
    tasks: string[];
  };
  experiences: Array<{
    company: string; // e.g. "Optilia 2021 à 2023"
    role: string; // e.g. "Chargée de développement commercial"
    subtitle?: string; // e.g. "Encadrement d'un commercial"
  }>;
}

export const DEFAULT_CV_DATA: CvData = {
  name: "Capucine Busch",
  age: "25 ans",
  license: "Permis B",
  degree: "Bac + 5",
  phone: "07 67 83 78 05",
  email: "capucine.busch@hotmail.fr",
  photoUrl: "/cv-photo.jpg",
  traits: ["Empathique", "Performante"],
  formations: [
    { label: "Master 2 INSEEC 2023", title: "Management de projet et ingénierie commerciale" },
    { label: "Master 1 INSEEC", title: "Management commercial" },
    { label: "Bachelor INSEEC 2021", title: "Marketing et développement" },
    { label: "BTS Sup de Pub 2020", title: "Communication" },
  ],
  featuredJob: {
    company: "JCDecaux",
    role: "Cheffe de publicité 360°",
    period: "Août 2023 – Toujours en poste",
    tasks: [
      "Gestion portefeuille client",
      "Cycle de vente",
      "Relation client",
      "Négociation",
      "Développement de l'activité",
      "Identification enjeux clients",
    ],
  },
  experiences: [
    { company: "Optilia 2021 à 2023", role: "Chargée de développement commercial", subtitle: "Encadrement d'un commercial" },
    { company: "Babac'cool 2020", role: "Community manager" },
    { company: "20 Minutes 2019", role: "Assistante commerciale" },
    { company: "Suez 2018", role: "Assistante communication" },
    { company: "Calzedonia 2020", role: "Conseillère de vente" },
  ],
};

export function renderCvHtml(data: CvData): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const formationsHtml = data.formations
    .map(
      (f) => `
        <div class="formation-item">
          <div class="formation-label">${esc(f.label)}</div>
          <div class="formation-title">${esc(f.title)}</div>
        </div>`
    )
    .join("");

  const tasksHtml = data.featuredJob.tasks.map((t) => esc(t)).join("<br>\n            ");

  const experiencesHtml = data.experiences
    .map(
      (e) => `
        <div class="experience-item">
          <div class="exp-company">${esc(e.company)}</div>
          <div class="exp-role">${esc(e.role)}${e.subtitle ? "<br>" + esc(e.subtitle) : ""}</div>
        </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CV ${esc(data.name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4 portrait; margin: 0; }

  body {
    font-family: 'Montserrat', 'Segoe UI', sans-serif;
    background: #fff;
    display: flex;
    justify-content: center;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .cv-page {
    width: 794px;
    height: 1123px;
    background: #E8A09E;
    position: relative;
    overflow: hidden;
    color: #1A5C5C;
    border: 6px solid #1A5C5C;
  }

  /* ===== TOP BAR ===== */
  .top-bar {
    height: 18px;
    background: #1A5C5C;
    width: 100%;
  }

  .cv-content {
    padding: 8px 28px 14px;
    height: calc(100% - 18px);
    display: flex;
    flex-direction: column;
  }

  /* ===== NAME ===== */
  .cv-name {
    text-align: center;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 52px;
    font-weight: 700;
    letter-spacing: 0.22em;
    color: #1A5C5C;
    text-transform: uppercase;
    margin-bottom: 4px;
    line-height: 1.1;
  }

  /* ===== INFO BAR ===== */
  .cv-info-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding: 0 10px;
  }
  .cv-info-item {
    font-size: 20px;
    font-style: italic;
    font-weight: 500;
    color: #1A5C5C;
  }
  .info-line {
    flex: 1;
    height: 2px;
    background: #1A5C5C;
    margin: 0 16px;
  }

  /* ===== MAIN GRID ===== */
  .cv-grid {
    display: grid;
    grid-template-columns: 46% 54%;
    gap: 0;
    flex: 1;
    min-height: 0;
  }

  /* ===== LEFT COLUMN ===== */
  .col-left {
    display: flex;
    flex-direction: column;
    padding-right: 10px;
  }

  /* Formations */
  .section-formation {
    margin-bottom: 0;
  }
  .formation-item {
    margin-bottom: 6px;
    padding-bottom: 6px;
    border-bottom: 1.5px solid rgba(26, 92, 92, 0.25);
  }
  .formation-item:last-child {
    border-bottom: none;
  }
  .formation-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.20em;
    text-transform: uppercase;
    color: #1A5C5C;
    margin-bottom: 2px;
  }
  .formation-title {
    font-size: 20px;
    font-weight: 700;
    color: #1A5C5C;
    line-height: 1.15;
  }

  /* Spacer */
  .left-spacer { flex: 0.3; }

  /* ===== FEATURED JOB (vertical oval shape like original PDF) ===== */
  .featured-job {
    background: #1F5F6B;
    color: #fff;
    border-radius: 50%;
    width: 290px;
    height: 340px;
    padding: 40px 32px 34px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    align-self: center;
    margin-left: -10px;
    flex-shrink: 0;
  }
  .featured-job .fj-company {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.20em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.85);
    margin-bottom: 2px;
  }
  .featured-job .fj-role {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 17px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 0;
    line-height: 1.2;
  }
  .featured-job .fj-period {
    font-size: 12px;
    color: rgba(255,255,255,0.8);
    margin-bottom: 10px;
  }
  .featured-job .fj-tasks {
    font-size: 11.5px;
    line-height: 1.45;
    color: rgba(255,255,255,0.95);
    font-weight: 500;
  }

  /* ===== CONTACT ===== */
  .cv-contact {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: auto;
    padding-top: 8px;
    font-size: 12px;
    color: #1A5C5C;
  }
  .cv-contact .contact-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .contact-icon {
    width: 22px;
    height: 22px;
    background: #1A5C5C;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .contact-icon svg { width: 12px; height: 12px; fill: #fff; }

  /* ===== RIGHT COLUMN ===== */
  .col-right {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-left: 10px;
  }

  /* Photo area */
  .photo-area {
    position: relative;
    flex-shrink: 0;
    margin-top: 10px;
    margin-bottom: 6px;
    overflow: visible;
  }
  .photo-circle {
    width: 220px;
    height: 220px;
    border-radius: 50%;
    overflow: hidden;
    border: 5px solid #1A5C5C;
    background: #d4918a;
  }
  .photo-circle img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Personality traits - curved around photo using SVG */
  .traits-svg {
    position: absolute;
    top: -30px;
    left: -50px;
    width: 320px;
    height: 320px;
    pointer-events: none;
    overflow: visible;
  }
  .traits-svg text {
    font-family: 'Montserrat', sans-serif;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    fill: #1A5C5C;
  }

  /* Experiences */
  .experiences-list {
    width: 100%;
    text-align: center;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    padding: 0;
  }
  .experience-item {
    padding: 0;
  }
  .exp-company {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.20em;
    text-transform: uppercase;
    color: #1A5C5C;
    margin-bottom: 1px;
  }
  .exp-role {
    font-size: 18px;
    font-weight: 700;
    color: #1A5C5C;
    line-height: 1.15;
  }

  /* ===== FIGURINES (decorative) ===== */
  .figurines {
    position: absolute;
    bottom: 30px;
    right: 30px;
    opacity: 0.7;
  }
  .figurines svg {
    width: 60px;
    height: 70px;
    fill: #1A5C5C;
  }

  @media print {
    body { padding: 0; background: #fff; }
    .cv-page { width: 100vw; height: 100vh; border: none; }
  }
</style>
</head>
<body>
<div class="cv-page">
  <div class="top-bar"></div>
  <div class="cv-content">

    <h1 class="cv-name">${esc(data.name)}</h1>

    <div class="cv-info-bar">
      <span class="cv-info-item">${esc(data.age)}</span>
      <span class="info-line"></span>
      <span class="cv-info-item">${esc(data.license)}</span>
      <span class="info-line"></span>
      <span class="cv-info-item">${esc(data.degree)}</span>
    </div>

    <div class="cv-grid">

      <!-- LEFT COLUMN -->
      <div class="col-left">
        <div class="section-formation">
          ${formationsHtml}
        </div>

        <div class="left-spacer"></div>

        <div class="featured-job">
          <div class="fj-company">${esc(data.featuredJob.company)}</div>
          <div class="fj-role">${esc(data.featuredJob.role)}</div>
          <div class="fj-period">${esc(data.featuredJob.period)}</div>
          <div class="fj-tasks">
            ${tasksHtml}
          </div>
        </div>

        <div class="cv-contact">
          <span class="contact-row">
            <span class="contact-icon"><svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2a1 1 0 011-.2c1.2.4 2.4.6 3.6.6a1 1 0 011 1v3.4a1 1 0 01-1 1C10.6 22 2 13.4 2 3a1 1 0 011-1h3.4a1 1 0 011 1c0 1.3.2 2.5.6 3.6.1.4 0 .7-.2 1L6.6 10.8z"/></svg></span>
            ${esc(data.phone)}
          </span>
          <span class="contact-row">
            <span class="contact-icon"><svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg></span>
            ${esc(data.email)}
          </span>
        </div>
      </div>

      <!-- RIGHT COLUMN -->
      <div class="col-right">
        <div class="photo-area">
          <div class="photo-circle">
            <img src="${esc(data.photoUrl)}" alt="Photo">
          </div>
          <svg class="traits-svg" viewBox="0 0 320 320" overflow="visible">
            <defs>
              <!-- Arc for trait 1 (e.g. "Empathique"): curves along right side going upward -->
              <path id="arc-right" d="M 280,220 A 140,140 0 0,0 155,15" />
              <!-- Arc for trait 2 (e.g. "Performante"): curves along bottom from left to right -->
              <path id="arc-bottom" d="M 50,255 A 140,140 0 0,0 285,270" />
            </defs>
            <text><textPath href="#arc-right" startOffset="0%">${esc(data.traits[0])}</textPath></text>
            <text><textPath href="#arc-bottom" startOffset="0%">${esc(data.traits[1])}</textPath></text>
          </svg>
        </div>

        <div class="experiences-list">
          ${experiencesHtml}
        </div>
      </div>

    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * The subset of CvData that Gemini is allowed to modify.
 * Everything else (name, contact, formations labels, photo) stays fixed.
 */
export interface CvAdaptations {
  traits?: [string, string];
  featuredJob?: {
    tasks?: string[];
  };
  experiences?: Array<{
    role: string;
    subtitle?: string;
  }>;
}

/**
 * Merge Gemini's adaptations into the default CV data.
 */
export function mergeCvData(adaptations: CvAdaptations): CvData {
  const merged = structuredClone(DEFAULT_CV_DATA);

  if (adaptations.traits) {
    merged.traits = adaptations.traits;
  }

  if (adaptations.featuredJob?.tasks) {
    merged.featuredJob.tasks = adaptations.featuredJob.tasks;
  }

  if (adaptations.experiences) {
    for (let i = 0; i < adaptations.experiences.length && i < merged.experiences.length; i++) {
      merged.experiences[i].role = adaptations.experiences[i].role;
      if (adaptations.experiences[i].subtitle !== undefined) {
        merged.experiences[i].subtitle = adaptations.experiences[i].subtitle;
      }
    }
  }

  return merged;
}
