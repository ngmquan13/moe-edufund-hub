import React, { useState } from 'react';
import { TrendingUp, CreditCard, Receipt, Filter, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { CitizenLayout } from '@/components/layouts/CitizenLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getEducationAccount,
  getTransactionsByAccount,
  formatCurrency,
  formatDateTime,
  formatDate,
  TransactionType,
  Transaction
} from '@/lib/data';

const TransactionsPage: React.FC = () => {
  const { citizenUser } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  const account = citizenUser ? getEducationAccount(citizenUser.accountId) : null;
  const allTransactions = account ? getTransactionsByAccount(account.id) : [];
  
  // Sort transactions by newest first
  const sortedTransactions = [...allTransactions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  const filteredTransactions = sortedTransactions.filter(txn => 
    typeFilter === 'all' || txn.type === typeFilter
  );

  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'top_up':
        return <TrendingUp className="h-5 w-5 text-success" />;
      case 'payment':
        return <CreditCard className="h-5 w-5 text-info" />;
      case 'charge':
        return <Receipt className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTransactionTitle = (txn: Transaction) => {
    // Use external description if available, otherwise use internal description
    if (txn.externalDescription) {
      return txn.externalDescription;
    }
    
    // Parse the description to make it more user-friendly
    const desc = txn.description;
    
    // Check if it mentions multiple courses
    if (desc.includes('courses')) {
      const match = desc.match(/(\d+)\s*courses/i);
      if (match) {
        return `Payment for ${match[1]} courses`;
      }
    }
    
    // For single course payment
    if (desc.toLowerCase().includes('payment for')) {
      return desc;
    }
    
    // For top-ups
    if (txn.type === 'top_up') {
      return 'Account Top-up';
    }
    
    return desc;
  };

  const handleViewDetails = (txn: Transaction) => {
    setSelectedTransaction(txn);
    setDetailDialogOpen(true);
  };

  return (
    <CitizenLayout>
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
        <p className="mt-1 text-muted-foreground">
          View all your account transactions
        </p>
      </div>

      {/* Filter */}
      <Card className="mb-6 animate-slide-up">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="top_up">Top-ups</SelectItem>
                <SelectItem value="charge">Charges</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <CardHeader>
          <CardTitle className="text-lg">
            {filteredTransactions.length} Transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length > 0 ? (
            <div className="space-y-3">
              {filteredTransactions.map((txn) => (
                <div 
                  key={txn.id} 
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-secondary/50 cursor-pointer"
                  onClick={() => handleViewDetails(txn)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      txn.type === 'top_up' ? 'bg-success/10' : 
                      txn.type === 'payment' ? 'bg-info/10' : 'bg-muted'
                    }`}>
                      {getTypeIcon(txn.type)}
                    </div>
                    <div>
                      <p className="font-medium">{getTransactionTitle(txn)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">{formatDateTime(txn.createdAt)}</span>
                        {getStatusBadge(txn.status)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${txn.amount > 0 ? 'text-success' : 'text-foreground'}`}>
                        {txn.amount > 0 ? '+' : ''}{formatCurrency(txn.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Balance: {formatCurrency(txn.balanceAfter)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium text-foreground">No transactions found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {typeFilter !== 'all' ? 'Try changing the filter' : 'Your transactions will appear here'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              View transaction information
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-6 pt-4">
              {/* Status Icon */}
              <div className="text-center">
                <div className={`inline-flex h-16 w-16 items-center justify-center rounded-full mb-4 ${
                  selectedTransaction.status === 'completed' ? 'bg-success/10' : 'bg-destructive/10'
                }`}>
                  {selectedTransaction.status === 'completed' ? (
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  ) : (
                    <XCircle className="h-8 w-8 text-destructive" />
                  )}
                </div>
                <h3 className="text-xl font-bold">
                  {selectedTransaction.amount > 0 ? '+' : ''}{formatCurrency(selectedTransaction.amount)}
                </h3>
                <div className="mt-2">
                  {getStatusBadge(selectedTransaction.status)}
                </div>
              </div>

              <Separator />

              {/* Transaction Info */}
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description</span>
                  <span className="font-medium text-right max-w-[200px]">
                    {getTransactionTitle(selectedTransaction)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date & Time</span>
                  <span className="font-medium">{formatDateTime(selectedTransaction.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-sm">{selectedTransaction.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono text-sm">{selectedTransaction.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance After</span>
                  <span className="font-medium">{formatCurrency(selectedTransaction.balanceAfter)}</span>
                </div>
                {selectedTransaction.period && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Period</span>
                    <span className="font-medium">{selectedTransaction.period}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CitizenLayout>
  );
};

export default TransactionsPage;
