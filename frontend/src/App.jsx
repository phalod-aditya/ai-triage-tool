import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import CreateIntakePage from "./pages/CreateIntakePage.jsx";
import IntakeDetailPage from "./pages/IntakeDetailPage.jsx";
import IntakeListPage from "./pages/IntakeListPage.jsx";


export default function App() {
  return (
    <BrowserRouter>
      <header className="site-header">
        <Link className="brand" to="/">
          AI Triage Tool
        </Link>
        <Link className="button button-primary" to="/intakes/new">
          New intake
        </Link>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<IntakeListPage />} />
          <Route path="/intakes/new" element={<CreateIntakePage />} />
          <Route path="/intakes/:id" element={<IntakeDetailPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
