import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Home } from "./pages/Home";
import { Watch } from "./pages/Watch";
import { UploadVideo } from "./pages/UploadVideo";
import { Channel } from "./pages/Channel";
import { Trending } from "./pages/Trending";
import { Subscriptions } from "./pages/Subscriptions";
import { WatchHistory } from "./pages/WatchHistory";
import { LikedVideos } from "./pages/LikedVideos";
import { Library } from "./pages/Library";
import { WatchLater } from "./pages/WatchLater";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { useAuth } from "./context/AuthContext";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/watch/:videoId" element={<Watch />} />
          <Route path="/channel/:username" element={<Channel />} />
          <Route path="/trending" element={<Trending />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/history" element={<WatchHistory />} />
          <Route path="/liked" element={<LikedVideos />} />
          <Route path="/library" element={<Library />} />
          <Route path="/watch-later" element={<WatchLater />} />
          <Route
            path="/upload"
            element={
              <RequireAuth>
                <UploadVideo />
              </RequireAuth>
            }
          />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
