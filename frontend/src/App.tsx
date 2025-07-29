import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import Dashboard from "./pages/Dashboard";
import ProjektDetail from "./pages/ProjektDetail";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projekt/:id" element={<ProjektDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
