import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeModeProvider } from "../helpers/themeMode";
import { TooltipProvider } from "./Tooltip";
import { SonnerToaster } from "./SonnerToaster";
import { ScrollToHashElement } from "./ScrollToHashElement";
import { SocketRealtimeProvider } from "./SocketRealtimeProvider";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
});

export const GlobalContextProviders = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <SocketRealtimeProvider>
      <ThemeModeProvider>
        <ScrollToHashElement />
        <TooltipProvider>
          {children}
          <SonnerToaster />
        </TooltipProvider>
      </ThemeModeProvider>
    </SocketRealtimeProvider>
  </QueryClientProvider>
);
