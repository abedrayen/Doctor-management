import { createHashRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AppointmentsPage } from "@/features/appointments/AppointmentsPage";
import { ConsultationFormPage } from "@/features/consultations/ConsultationFormPage";
import { ConsultationsPage } from "@/features/consultations/ConsultationsPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { DocumentsPage } from "@/features/documents/DocumentsPage";
import { GrowthPage } from "@/features/growth/GrowthPage";
import { PatientFormPage } from "@/features/patients/PatientFormPage";
import { PatientProfilePage } from "@/features/patients/PatientProfilePage";
import { PatientsPage } from "@/features/patients/PatientsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { VaccinationsPage } from "@/features/vaccinations/VaccinationsPage";

/** Hash routing: works under the Tauri asset protocol without server-side fallbacks. */
export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "patients", element: <PatientsPage /> },
      { path: "patients/nouveau", element: <PatientFormPage /> },
      { path: "patients/:id", element: <PatientProfilePage /> },
      { path: "patients/:id/modifier", element: <PatientFormPage /> },
      { path: "consultations", element: <ConsultationsPage /> },
      { path: "consultations/nouvelle", element: <ConsultationFormPage /> },
      { path: "consultations/:id", element: <ConsultationFormPage /> },
      { path: "rendez-vous", element: <AppointmentsPage /> },
      { path: "vaccinations", element: <VaccinationsPage /> },
      { path: "croissance", element: <GrowthPage /> },
      { path: "documents", element: <DocumentsPage /> },
      { path: "parametres", element: <SettingsPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
