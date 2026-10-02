import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { restoreSession } from './store/authSlice';
import Login from './pages/Login';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SopBuilder from './pages/SopBuilder';
import CreateProject from './pages/CreateProject';
import WorkflowBoard from './pages/WorkflowBoard';
import ClientView from './pages/ClientView';

function Placeholder({ title }) {
  return <div style={{ padding: 40 }}><h2>{title}</h2><p>This page will be built in a later module.</p></div>;
}

function App() {
  const dispatch = useDispatch();
  const { sessionChecked, user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  if (!sessionChecked) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

        <Route element={<Layout />}>
          <Route
            path="/sop"
            element={<ProtectedRoute module="sop" action="view"><SopBuilder /></ProtectedRoute>}
          />
          <Route
            path="/users"
            element={<ProtectedRoute module="users" action="manage"><Placeholder title="User Management" /></ProtectedRoute>}
          />
          <Route
            path="/projects/new"
            element={<ProtectedRoute module="projects" action="create"><CreateProject /></ProtectedRoute>}
          />
                   <Route
            path="/projects"
            element={<ProtectedRoute module="projects" action="view"><WorkflowBoard /></ProtectedRoute>}
          />

          <Route
            path="/client"
            element={<ProtectedRoute module="projects" action="view"><ClientView /></ProtectedRoute>}
          />
          
          <Route
            path="/audit"
            element={<ProtectedRoute module="audit" action="view"><Placeholder title="Audit Log" /></ProtectedRoute>}
          />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;