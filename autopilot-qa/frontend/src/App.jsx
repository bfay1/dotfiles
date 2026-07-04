import { Routes, Route, NavLink } from "react-router-dom";
import PersonaTest from "./pages/PersonaTest.jsx";
import FlowMonitor from "./pages/FlowMonitor.jsx";

function Tab({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
          isActive
            ? "border-indigo-500 text-white"
            : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 pt-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-mono text-indigo-400 mb-3 tracking-widest uppercase">
            AutopilotQA
          </p>
          <nav className="flex gap-1">
            <Tab to="/">Persona Test</Tab>
            <Tab to="/flows">Flow Monitor</Tab>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<PersonaTest />} />
          <Route path="/flows" element={<FlowMonitor />} />
        </Routes>
      </main>
    </div>
  );
}
