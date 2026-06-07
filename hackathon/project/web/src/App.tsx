import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Cards from './pages/Cards';
import AgentConsole from './pages/AgentConsole';
import AttackDemo from './pages/AttackDemo';
import AuditReport from './pages/AuditReport';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="cards" element={<Cards />} />
          <Route path="agent" element={<AgentConsole />} />
          <Route path="attack" element={<AttackDemo />} />
          <Route path="audit" element={<AuditReport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
