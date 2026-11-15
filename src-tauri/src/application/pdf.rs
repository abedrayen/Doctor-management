//! Printable HTML documents. The frontend prints them with `window.print()`;
//! nothing leaves the machine.

use rusqlite::Connection;

use crate::application::{auth, consultations, growth, patients, settings, vaccinations};
use crate::domain::error::{AppError, AppResult};
use crate::domain::models::*;

const STYLE: &str = "body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#111;margin:24px}\
header{border-bottom:2px solid #1d4ed8;margin-bottom:16px;padding-bottom:8px}\
header h1{margin:0;font-size:18px;color:#1d4ed8}header p{margin:2px 0}\
h2{font-size:14px;border-bottom:1px solid #ccc;padding-bottom:2px;margin:18px 0 6px}\
table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top}\
th{background:#f3f4f6;width:30%}table.grid th{width:auto}\
.draft,.warning{color:#b91c1c;font-weight:bold}.muted{color:#6b7280}\
@media print{body{margin:0}}";

const VACCINATION_STATUS: &[(&str, &str)] =
    &[("done", "Effectué"), ("upcoming", "À venir"), ("overdue", "En retard"), ("unknown", "Non renseigné")];
const CONSULTATION_STATUS: &[(&str, &str)] = &[("draft", "Brouillon"), ("finalized", "Finalisée")];
const CONSULTATION_TYPE: &[(&str, &str)] = &[
    ("consultation", "Consultation"),
    ("controle", "Contrôle"),
    ("urgence", "Urgence"),
    ("vaccination", "Vaccination"),
    ("certificat", "Certificat"),
];

