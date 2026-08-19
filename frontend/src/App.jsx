import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import KassaPage from './pages/KassaPage';
import OmborPage from './pages/OmborPage';
import HisobotPage from './pages/HisobotPage';
import XarajatPage from './pages/XarajatPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Toast />
          <Routes>
            <Route path="/" element={<KassaPage />} />
            <Route path="/ombor" element={<OmborPage />} />
            <Route path="/hisobot" element={<HisobotPage />} />
            <Route path="/xarajat" element={<XarajatPage />} />
          </Routes>
          <Navbar />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
