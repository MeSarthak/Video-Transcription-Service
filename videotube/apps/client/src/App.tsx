import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.js';
import Home from './pages/Home.js';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
      </Route>
    </Routes>
  );
}
