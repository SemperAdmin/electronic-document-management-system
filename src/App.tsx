import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Lazy load route components for code splitting
const Home = lazy(() => import("./pages/Home"));
const SectionDashboard = lazy(() => import("./pages/SectionDashboard"));
const CommandDashboard = lazy(() => import("./pages/CommandDashboard"));
const InstallationAdmin = lazy(() => import("./pages/InstallationAdmin"));
const InstallationApp = lazy(() => import("./pages/InstallationApp"));
const InstallationSectionDashboard = lazy(() => import("./pages/InstallationSectionDashboard"));
const InstallationCommandDashboard = lazy(() => import("./pages/InstallationCommandDashboard"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-navy"></div>
    </div>
  );
}

export default function App() {
  const Router = HashRouter;
  return (
    <Router>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/section" element={<SectionDashboard />} />
            <Route path="/command" element={<CommandDashboard />} />
            <Route path="/installation" element={<InstallationAdmin />} />
            <Route path="/installation-app" element={<InstallationApp />} />
            <Route path="/installation-section" element={<InstallationSectionDashboard />} />
            <Route path="/installation-command" element={<InstallationCommandDashboard />} />
            <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}
