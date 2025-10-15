import { QueryClient } from "@tanstack/react-query";

/**
 * Invalidates all wallet-related queries to refresh wallet data across the app
 * Should be called after any wallet transaction (booking, refund, admin credit/debit, etc.)
 */
export const invalidateWalletQueries = (queryClient: QueryClient) => {
  // Invalidate all possible wallet query keys used across the app
  queryClient.invalidateQueries({ queryKey: ["/api/wallet/summary"] });
  queryClient.invalidateQueries({ queryKey: ["wallet-summary"] });
  queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
  queryClient.invalidateQueries({ queryKey: ["wallet"] });
  
  // Also invalidate appointment queries since they affect wallet balance
  queryClient.invalidateQueries({ queryKey: ["/api/patient/appointments"] });
  queryClient.invalidateQueries({ queryKey: ["appointments"] });
};

/**
 * Common wallet-related query keys used across the application
 */
export const WALLET_QUERY_KEYS = {
  SUMMARY: ["/api/wallet/summary"],
  WALLET_SUMMARY: ["wallet-summary"], 
  TRANSACTIONS: ["wallet-transactions"],
  WALLET: ["wallet"],
} as const;