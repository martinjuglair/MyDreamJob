import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { PerfectCvData } from "@/lib/ai/prompts/perfect-cv";

// ── Color palette ─────────────────────────────────────────────────────
const C = {
  primary: "#1A5C5C",
  primaryLight: "#EDF5F5",
  accent: "#E8A09E",
  text: "#1a1a1a",
  textLight: "#4a5568",
  textMuted: "#718096",
  border: "#CBD5E0",
  white: "#FFFFFF",
  sidebar: "#F8FAFB",
};

// ── Compact styles — everything sized to fit 1 A4 page ────────────────
const s = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 16,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: C.text,
    lineHeight: 1.35,
  },

  // Header
  header: {
    backgroundColor: C.primary,
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  name: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  contactCol: {
    alignItems: "flex-end",
  },
  contactItem: {
    fontSize: 8,
    color: C.white,
    opacity: 0.9,
    marginBottom: 1,
  },

  // Summary
  summaryBar: {
    backgroundColor: C.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 30,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  summaryText: {
    fontSize: 8.5,
    color: C.primary,
    lineHeight: 1.45,
    fontFamily: "Helvetica-Oblique",
  },

  // Body layout
  body: {
    flexDirection: "row",
    flex: 1,
  },
  mainCol: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 6,
    paddingLeft: 30,
    paddingRight: 12,
  },
  sideCol: {
    width: 160,
    backgroundColor: C.sidebar,
    paddingTop: 10,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 18,
    borderLeftWidth: 0.5,
    borderLeftColor: C.border,
  },

  // Section titles
  secTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginBottom: 5,
    paddingBottom: 2,
    borderBottomWidth: 1.5,
    borderBottomColor: C.accent,
  },
  sideSecTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: C.accent,
  },
  section: {
    marginBottom: 8,
  },

  // Experience
  expBlock: {
    marginBottom: 6,
  },
  expRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  expTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.text,
    flex: 1,
  },
  expPeriod: {
    fontSize: 7.5,
    color: C.textMuted,
    textAlign: "right" as const,
    minWidth: 90,
    marginLeft: 6,
  },
  expCompany: {
    fontSize: 8,
    color: C.primary,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 1.5,
    paddingLeft: 2,
  },
  bulletDot: {
    width: 10,
    fontSize: 8.5,
    color: C.accent,
  },
  bulletText: {
    flex: 1,
    fontSize: 8,
    color: C.textLight,
    lineHeight: 1.35,
  },

  // Education
  eduBlock: {
    marginBottom: 4,
  },
  eduDegree: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.text,
  },
  eduMeta: {
    fontSize: 7.5,
    color: C.textMuted,
  },
  eduDetail: {
    fontSize: 7.5,
    color: C.textLight,
    fontFamily: "Helvetica-Oblique",
    marginTop: 0.5,
  },

  // Skills
  skillCat: {
    marginBottom: 5,
  },
  skillLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.textLight,
    marginBottom: 2,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  skillTag: {
    backgroundColor: C.primaryLight,
    color: C.primary,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 2,
    fontSize: 7,
    marginRight: 3,
    marginBottom: 2.5,
  },

  // Languages
  langRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2.5,
  },
  langName: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.text,
  },
  langLevel: {
    fontSize: 7.5,
    color: C.textMuted,
  },

  // Footer
  footer: {
    position: "absolute" as const,
    bottom: 6,
    left: 30,
    right: 30,
  },
  footerLine: {
    height: 1,
    backgroundColor: C.accent,
  },
});

// ── Component ─────────────────────────────────────────────────────────

