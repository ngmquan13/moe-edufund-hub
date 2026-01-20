import React, { useState, useMemo } from 'react';
import { TrendingUp, CreditCard, Receipt, Filter, Eye, CheckCircle2, XCircle, Wallet, Search, Calendar, X } from 'lucide-react';
import { CitizenLayout } from '@/components/layouts/CitizenLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/hooks/useDataStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  getEducationAccountByHolder,
  getTransactionsByAccount
} from '@/lib/dataStore';
import {
  formatCurrency,
  formatDateTime,
  TransactionType,
  Transaction
} from '@/lib/data';
import { format, isAfter, isBefore, startOfDay, endOfDay, isValid } from 'date-fns';

const TransactionsPage: React.FC = () => {
  const { citizenUser } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  const account = citizenUser ? getEducationAccountByHolder(citizenUser.id) : null;
  
  // Force re-render when data changes
  useDataStore(() => account);
  
  const allTransactions = account ? getTransactionsByAccount(account.id) : [];
  
  // Sort transactions by newest first
  const sortedTransactions = [...allTransactions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Filter transactions - treat 'payment' as 'charge' for display purposes
  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter(txn => {
      // Type filter - map 'payment' to 'charge'
      const effectiveType = txn.type === 'payment' ? 'charge' : txn.type;
      if (typeFilter !== 'all' && effectiveType !== typeFilter) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const description = (txn.externalDescription || txn.description || '').toLowerCase();
        const id = txn.id.toLowerCase();
        if (!description.includes(query) && !id.includes(query)) {
          return false;
        }
      }
      
      // Date range filter
      const txnDate = new Date(txn.createdAt);
      if (fromDate && isValid(fromDate)) {
        if (isBefore(txnDate, startOfDay(fromDate))) {
          return false;
        }
      }
      if (toDate && isValid(toDate)) {
        if (isAfter(txnDate, endOfDay(toDate))) {
          return false;
        }
      }
      
      return true;
    });
  }, [sortedTransactions, typeFilter, searchQuery, fromDate, toDate]);

  const clearFilters = () => {
    setSearchQuery('');
    setFromDate(undefined);
    setToDate(undefined);
    setTypeFilter('all');
  };

  const hasActiveFilters = searchQuery || fromDate || toDate || typeFilter !== 'all';

  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'top_up':
        return <TrendingUp className="h-5 w-5 text-success" />;
      case 'payment':
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
    // Use the stored description which already includes cycle info
    // Format: "Course Fee - CODE1 (Cycle 1 - Jan 2025)" or "Course Fee - CODE1 (Cycle 1), CODE2 (Cycle 2)"
    const displayDescription = txn.externalDescription || txn.description;
    
    // If it's a course payment with proper format, use it directly
    if (displayDescription && displayDescription.startsWith('Course Fee -')) {
      return displayDescription;
    }
    
    // For top-ups, show the external description if available
    if (txn.type === 'top_up') {
      return txn.externalDescription || 'Account Top-up';
    }
    
    return displayDescription || 'Transaction';
  };

  const getPaymentMethodBadge = (txn: Transaction) => {
    if (!txn.paymentMethod) return null;
    
    switch (txn.paymentMethod) {
      case 'balance':
        return (
          <Badge variant="outline" className="gap-1">
            <Wallet className="h-3 w-3" />
            Balance
          </Badge>
        );
      case 'card':
        return (
          <Badge variant="outline" className="gap-1">
            <CreditCard className="h-3 w-3" />
            Card
          </Badge>
        );
      case 'combined':
        return (
          <Badge variant="outline" className="gap-1">
            <Wallet className="h-3 w-3" />
            Combined
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleViewDetails = (txn: Transaction) => {
    setSelectedTransaction(txn);
    setDetailDialogOpen(true);
  };

  const formatDateDisplay = (date: Date | undefined) => {
    if (!date || !isValid(date)) return '';
    return format(date, 'dd/MM/yyyy');
  };

  return (
    <CitizenLayout>
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
        <p className="mt-1 text-muted-foreground">
          View all your account transactions
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6 animate-slide-up">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by description or transaction ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-wrap items-end gap-4">
              {/* Type Filter */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="top_up">Top-ups</SelectItem>
                    <SelectItem value="charge">Charges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* From Date */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {fromDate ? formatDateDisplay(fromDate) : <span className="text-muted-foreground">Select</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      disabled={(date) => toDate ? isAfter(date, toDate) : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* To Date */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {toDate ? formatDateDisplay(toDate) : <span className="text-muted-foreground">Select</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      disabled={(date) => fromDate ? isBefore(date, fromDate) : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
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
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-sm text-muted-foreground">{formatDateTime(txn.createdAt)}</span>
                        {getStatusBadge(txn.status)}
                        {getPaymentMethodBadge(txn)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`text-lg font-semibold ${txn.amount > 0 ? 'text-success' : 'text-foreground'}`}>
                      {txn.amount > 0 ? '+' : ''}{formatCurrency(txn.amount)}
                    </p>
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

              {/* Course List (for multi-course payments) */}
              {selectedTransaction.courses && selectedTransaction.courses.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Courses Paid</h4>
                  <div className="space-y-2">
                    {selectedTransaction.courses.map((course, index) => (
                      <div key={index} className="flex justify-between items-center py-2 px-3 rounded-lg bg-secondary/50">
                        <div>
                          <span className="text-sm font-medium">{course.courseName}</span>
                          <span className="text-xs text-muted-foreground ml-2">({course.courseCode})</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatCurrency(course.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                </div>
              )}

              {/* Payment Breakdown (for combined payments) */}
              {selectedTransaction.paymentBreakdown && selectedTransaction.paymentBreakdown.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Payment Breakdown</h4>
                  <div className="space-y-2">
                    {selectedTransaction.paymentBreakdown.map((breakdown, index) => (
                      <div key={index} className="flex justify-between items-center py-2 px-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2">
                          {breakdown.method === 'balance' ? (
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">
                            {breakdown.method === 'balance' ? 'Account Balance' : `Card •••• ${breakdown.cardLast4}`}
                          </span>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(breakdown.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                </div>
              )}

              {/* Transaction Info */}
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description</span>
                  <span className="font-medium text-right max-w-[200px]">
                    {selectedTransaction.externalDescription || getTransactionTitle(selectedTransaction)}
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
                {/* Only show Reference when card payment is involved */}
                {(selectedTransaction.paymentMethod === 'card' || selectedTransaction.paymentMethod === 'combined') && selectedTransaction.reference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono text-sm">{selectedTransaction.reference}</span>
                  </div>
                )}
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
