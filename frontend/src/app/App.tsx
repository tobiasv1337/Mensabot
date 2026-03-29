import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const AppShell = lazy(() => import("../layouts/AppShell/AppShell"));
const HomePage = lazy(() => import("../pages/HomePage/HomePage"));
const ChatPage = lazy(() => import("../pages/ChatPage/ChatPage"));
const CanteensPage = lazy(() => import("../pages/CanteensPage/CanteensPage"));
const MapPage = lazy(() => import("../pages/MapPage/MapPage"));
const ProjectFactsPage = lazy(() => import("../pages/ProjectFactsPage/ProjectFactsPage"));
const LegalNoticePage = lazy(() => import("../pages/LegalNoticePage/LegalNoticePage"));
const ShortcutsPage = lazy(() => import("../pages/ShortcutsPage/ShortcutsPage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage/SettingsPage"));

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={null}>{element}</Suspense>
);

export default function App() {
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
