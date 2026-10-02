import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { restoreSession } from './store/authSlice';
import Login from './pages/Login';

// Temporary placeholder pages — these get replaced in F3 onward.
function Placeholder({ title }) {
  return <div style={{ padding: 40 }}><h2>{title}</h2><p>This page will be built in a later module.</p></div>;
}

function App() {
  const dispatch = useDispatch();
  const { sessionChecked } = useSelector((state) => state.auth);

  // On first load, try to restore a session from the refresh cookie.
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  if (!sessionChecked) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/sop" element={<Placeholder title="SOP Builder" />} />
        <Route path="/users" element={<Placeholder title="User Management" />} />
        <Route path="/projects" element={<Placeholder title="Workflow Board" />} />
        <Route path="/client" element={<Placeholder title="Client View" />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;