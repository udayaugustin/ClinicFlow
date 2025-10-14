import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface WalletSummary {
  wallet: {
    id: number;
    balance: string;
    totalEarned: string;
    totalSpent: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  recentTransactions: any[];
  stats: {
    totalTransactions: number;
    totalRefunds: number;
    totalSpent: number;
  };
}

export function WalletBalance() {
  const { data: walletSummary, isLoading, error } = useQuery<WalletSummary>({
    queryKey: ['/api/wallet/summary'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            My Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !walletSummary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            My Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Unable to load wallet information</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { wallet, stats } = walletSummary;
  const balance = parseFloat(wallet.balance);
  const totalEarned = parseFloat(wallet.totalEarned);
  const totalSpent = parseFloat(wallet.totalSpent);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            My Wallet
          </div>
          {wallet.isActive ? (
            <Badge variant="default" className="bg-green-500">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Balance */}
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">₹{balance.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">Available Balance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">Total Earned</p>
              <p className="text-lg font-bold text-green-800 dark:text-green-300">₹{totalEarned.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <TrendingDown className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Spent</p>
              <p className="text-lg font-bold text-blue-800 dark:text-blue-300">₹{totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Transaction Stats */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-600" />
            <span className="text-sm text-muted-foreground">Total Transactions</span>
          </div>
          <span className="font-semibold">{stats.totalTransactions}</span>
        </div>

        {/* Quick Actions */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Wallet balance is used for appointment payments and receives refunds automatically
          </p>
        </div>
      </CardContent>
    </Card>
  );
}