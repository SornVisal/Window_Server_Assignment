import Login from './components/Login'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from 'react';
import Group_page from './components/Group/Group_page'
import AdminDashboard from './components/AdminDashboard'
import { sessionManager } from './utils/sessionManager'

function App() {
  const [isSessionValid, setIsSessionValid] = useState(null);

  useEffect(() => {
    // Check session validity on app load
    const token = localStorage.getItem('accessToken');
    const currentUser = localStorage.getItem('currentUser');

    // If no token or user data, session is invalid
    if (!token || !currentUser) {
      setIsSessionValid(false);
      return;
    }

    // Check if session is still within 5 minute window
    if (sessionManager.isSessionValid()) {
      setIsSessionValid(true);
    } else {
      // Session expired - clear and redirect to login
      sessionManager.clearSession();
      setIsSessionValid(false);
    }
  }, []);

  // Show nothing while checking session
  if (isSessionValid === null) {
    return <div></div>;
  }

  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path='/group' element={isSessionValid ? <Group_page /> : <Navigate to="/" />} />
        <Route path='/admin' element={isSessionValid ? <AdminDashboard /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