fn esc(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn opt(value: &Option<String>) -> String {
    match value.as_deref().map(str::trim) {
        Some(v) if !v.is_empty() => esc(v).replace('\n', "<br>"),
        _ => "<span class=\"muted\">—</span>".to_string(),
    }
}

fn num<T: ToString>(value: &Option<T>, unit: &str) -> String {
    match value {
        Some(v) => format!("{} {unit}", v.to_string()),
        None => opt(&None),
    }
}

/// French label of an enum key (the key itself when unknown).
fn label(labels: &[(&str, &str)], key: &str) -> String {
    esc(labels.iter().find(|(k, _)| *k == key).map_or(key, |(_, v)| *v))
}

fn rows(items: &[(&str, String)]) -> String {
    let body: String =
        items.iter().map(|(label, value)| format!("<tr><th>{}</th><td>{value}</td></tr>", esc(label))).collect();
    format!("<table>{body}</table>")
}

fn section(title: &str, body: &str) -> String {
    format!("<h2>{}</h2>{body}", esc(title))
}

fn table(headers: &[&str], body_rows: Vec<Vec<String>>) -> String {
    if body_rows.is_empty() {
        return opt(&None);
    }
    let head: String = headers.iter().map(|h| format!("<th>{}</th>", esc(h))).collect();
    let body: String = body_rows
        .iter()
        .map(|cells| format!("<tr>{}</tr>", cells.iter().map(|c| format!("<td>{c}</td>")).collect::<String>()))
        .collect();
    format!("<table class=\"grid\"><tr>{head}</tr>{body}</table>")
}

fn date_part(value: &str) -> &str {
    value.get(..10).unwrap_or(value)
}

fn full_name(patient: &PatientRecord) -> String {
    format!("{} {}", esc(&patient.record.data.prenom), esc(&patient.record.data.nom))
}

fn page(conn: &Connection, title: &str, body: &str) -> AppResult<String> {
    let cfg = settings::get(conn)?;
    let doctor = auth::primary_doctor(conn)?;
    let contact = ["cabinet_address", "cabinet_phone", "cabinet_email"]
        .iter()
        .filter_map(|k| cfg.get(*k).filter(|v| !v.is_empty()).map(|v| esc(v)))
        .collect::<Vec<_>>()
        .join(" · ");
    Ok(format!(
        "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"utf-8\"><title>{title}</title><style>{STYLE}</style></head><body>\
         <header><h1>{cabinet}</h1><p>{doctor} {specialty}</p><p class=\"muted\">{contact}</p></header>{body}\
         <p class=\"muted\">Document généré le {generated}</p></body></html>",
        title = esc(title),
        cabinet = esc(cfg.get("cabinet_name").map_or("", String::as_str)),
        doctor = esc(&doctor.display_name),
        specialty = esc(doctor.specialty.as_deref().unwrap_or("")),
        generated = chrono::Local::now().format("%d/%m/%Y %H:%M"),
    ))
}

/// Dispatches on the frontend `PrintableKind`.
pub fn generate_printable_html(
    conn: &Connection,
    kind: &str,
    patient_id: &str,
    consultation_id: Option<&str>,
) -> AppResult<String> {
    match kind {
        "fiche" => patient_sheet(conn, patient_id),
        "consultation" => {
            let id = consultation_id
                .ok_or_else(|| AppError::validation("Identifiant de consultation requis pour ce document"))?;
            consultation_sheet(conn, id)
        }
        "historique" => consultation_history(conn, patient_id),
        "croissance" => growth_sheet(conn, patient_id),
        "vaccinal" => vaccination_sheet(conn, patient_id),
        other => Err(AppError::validation(format!("Type de document inconnu : {other}"))),
    }
}

fn consultation_rows(conn: &Connection, patient_id: &str, limit: Option<i64>) -> AppResult<Vec<Vec<String>>> {
    Ok(consultations::list_summaries(conn, Some(patient_id), None, limit)?
        .iter()
        .map(|c| {
            vec![
                esc(date_part(&c.consulted_at)),
                label(CONSULTATION_TYPE, &c.kind),
                esc(&c.motif),
                esc(&c.diagnostic),
                label(CONSULTATION_STATUS, &c.status),
            ]
        })
        .collect())
}

const CONSULTATION_HEADERS: [&str; 5] = ["Date", "Type", "Motif", "Diagnostic", "Statut"];

fn patient_sheet(conn: &Connection, patient_id: &str) -> AppResult<String> {
    let detail = patients::get(conn, patient_id)?;
    let p = &detail.patient;
    let mut body = format!("<h2>Fiche patient — {}</h2>", full_name(p));

    body += &rows(&[
        ("Référence", esc(&p.meta.reference)),
        ("Date de naissance", esc(&p.record.data.date_naissance)),
        ("Sexe", esc(&p.record.data.sexe)),
        ("Adresse", opt(&p.record.data.adresse)),
        ("Gouvernorat / Délégation", format!("{} / {}", opt(&p.record.data.gouvernorat), opt(&p.record.data.delegation))),
    ]);

    let c = detail.contact.map(|r| r.data).unwrap_or_default();
    body += &section(
        "Parents et contacts",
        &rows(&[
            ("Père", opt(&c.nom_pere)),
            ("Mère", opt(&c.nom_mere)),
            ("Téléphone principal", opt(&c.telephone_principal)),
            ("Téléphone secondaire", opt(&c.telephone_secondaire)),
            ("E-mail", opt(&c.email)),
            ("Contact d'urgence", opt(&c.contact_urgence)),
        ]),
    );

    let h = detail.history.map(|r| r.data).unwrap_or_default();
    body += &section(
        "Naissance et antécédents",
        &rows(&[
            ("Terme (semaines)", opt(&h.terme_naissance)),
            ("Poids de naissance", num(&h.poids_naissance_kg, "kg")),
            ("Taille de naissance", num(&h.taille_naissance_cm, "cm")),
            ("Périmètre crânien de naissance", num(&h.perimetre_cranien_naissance_cm, "cm")),
            ("Apgar 1 min / 5 min", format!("{} / {}", num(&h.apgar_1, ""), num(&h.apgar_5, ""))),
            ("Mode d'accouchement", opt(&h.type_accouchement)),
            ("Allergies", opt(&h.allergies_connues)),
            ("Maladies chroniques", opt(&h.maladies_chroniques)),
            ("Médicaments en cours", opt(&h.traitements_en_cours)),
            ("Antécédents familiaux", opt(&h.antecedents_familiaux)),
            ("Antécédents chirurgicaux", opt(&h.antecedents_chirurgicaux)),
        ]),
    );

    if !detail.notes.is_empty() {
        let notes: Vec<Vec<String>> = detail.notes.iter().map(|n| vec![opt(&Some(n.data.body.clone()))]).collect();
        body += &section("Notes", &table(&["Note"], notes));
    }

    body += &section(
        "Dernières consultations",
        &table(&CONSULTATION_HEADERS, consultation_rows(conn, patient_id, Some(10))?),
    );
    body += &section("Vaccinations", &vaccination_table(conn, patient_id)?);

    if let Some(g) = growth::latest(conn, patient_id)? {
        body += &section(
            "Dernière mesure de croissance",
            &rows(&[
                ("Date", esc(date_part(&g.data.measured_at))),
                ("Poids", num(&g.data.poids_kg, "kg")),
                ("Taille", num(&g.data.taille_cm, "cm")),
                ("Périmètre crânien", num(&g.data.perimetre_cranien_cm, "cm")),
            ]),
        );
    }

    page(conn, "Fiche patient", &body)
}

fn consultation_sheet(conn: &Connection, consultation_id: &str) -> AppResult<String> {
    let c = consultations::get(conn, consultation_id)?;
    let d = &c.record.data;
    let patient = patients::get(conn, &d.patient_id)?.patient;

    let mut body = format!("<h2>Consultation du {}</h2>", esc(date_part(&d.consulted_at)));
    if c.state.status == "draft" {
        body += "<p class=\"draft\">BROUILLON — consultation non finalisée</p>";
    }
    body += &rows(&[
        ("Patient", full_name(&patient)),
        ("Référence", esc(&patient.meta.reference)),
        ("Date de naissance", esc(&patient.record.data.date_naissance)),
        ("Type", label(CONSULTATION_TYPE, d.type_consultation.as_deref().unwrap_or(""))),
        ("Motif", opt(&d.motif)),
        ("Histoire de la maladie", opt(&d.symptomes)),
    ]);
    body += &section(
        "Constantes",
        &rows(&[
            ("Température", num(&d.temperature_c, "°C")),
            ("Poids", num(&d.poids_kg, "kg")),
            ("Taille", num(&d.taille_cm, "cm")),
            ("Périmètre crânien", num(&d.perimetre_cranien_cm, "cm")),
        ]),
    );
    body += &section(
        "Examen, diagnostic et conduite à tenir",
        &rows(&[
            ("Examen clinique", opt(&d.examen_clinique)),
            ("Diagnostic", opt(&d.diagnostic)),
            ("Traitement", opt(&d.notes)),
            ("Conseils", opt(&d.instructions_suivi)),
        ]),
    );
    if !c.amendments.is_empty() {
        body += &section(
            "Amendements",
            &table(
                &["Date", "Champ", "Ancienne valeur", "Nouvelle valeur", "Motif"],
                c.amendments
                    .iter()
                    .map(|a| {
                        vec![
                            esc(date_part(&a.created_at)),
                            esc(&a.data.field_name),
                            opt(&a.data.old_value),
                            opt(&a.data.new_value),
                            esc(&a.data.reason),
                        ]
                    })
                    .collect(),
            ),
        );
    }

    page(conn, "Consultation", &body)
}

fn consultation_history(conn: &Connection, patient_id: &str) -> AppResult<String> {
    let patient = patients::get(conn, patient_id)?.patient;
    let body = format!("<h2>Historique des consultations — {}</h2>", full_name(&patient))
        + &table(&CONSULTATION_HEADERS, consultation_rows(conn, patient_id, None)?);
    page(conn, "Historique des consultations", &body)
}

fn growth_sheet(conn: &Connection, patient_id: &str) -> AppResult<String> {
    let patient = patients::get(conn, patient_id)?.patient;
    let chart = growth::chart(conn, patient_id)?;
    let score = |s: &Option<crate::application::who_lms::Score>| match s {
        Some(v) => format!("z={:.2} · P{:.0}", v.z, v.percentile),
        None => "—".into(),
    };
    let measurements = table(
        &[
            "Date",
            "Âge (mois)",
            "Poids",
            "Z/Poids",
            "Taille",
            "Z/Taille",
            "PC",
            "Z/PC",
            "IMC",
            "Z/IMC",
        ],
        chart
            .points
            .iter()
            .map(|point| {
                let m = &point.measurement.data;
                vec![
                    esc(date_part(&m.measured_at)),
                    format!("{:.1}", point.age_months),
                    num(&m.poids_kg, "kg"),
                    score(&point.scores.weight_kg),
                    num(&m.taille_cm, "cm"),
                    score(&point.scores.height_cm),
                    num(&m.perimetre_cranien_cm, "cm"),
                    score(&point.scores.head_cm),
                    point.bmi.map(|v| format!("{v:.1}")).unwrap_or_else(|| "—".into()),
                    score(&point.scores.bmi),
                ]
            })
            .collect(),
    );
    let reference_note = if chart.reviewed {
        String::new()
    } else {
        format!(
            "<p class=\"warning\">Références OMS LMS ({}) : tables locales en attente de validation clinique. Aucun diagnostic automatique.</p>",
            esc(&chart.source)
        )
    };
    let body = format!("<h2>Courbe de croissance — {}</h2>{measurements}{reference_note}", full_name(&patient));
    page(conn, "Courbe de croissance", &body)
}

fn vaccination_table(conn: &Connection, patient_id: &str) -> AppResult<String> {
    Ok(table(
        &["Vaccin", "Dose", "Statut", "Administré le", "Échéance", "Lot", "Observations"],
        vaccinations::list_records(conn, patient_id)?
            .iter()
            .map(|v| {
                vec![
                    esc(&v.data.vaccine_name),
                    num(&v.data.dose_number, ""),
                    label(VACCINATION_STATUS, &v.data.status),
                    opt(&v.data.administered_at),
                    opt(&v.data.next_due_at),
                    opt(&v.data.lot_number),
                    opt(&v.data.observations),
                ]
            })
            .collect(),
    ))
}

fn vaccination_sheet(conn: &Connection, patient_id: &str) -> AppResult<String> {
    let patient = patients::get(conn, patient_id)?.patient;
    let schedule = vaccinations::get_schedule(conn)?;
    let notice = if schedule.requires_doctor_review {
        format!(
            "<p class=\"warning\">Calendrier de référence ({}) non validé : à vérifier par le médecin.</p>",
            esc(&schedule.version.version)
        )
    } else {
        String::new()
    };
    let body = format!(
        "<h2>Carnet vaccinal — {}</h2>{}{notice}",
        full_name(&patient),
        vaccination_table(conn, patient_id)?
    );
    page(conn, "Carnet vaccinal", &body)
}
