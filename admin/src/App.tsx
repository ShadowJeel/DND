
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom"
import { ThemeProvider } from "./components/theme-provider"
import { Layout } from "./components/layout"
import { Dashboard } from "./pages/Dashboard"
import { Products } from "./pages/Products"
import { Settings } from "./pages/Settings"
import { Categories } from "./pages/Categories"
import { AddDetails } from "./pages/AddDetails"
import { ProductDetails } from "./pages/ProductDetails"
import { Login } from "./pages/Login"
import { Verification } from "./pages/Verification"
import { AuthProvider, useAuth } from "./lib/auth-context"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="dnd-admin-theme">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="categories" element={<Categories />} />
              <Route path="add-details" element={<AddDetails />} />
              <Route path="products" element={<Products />} />
              <Route path="view-product" element={<ProductDetails />} />
              <Route path="verification" element={<Verification />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
