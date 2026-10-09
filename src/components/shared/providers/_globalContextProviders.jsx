import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeModeProvider } from "../../../helpers/themeMode";
import { TooltipProvider } from "../ui/overlays/Tooltip";
import { SonnerToaster } from "../ui/feedback/SonnerToaster";
import { ScrollToHashElement } from "../ui/layout/ScrollToHashElement";
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
