import { HashRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Home from "./pages/Home";
import SectionDashboard from "./pages/SectionDashboard";
import CommandDashboard from "./pages/CommandDashboard";

export default function App() {
  const Router = HashRouter;
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/section" element={<SectionDashboard />} />
          <Route path="/command" element={<CommandDashboard />} />
          <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
          <Route path="*" element={<Home />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}
