import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Visualizer from "@/pages/Visualizer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Visualizer />
    </QueryClientProvider>
  );
}

export default App;
