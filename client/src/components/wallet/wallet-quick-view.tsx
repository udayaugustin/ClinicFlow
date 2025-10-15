import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, ExternalLink } from 'lucide-react';
import { useLocation } from 'wouter';

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

export function WalletQuickView() {
  const [, setLocation] = useLocation();
  const { data: walletSummary, isLoading, error } = useQuery<WalletSummary>({
    queryKey: ['/api/wallet/summary'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4" />
            My Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-6 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !walletSummary) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4" />
            My Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Unable to load wallet</p>
        </CardContent>
      </Card>
    );
  }

  const { wallet } = walletSummary;
  const balance = parseFloat(wallet.balance);
  const totalEarned = parseFloat(wallet.totalEarned);
  const totalSpent = parseFloat(wallet.totalSpent);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4" />
            My Wallet
          </CardTitle>
          {wallet.isActive ? (
            <Badge variant="default" className="bg-green-500 text-xs">Active</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">Inactive</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Balance */}
        <div className="text-center">
          <p className="text-xl font-bold text-green-600">₹{balance.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Available Balance</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded">
            <p className="font-semibold text-green-600">₹{totalEarned.toFixed(0)}</p>
            <p className="text-green-700 dark:text-green-400">Earned</p>
          </div>
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-950 rounded">
            <p className="font-semibold text-blue-600">₹{totalSpent.toFixed(0)}</p>
            <p className="text-blue-700 dark:text-blue-400">Spent</p>
          </div>
        </div>

        {/* View Details Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-xs"
          onClick={() => setLocation('/patient/wallet')}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View Details
        </Button>

        {/* Recent Activity Indicator */}
        {walletSummary.recentTransactions.length > 0 && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {walletSummary.stats.totalTransactions} total transactions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}