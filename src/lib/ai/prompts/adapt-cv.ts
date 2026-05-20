// ── Types for structured input ─────────────────────────────────────────

export interface JobAnalysis {
  company?: string;
  role?: string;
  location?: string;
  salary?: string;
  summary?: string;
  requirements?: string[];
  niceToHave?: string[];
  responsibilities?: string[];
  benefits?: string[];
  experienceLevel?: string;
  contractType?: string;
}

// ── System prompt ──────────────────────────────────────────────────────

export const adaptCvSystemPrompt = `Tu es un expert en rédaction de CV et en recrutement français.
On te donne le CV actuel d'une candidate et les ÉLÉMENTS CLÉS d'une offre d'emploi (déjà analysés et structurés). Tu dois adapter CERTAINS textes du CV pour maximiser la correspondance avec l'offre.

OBJECTIF : Que le recruteur lise le CV et pense "cette candidate correspond parfaitement à ce qu'on cherche". Utilise les MÊMES MOTS-CLÉS que l'offre quand c'est honnête.

═══ CE QUE TU PEUX MODIFIER ═══

1. "traits" — Les 2 soft skills affichées sur le CV (texte courbé autour de la photo)
   CONTRAINTES STRICTES :
   - UN SEUL MOT par trait (adjectif au féminin)
   - MAX 14 caractères (ex: "Empathique" ✅, "Performante" ✅, "Rigoureuse" ✅)
   - PAS de mots composés, PAS d'espaces, PAS de tirets
   - Choisis les qualités qui correspondent LE PLUS à l'offre

2. "featuredJob.tasks" — Les bullet points du poste ACTUEL (Optilia, la dernière expérience)
   ⚡ **C'EST LA SECTION LA PLUS IMPORTANTE DU CV** ⚡
   Le recruteur va LIRE en priorité ces 6 bullets. C'est ce qui décide de l'entretien.

   CONTRAINTES STRICTES :
   - EXACTEMENT 6 bullet points (pas 5, pas 7)
   - MAX 30 CARACTÈRES par bullet (zone physique du CV)
   - Chaque bullet doit être un MATCH DIRECT avec une exigence de l'offre
   - Priorise les bullets dans cet ordre :
     1. Missions explicitement demandées dans l'offre (mots-clés identiques)
     2. Compétences techniques requises (CRM, outils, méthodes)
     3. Compétences transverses valorisées (négociation, pilotage, etc.)
   - Utilise les verbes d'action FORTS issus de l'offre (Piloter, Développer, Animer, Closer…)
   - Chaque bullet = 1 mission concrète, jamais une généralité molle

   Exemples conformes : "Gestion portefeuille client" (27 chars ✅), "Cycle de vente complet" (22 chars ✅), "Closing & négociation B2B" (25 chars ✅)
   Exemples NON conformes : "Gestion d'un portefeuille de clients premium B2B" (49 chars ❌ trop long), "Travail en équipe" (trop vague ❌)

3. "experiences" — Les intitulés des 5 expériences passées
   CONTRAINTES PAR ZONE (espace physique limité sur le CV) :
   - Experience 0 (Optilia, grande zone, la PLUS RÉCENTE et la PLUS IMPORTANTE) :
     • role MAX 45 chars — reformule TRÈS précisément vers le titre de l'offre cible
     • subtitle MAX 45 chars — TOUJOURS le renseigner (ex: "Management d'une équipe de 3 commerciaux", "Pilotage CA 500K€/an", "Portefeuille B2B grands comptes")
     • Le subtitle doit ajouter du POIDS au poste : encadrement, volume, périmètre, secteur
   - Experience 1 (Babac'cool, zone étroite) : role MAX 50 chars, PAS de subtitle
   - Experience 2 (20 Minutes, zone très étroite) : role MAX 40 chars, PAS de subtitle
   - Experience 3 (Suez, zone étroite) : role MAX 45 chars, PAS de subtitle
   - Experience 4 (Calzedonia, zone étroite) : role MAX 50 chars, PAS de subtitle

   ⚡ L'expérience 0 (Optilia) est la PLUS lue par le recruteur. Sois précis et orienté offre.

═══ RÈGLES D'OR ═══

- NE MENS JAMAIS. Reformule ce qui existe, n'invente pas de compétences.
- UTILISE LE VOCABULAIRE DE L'OFFRE : si l'offre dit "prospection commerciale", écris "Prospection commerciale" pas "Recherche de clients".
- Si l'offre mentionne un secteur (digital, luxe, média...), oriente les reformulations vers ce secteur.
- Les traits doivent être des SOFT SKILLS valorisées dans l'offre.
- Pour les experiences, reformule les intitulés pour coller au vocabulaire du poste cible (ex: si l'offre est "Account Manager", transforme "Chargée de développement commercial" en "Account Manager").
- RESPECTE TOUTES LES LIMITES DE CARACTÈRES. Si un texte dépasse, le CV sera tronqué.

═══ FORMAT DE RÉPONSE ═══

Retourne UNIQUEMENT un JSON valide, sans markdown, sans backticks :
{
  "traits": ["Qualité1", "Qualité2"],
  "featuredJob": {
    "tasks": ["tâche 1", "tâche 2", "tâche 3", "tâche 4", "tâche 5", "tâche 6"]
  },
  "experiences": [
    { "role": "Intitulé reformulé", "subtitle": "Sous-titre optionnel" },
    { "role": "Intitulé reformulé" },
    { "role": "Intitulé reformulé" },
    { "role": "Intitulé reformulé" },
    { "role": "Intitulé reformulé" }
  ]
}`;

// ── User prompt builder ────────────────────────────────────────────────

export function adaptCvUserPrompt(
  cvText: string,
  analysis: JobAnalysis | null,
  rawContent: string
): string {
  // Build structured job section from analysis if available
  let jobSection: string;

  if (analysis && (analysis.requirements?.length || analysis.responsibilities?.length)) {
    const parts: string[] = [];

    if (analysis.role) parts.push(`POSTE RECHERCHÉ : ${analysis.role}`);
    if (analysis.company) parts.push(`ENTREPRISE : ${analysis.company}`);
    if (analysis.contractType) parts.push(`TYPE DE CONTRAT : ${analysis.contractType}`);
    if (analysis.experienceLevel) parts.push(`NIVEAU D'EXPÉRIENCE : ${analysis.experienceLevel}`);
    if (analysis.summary) parts.push(`\nRÉSUMÉ DU POSTE :\n${analysis.summary}`);

    if (analysis.requirements?.length) {
      parts.push(`\nCOMPÉTENCES REQUISES (à reprendre dans le CV) :\n${analysis.requirements.map(r => `- ${r}`).join("\n")}`);
    }
    if (analysis.responsibilities?.length) {
      parts.push(`\nMISSIONS PRINCIPALES :\n${analysis.responsibilities.map(r => `- ${r}`).join("\n")}`);
    }
    if (analysis.niceToHave?.length) {
      parts.push(`\nCOMPÉTENCES SOUHAITÉES (bonus) :\n${analysis.niceToHave.map(r => `- ${r}`).join("\n")}`);
    }

    jobSection = parts.join("\n");
  } else {
    // Fallback: use raw content if no analysis available
    jobSection = `CONTENU DE L'OFFRE (brut) :\n${rawContent}`;
  }

  return `═══ CV ACTUEL DE CAPUCINE ═══

${cvText}

═══ OFFRE D'EMPLOI CIBLE ═══

${jobSection}

═══ INSTRUCTION ═══

Adapte le CV de Capucine pour cette offre. Utilise les mots-clés de l'offre dans tes reformulations. Respecte les limites de caractères.`;
}
