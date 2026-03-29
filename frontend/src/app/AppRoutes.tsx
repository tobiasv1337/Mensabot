import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const AppShell = lazy(() => import("../layouts/AppShell"));
const HomePage = lazy(() => import("../pages/HomePage"));
const ChatPage = lazy(() => import("../pages/ChatPage"));
const CanteensPage = lazy(() => import("../pages/CanteensPage"));
const MapPage = lazy(() => import("../pages/MapPage"));
const ProjectFactsPage = lazy(() => import("../pages/ProjectFactsPage"));
const LegalNoticePage = lazy(() => import("../pages/LegalNoticePage"));
const ShortcutsPage = lazy(() => import("../pages/ShortcutsPage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={null}>{element}</Suspense>
);

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={withSuspense(<AppShell />)}>
        <Route index element={withSuspense(<HomePage />)} />
        <Route path="chat" element={withSuspense(<ChatPage />)} />
        <Route path="canteens" element={withSuspense(<CanteensPage />)} />
        <Route path="map" element={withSuspense(<MapPage />)} />
        <Route path="about" element={withSuspense(<ProjectFactsPage />)} />
        <Route path="legal" element={withSuspense(<LegalNoticePage />)} />
        <Route path="shortcuts" element={withSuspense(<ShortcutsPage />)} />
        <Route path="settings" element={withSuspense(<SettingsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
