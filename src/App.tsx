import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuthListener } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import ScrollManager from "@/components/ScrollManager";
import Index from "./pages/Index";

// Route-level code splitting: only the landing page ships in the first bundle.
const Recipes = lazy(() => import("./pages/Recipes"));
const RecipeDetail = lazy(() => import("./pages/RecipeDetail"));
const Pairings = lazy(() => import("./pages/Pairings"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const RemixDetail = lazy(() => import("./pages/RemixDetail"));
const CookMode = lazy(() => import("./pages/CookMode"));
const Pantry = lazy(() => import("./pages/Pantry"));
const Compare = lazy(() => import("./pages/Compare"));
const Quiz = lazy(() => import("./pages/Quiz"));
const Leftovers = lazy(() => import("./pages/Leftovers"));
const Community = lazy(() => import("./pages/Community"));
const Challenge = lazy(() => import("./pages/Challenge"));
const Person = lazy(() => import("./pages/Person"));
const Ingredients = lazy(() => import("./pages/Ingredients"));
const IngredientDetail = lazy(() => import("./pages/IngredientDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const AuthListener = () => {
  useAuthListener();
  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <AuthListener />
      <BrowserRouter>
        <ScrollManager />
        <Suspense fallback={<div className="min-h-screen" />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/remixes/:id" element={<RemixDetail />} />
            <Route path="/pairings" element={<Pairings />} />
            <Route path="/kitchen" element={<Kitchen />} />
            <Route path="/cook/:id" element={<CookMode />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/leftovers" element={<Leftovers />} />
            <Route path="/community" element={<Community />} />
            <Route path="/challenge" element={<Challenge />} />
            <Route path="/people/:handle" element={<Person />} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/ingredients/:slug" element={<IngredientDetail />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
