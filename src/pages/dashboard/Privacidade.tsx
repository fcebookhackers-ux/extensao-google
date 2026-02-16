import { PrivacyCenterLayout } from "@/components/privacy/PrivacyCenterLayout";
import { PrivacyCenterHome } from "@/components/privacy/PrivacyCenterHome";
import { DataExportRequest } from "@/components/privacy/DataExportRequest";
import { DataDeletionRequest } from "@/components/privacy/DataDeletionRequest";
import { ConsentManager } from "@/components/privacy/ConsentManager";
import { ExportHistory } from "@/components/privacy/ExportHistory";
import { Outlet, Route, Routes } from "react-router-dom";

function Layout() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-2 py-2">
      <PrivacyCenterLayout />
    </div>
  );
}

export default function DashboardPrivacidade() {
  return (
    <Routes>
      <Route element={<Layout />}> 
        <Route element={<Outlet />}>
          <Route index element={<PrivacyCenterHome />} />
          <Route path="exportar" element={<DataExportRequest />} />
          <Route path="historico" element={<ExportHistory />} />
          <Route path="consentimentos" element={<ConsentManager />} />
          <Route path="exclusao" element={<DataDeletionRequest />} />
        </Route>
      </Route>
    </Routes>
  );
}
