import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuthListener } from "@/hooks/useAuth";
import Index from "./pages/Index";

// Route-level code splitting: only the landing page ships in the first bundle.
const Recipes = lazy(() => import("./pages/Recipes"));
const RecipeDetail = lazy(() => import("./pages/RecipeDetail"));
const Pairings = lazy(() => import("./pages/Pairings"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const RemixDetail = lazy(() => import("./pages/RemixDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const AuthListener = () => {
  useAuthListener();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <AuthListener />
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route path="/remixes/:id" element={<RemixDetail />} />
          <Route path="/pairings" element={<Pairings />} />
          <Route path="/kitchen" element={<Kitchen />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
