import Login from './components/Login'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Group_page from './components/Group/Group_page'
import AdminDashboard from './components/AdminDashboard'


function App() {
  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path='/group' element={(<Group_page/>)}/>
        <Route path='/admin' element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