export function PerfectCvDocument({
  data,
  name = "Capucine Busch",
  contact,
}: {
  data: PerfectCvData;
  name?: string;
  contact?: { phone?: string; email?: string; location?: string };
}) {
  const hasSkills =
    data.skills.hard.length > 0 ||
    data.skills.soft.length > 0 ||
    data.skills.tools.length > 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ══ HEADER ══ */}
        <View style={s.header}>
          <Text style={s.name}>{name}</Text>
          <View style={s.contactCol}>
            {contact?.phone && (
              <Text style={s.contactItem}>{contact.phone}</Text>
            )}
            {contact?.email && (
              <Text style={s.contactItem}>{contact.email}</Text>
            )}
            {contact?.location && (
              <Text style={s.contactItem}>{contact.location}</Text>
            )}
          </View>
        </View>

        {/* ══ SUMMARY ══ */}
        {data.profile.summary && (
          <View style={s.summaryBar}>
            <Text style={s.summaryText}>{data.profile.summary}</Text>
          </View>
        )}

        {/* ══ BODY ══ */}
        <View style={s.body}>
          {/* ── Main: Experience + Education ── */}
          <View style={s.mainCol}>
            {data.experience.length > 0 && (
              <View style={s.section}>
                <Text style={s.secTitle}>Expériences</Text>
                {data.experience.map((exp, i) => (
                  <View key={i} style={s.expBlock}>
                    <View style={s.expRow}>
                      <Text style={s.expTitle}>{exp.title}</Text>
                      <Text style={s.expPeriod}>{exp.period}</Text>
                    </View>
                    <Text style={s.expCompany}>
                      {exp.company}
                      {exp.location ? ` — ${exp.location}` : ""}
                    </Text>
                    {exp.bullets.slice(0, 4).map((b, j) => (
                      <View key={j} style={s.bullet}>
                        <Text style={s.bulletDot}>•</Text>
                        <Text style={s.bulletText}>{b}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {data.education.length > 0 && (
              <View style={s.section}>
                <Text style={s.secTitle}>Formation</Text>
                {data.education.map((edu, i) => (
                  <View key={i} style={s.eduBlock}>
                    <Text style={s.eduDegree}>{edu.degree}</Text>
                    <Text style={s.eduMeta}>
                      {edu.school} · {edu.year}
                    </Text>
                    {edu.details && (
                      <Text style={s.eduDetail}>{edu.details}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Sidebar: Skills + Languages ── */}
          <View style={s.sideCol}>
            {hasSkills && (
              <View style={s.section}>
                <Text style={s.sideSecTitle}>Compétences</Text>

                {data.skills.hard.length > 0 && (
                  <View style={s.skillCat}>
                    <Text style={s.skillLabel}>Métier</Text>
                    <View style={s.skillsWrap}>
                      {data.skills.hard.slice(0, 8).map((sk, i) => (
                        <Text key={i} style={s.skillTag}>{sk}</Text>
                      ))}
                    </View>
                  </View>
                )}

                {data.skills.soft.length > 0 && (
                  <View style={s.skillCat}>
                    <Text style={s.skillLabel}>Soft Skills</Text>
                    <View style={s.skillsWrap}>
                      {data.skills.soft.slice(0, 5).map((sk, i) => (
                        <Text key={i} style={s.skillTag}>{sk}</Text>
                      ))}
                    </View>
                  </View>
                )}

                {data.skills.tools.length > 0 && (
                  <View style={s.skillCat}>
                    <Text style={s.skillLabel}>Outils</Text>
                    <View style={s.skillsWrap}>
                      {data.skills.tools.slice(0, 6).map((sk, i) => (
                        <Text key={i} style={s.skillTag}>{sk}</Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {data.languages.length > 0 && (
              <View style={s.section}>
                <Text style={s.sideSecTitle}>Langues</Text>
                {data.languages.slice(0, 3).map((lang, i) => (
                  <View key={i} style={s.langRow}>
                    <Text style={s.langName}>{lang.language}</Text>
                    <Text style={s.langLevel}>{lang.level}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ══ Footer ══ */}
        <View style={s.footer}>
          <View style={s.footerLine} />
        </View>
      </Page>
    </Document>
  );
}
