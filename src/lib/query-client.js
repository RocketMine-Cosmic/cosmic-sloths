import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Treat data as fresh for 30s by default so sibling components
			// remounting in the same tab don't all hammer the same endpoint.
			// Cuts admin-dashboard request bursts dramatically.
			staleTime: 30_000,
			gcTime: 5 * 60_000,
		},
	},
});