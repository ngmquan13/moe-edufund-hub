import React, { useState } from 'react';
import { Play, Eye, Search, X, Calendar as CalendarIcon, Upload, TrendingUp, DollarSign, Clock, Download } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from '@/hooks/use-toast';
import { useDataStore } from '@/hooks/useDataStore';
import { 
  getEducationAccounts, 
  getBatches,
  getTransactions,
  getAccountHolder, 
  addTransaction, 
  updateEducationAccount,
  addBatch,
  addAuditLog,
  getEducationAccount
} from '@/lib/dataStore';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/data';
import { cn } from '@/lib/utils';
import { format, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';

const TopUpManagementPage: React.FC = () => {
  const educationAccounts = useDataStore(getEducationAccounts);
  const batches = useDataStore(getBatches);
  const transactions = useDataStore(getTransactions);
  
  const [individualDialogOpen, setIndividualDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  
  // Individual top-up states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [scheduleTopUp, setScheduleTopUp] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  
  // Batch top-up states
  const [batchAmount, setBatchAmount] = useState('');
  const [batchAmountType, setBatchAmountType] = useState<'even' | 'per_account'>('per_account');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [minBalance, setMinBalance] = useState('');
  const [maxBalance, setMaxBalance] = useState('');
  const [schoolingStatus, setSchoolingStatus] = useState<string>('all');
  const [batchScheduleTopUp, setBatchScheduleTopUp] = useState(false);
  const [batchScheduledDate, setBatchScheduledDate] = useState<Date | undefined>();
  const [showPreview, setShowPreview] = useState(false);
  const [batchReason, setBatchReason] = useState('');
  
  // Success result
  const [successResult, setSuccessResult] = useState<{
    type: 'individual' | 'batch';
    count: number;
    total: number;
    scheduled?: boolean;
  } | null>(null);

  // Calculate top-up statistics
  const now = new Date();
  const topUpTransactions = transactions.filter(t => t.type === 'top_up' && t.status === 'completed');
  
  const todayStr = now.toISOString().split('T')[0];
  const todayTopUps = topUpTransactions.filter(t => t.createdAt.startsWith(todayStr));
  const todayTotal = todayTopUps.reduce((sum, t) => sum + t.amount, 0);
  
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekTopUps = topUpTransactions.filter(t => new Date(t.createdAt) >= weekStart);
  const weekTotal = weekTopUps.reduce((sum, t) => sum + t.amount, 0);
  
  const monthStart = startOfMonth(now);
  const monthTopUps = topUpTransactions.filter(t => new Date(t.createdAt) >= monthStart);
  const monthTotal = monthTopUps.reduce((sum, t) => sum + t.amount, 0);
  
  const quarterStart = startOfQuarter(now);
  const quarterTopUps = topUpTransactions.filter(t => new Date(t.createdAt) >= quarterStart);
  const quarterTotal = quarterTopUps.reduce((sum, t) => sum + t.amount, 0);
  
  const yearStart = startOfYear(now);
  const yearTopUps = topUpTransactions.filter(t => new Date(t.createdAt) >= yearStart);
  const yearTotal = yearTopUps.reduce((sum, t) => sum + t.amount, 0);

  // Get scheduled/upcoming top-ups
  const scheduledTopUps = transactions.filter(t => t.type === 'top_up' && t.status === 'pending');
  const scheduledBatches = batches.filter(b => b.type === 'top_up' && b.status === 'pending');

  const filteredAccounts = educationAccounts.filter(account => {
    const holder = getAccountHolder(account.holderId);
    if (!holder) return false;
    const matchesSearch = 
      holder.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      holder.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && account.status === 'active';
  });

  const getEligibleAccounts = () => {
    return educationAccounts.filter(account => {
      if (account.status !== 'active') return false;
      
      const holder = getAccountHolder(account.holderId);
      if (!holder) return false;

      if (minAge && holder.age < parseInt(minAge)) return false;
      if (maxAge && holder.age > parseInt(maxAge)) return false;
      if (minBalance && account.balance < parseFloat(minBalance)) return false;
      if (maxBalance && account.balance > parseFloat(maxBalance)) return false;
      if (schoolingStatus !== 'all' && holder.schoolingStatus !== schoolingStatus) return false;

      return true;
    });
  };

  const handleSelectAccount = (accountId: string, checked: boolean) => {
    if (checked) {
      setSelectedAccountIds([...selectedAccountIds, accountId]);
    } else {
      setSelectedAccountIds(selectedAccountIds.filter(id => id !== accountId));
    }
  };

  const handleIndividualTopUp = () => {
    if (selectedAccountIds.length === 0 || !amount || !reason) {
      toast({
        title: "Validation Error",
        description: "Please select accounts and fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount.",
        variant: "destructive",
      });
      return;
    }

    if (scheduleTopUp && !scheduledDate) {
      toast({
        title: "Validation Error",
        description: "Please select a scheduled date.",
        variant: "destructive",
      });
      return;
    }

    // Process each account
    selectedAccountIds.forEach(accountId => {
      const account = getEducationAccount(accountId);
      if (!account) return;

      const newBalance = account.balance + amountNum;
      const transactionId = `TXN${String(Date.now()).slice(-6)}${accountId}`;

      addTransaction({
        id: transactionId,
        accountId: accountId,
        type: 'top_up',
        amount: amountNum,
        balanceAfter: newBalance,
        description: reason,
        reference: `INDIV-${transactionId}`,
        status: scheduleTopUp ? 'pending' : 'completed',
        createdAt: new Date().toISOString(),
      });

      if (!scheduleTopUp) {
        updateEducationAccount(accountId, {
          balance: newBalance,
          lastTopUpDate: new Date().toISOString().split('T')[0],
        });
      }
    });

    addAuditLog({
      id: `AUD${String(Date.now()).slice(-6)}`,
      action: scheduleTopUp ? 'Scheduled Top-up' : 'Individual Top-up',
      entityType: 'Transaction',
      entityId: 'Multiple',
      userId: 'USR001',
      userName: 'Admin User',
      details: `Individual top-up of ${formatCurrency(amountNum)} for ${selectedAccountIds.length} account(s)${scheduleTopUp ? ` scheduled for ${format(scheduledDate!, 'PPP')}` : ''}`,
      createdAt: new Date().toISOString(),
    });

    setSuccessResult({
      type: 'individual',
      count: selectedAccountIds.length,
      total: amountNum * selectedAccountIds.length,
      scheduled: scheduleTopUp,
    });
    setIndividualDialogOpen(false);
    setSuccessDialogOpen(true);
    resetIndividualForm();
  };

  const handleBatchTopUp = () => {
    if (!batchAmount) {
      toast({
        title: "Validation Error",
        description: "Please enter an amount.",
        variant: "destructive",
      });
      return;
    }

    if (!batchReason) {
      toast({
        title: "Validation Error",
        description: "Please enter a reason.",
        variant: "destructive",
      });
      return;
    }

    if (batchScheduleTopUp && !batchScheduledDate) {
      toast({
        title: "Validation Error",
        description: "Please select a scheduled date.",
        variant: "destructive",
      });
      return;
    }

    const eligibleAccounts = getEligibleAccounts();
    if (eligibleAccounts.length === 0) {
      toast({
        title: "No Eligible Accounts",
        description: "No accounts match the selected criteria.",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(batchAmount);
    const amountPerAccount = batchAmountType === 'even' 
      ? amountNum / eligibleAccounts.length 
      : amountNum;
    const totalAmount = batchAmountType === 'even' 
      ? amountNum 
      : amountNum * eligibleAccounts.length;

    const batchId = `BAT${String(Date.now()).slice(-6)}`;
    addBatch({
      id: batchId,
      type: 'top_up',
      description: batchReason,
      totalAmount,
      accountCount: eligibleAccounts.length,
      status: batchScheduleTopUp ? 'pending' : 'completed',
      createdAt: new Date().toISOString(),
      createdBy: 'Admin User',
    });

    if (!batchScheduleTopUp) {
      eligibleAccounts.forEach(account => {
        const newBalance = account.balance + amountPerAccount;
        const transactionId = `TXN${String(Date.now()).slice(-6)}${account.id}`;

        addTransaction({
          id: transactionId,
          accountId: account.id,
          type: 'top_up',
          amount: amountPerAccount,
          balanceAfter: newBalance,
          description: batchReason,
          reference: `${batchId}-${account.id}`,
          status: 'completed',
          createdAt: new Date().toISOString(),
        });

        updateEducationAccount(account.id, {
          balance: newBalance,
          lastTopUpDate: new Date().toISOString().split('T')[0],
        });
      });
    }

    addAuditLog({
      id: `AUD${String(Date.now()).slice(-6)}`,
      action: batchScheduleTopUp ? 'Scheduled Batch Top-up' : 'Batch Top-up',
      entityType: 'Batch',
      entityId: batchId,
      userId: 'USR001',
      userName: 'Admin User',
      details: `Batch top-up - ${eligibleAccounts.length} accounts, ${formatCurrency(totalAmount)}${batchScheduleTopUp ? ` scheduled for ${format(batchScheduledDate!, 'PPP')}` : ''}`,
      createdAt: new Date().toISOString(),
    });

    setSuccessResult({
      type: 'batch',
      count: eligibleAccounts.length,
      total: totalAmount,
      scheduled: batchScheduleTopUp,
    });
    setBatchDialogOpen(false);
    setSuccessDialogOpen(true);
    resetBatchForm();
  };

  const resetIndividualForm = () => {
    setSearchQuery('');
    setSelectedAccountIds([]);
    setAmount('');
    setReason('');
    setScheduleTopUp(false);
    setScheduledDate(undefined);
  };

  const resetBatchForm = () => {
    setBatchAmount('');
    setBatchAmountType('per_account');
    setMinAge('');
    setMaxAge('');
    setMinBalance('');
    setMaxBalance('');
    setSchoolingStatus('all');
    setBatchScheduleTopUp(false);
    setBatchScheduledDate(undefined);
    setShowPreview(false);
    setBatchReason('');
  };

  const handleExport = (type: string) => {
    toast({
      title: "Export Started",
      description: `Exporting ${type} report as CSV...`,
    });
  };

  const eligibleAccounts = getEligibleAccounts();
  const topUpBatches = batches.filter(b => b.type === 'top_up');

  return (
    <AdminLayout>
      <PageHeader 
        title="Top-up Management" 
        description="Manage individual and batch top-ups"
      />

      {/* Optimized Mini Dashboard */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Top-up Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">Today</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(todayTotal)}</p>
              <p className="text-xs text-muted-foreground">{todayTopUps.length} top-ups</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">This Week</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(weekTotal)}</p>
              <p className="text-xs text-muted-foreground">{weekTopUps.length} top-ups</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">This Month</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(monthTotal)}</p>
              <p className="text-xs text-muted-foreground">{monthTopUps.length} top-ups</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">This Quarter</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(quarterTotal)}</p>
              <p className="text-xs text-muted-foreground">{quarterTopUps.length} top-ups</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">This Year</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(yearTotal)}</p>
              <p className="text-xs text-muted-foreground">{yearTopUps.length} top-ups</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50"
          onClick={() => {
            resetIndividualForm();
            setIndividualDialogOpen(true);
          }}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                <Search className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Individual Top-up</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Top up one or more specific accounts
              </p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50"
          onClick={() => {
            resetBatchForm();
            setBatchDialogOpen(true);
          }}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-info/10 mb-4">
                <Upload className="h-7 w-7 text-info" />
              </div>
              <h3 className="text-lg font-semibold">Batch Top-up</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Top up multiple accounts based on rules
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled/Upcoming Top-ups */}
      {(scheduledTopUps.length > 0 || scheduledBatches.length > 0) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Top-ups
            </CardTitle>
            <CardDescription>Scheduled top-ups pending execution</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledBatches.map(batch => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono">{batch.id}</TableCell>
                    <TableCell><Badge variant="secondary">Batch</Badge></TableCell>
                    <TableCell>{batch.description}</TableCell>
                    <TableCell>{batch.accountCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(batch.totalAmount)}</TableCell>
                    <TableCell>{formatDateTime(batch.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="warning">Scheduled</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {scheduledTopUps.slice(0, 5).map(txn => {
                  const account = getEducationAccount(txn.accountId);
                  const holder = account ? getAccountHolder(account.holderId) : null;
                  return (
                    <TableRow key={txn.id}>
                      <TableCell className="font-mono">{txn.id}</TableCell>
                      <TableCell><Badge variant="outline">Individual</Badge></TableCell>
                      <TableCell>{txn.description}</TableCell>
                      <TableCell>{holder ? `${holder.firstName} ${holder.lastName}` : txn.accountId}</TableCell>
                      <TableCell className="text-right">{formatCurrency(txn.amount)}</TableCell>
                      <TableCell>{formatDateTime(txn.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="warning">Scheduled</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Top-up Transactions Report */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top-up Transactions</CardTitle>
            <CardDescription>Detailed list of all top-up transactions</CardDescription>
          </div>
          <Button variant="outline" onClick={() => handleExport('top-up')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topUpTransactions.slice(0, 20).map(txn => {
                const account = getEducationAccount(txn.accountId);
                const holder = account ? getAccountHolder(account.holderId) : null;

                return (
                  <TableRow key={txn.id}>
                    <TableCell>{formatDateTime(txn.createdAt)}</TableCell>
                    <TableCell className="font-mono text-sm">{txn.id}</TableCell>
                    <TableCell>
                      {holder ? `${holder.firstName} ${holder.lastName}` : txn.accountId}
                    </TableCell>
                    <TableCell>{txn.description}</TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      +{formatCurrency(txn.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{txn.reference}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Batches */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Top-up History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Accounts</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topUpBatches.slice(0, 10).map(batch => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono">{batch.id}</TableCell>
                  <TableCell>{batch.description}</TableCell>
                  <TableCell>{batch.accountCount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(batch.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge variant={batch.status === 'completed' ? 'success' : batch.status === 'pending' ? 'warning' : 'destructive'}>
                      {batch.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(batch.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Individual Top-up Dialog */}
      <Dialog open={individualDialogOpen} onOpenChange={setIndividualDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Individual Top-up</DialogTitle>
            <DialogDescription>
              Select one or more accounts to top up
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Account Search */}
            <div className="space-y-2">
              <Label>Search Accounts</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or account ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Selected Accounts */}
            {selectedAccountIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedAccountIds.map(id => {
                  const account = educationAccounts.find(a => a.id === id);
                  const holder = account ? getAccountHolder(account.holderId) : null;
                  return (
                    <Badge key={id} variant="secondary" className="pl-2 pr-1 py-1">
                      {holder ? `${holder.firstName} ${holder.lastName}` : id}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 hover:bg-transparent"
                        onClick={() => handleSelectAccount(id, false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Account List */}
            {searchQuery && (
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {filteredAccounts.slice(0, 10).map(account => {
                  const holder = getAccountHolder(account.holderId);
                  const isSelected = selectedAccountIds.includes(account.id);
                  
                  return (
                    <div
                      key={account.id}
                      className={cn(
                        "flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/50",
                        isSelected && "bg-primary/10"
                      )}
                      onClick={() => handleSelectAccount(account.id, !isSelected)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isSelected} />
                        <div>
                          <p className="font-medium">{holder?.firstName} {holder?.lastName}</p>
                          <p className="text-sm text-muted-foreground">{account.id}</p>
                        </div>
                      </div>
                      <span className="text-sm">{formatCurrency(account.balance)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount (SGD) *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Reason - Large Textarea */}
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                placeholder="e.g., Annual Education Grant, Youth Subsidy, Manual Top-up..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>

            {/* Schedule Top-up */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="schedule"
                  checked={scheduleTopUp}
                  onCheckedChange={(checked) => setScheduleTopUp(checked as boolean)}
                />
                <Label htmlFor="schedule">Schedule Top-up</Label>
              </div>
              
              {scheduleTopUp && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIndividualDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleIndividualTopUp}>
              <Play className="h-4 w-4 mr-2" />
              {scheduleTopUp ? 'Schedule' : 'Execute'} Top-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Top-up Dialog - Simplified */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Top-up</DialogTitle>
            <DialogDescription>
              Configure rules to top up multiple accounts at once
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Rules */}
            <div className="space-y-4">
              <h4 className="font-medium">Filter Rules</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Age</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 16"
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Age</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 29"
                    value={maxAge}
                    onChange={(e) => setMaxAge(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Balance (SGD)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 0"
                    value={minBalance}
                    onChange={(e) => setMinBalance(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Balance (SGD)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 500"
                    value={maxBalance}
                    onChange={(e) => setMaxBalance(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Schooling Status</Label>
                <Select value={schoolingStatus} onValueChange={setSchoolingStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="in_school">In School</SelectItem>
                    <SelectItem value="graduated">Graduated</SelectItem>
                    <SelectItem value="deferred">Deferred</SelectItem>
                    <SelectItem value="dropped_out">Dropped Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Amount Configuration */}
            <div className="space-y-4">
              <h4 className="font-medium">Amount Configuration</h4>
              
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Amount (SGD) *</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={batchAmount}
                    onChange={(e) => setBatchAmount(e.target.value)}
                  />
                </div>
                <RadioGroup 
                  value={batchAmountType} 
                  onValueChange={(v) => setBatchAmountType(v as 'even' | 'per_account')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="per_account" id="per_account" />
                    <Label htmlFor="per_account">Per Account</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="even" id="even" />
                    <Label htmlFor="even">Distribute Evenly</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                placeholder="e.g., Annual Education Subsidy, Youth Education Grant..."
                value={batchReason}
                onChange={(e) => setBatchReason(e.target.value)}
                rows={3}
              />
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="batchSchedule"
                  checked={batchScheduleTopUp}
                  onCheckedChange={(checked) => setBatchScheduleTopUp(checked as boolean)}
                />
                <Label htmlFor="batchSchedule">Schedule Top-up</Label>
              </div>
              
              {batchScheduleTopUp && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !batchScheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {batchScheduledDate ? format(batchScheduledDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={batchScheduledDate}
                      onSelect={setBatchScheduledDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Preview */}
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Hide' : 'Show'} Preview ({eligibleAccounts.length} accounts)
            </Button>

            {showPreview && eligibleAccounts.length > 0 && (
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Current Balance</TableHead>
                      <TableHead className="text-right">Top-up Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleAccounts.slice(0, 10).map(account => {
                      const holder = getAccountHolder(account.holderId);
                      const topUpAmount = batchAmountType === 'even' 
                        ? parseFloat(batchAmount || '0') / eligibleAccounts.length 
                        : parseFloat(batchAmount || '0');
                      
                      return (
                        <TableRow key={account.id}>
                          <TableCell>{holder?.firstName} {holder?.lastName}</TableCell>
                          <TableCell>{formatCurrency(account.balance)}</TableCell>
                          <TableCell className="text-right text-success">+{formatCurrency(topUpAmount)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBatchTopUp}>
              <Play className="h-4 w-4 mr-2" />
              {batchScheduleTopUp ? 'Schedule' : 'Execute'} Batch Top-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              Top-up {successResult?.scheduled ? 'Scheduled' : 'Successful'}
            </DialogTitle>
          </DialogHeader>
          
          {successResult && (
            <div className="py-4 space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-success">{formatCurrency(successResult.total)}</p>
                <p className="text-muted-foreground">
                  {successResult.scheduled ? 'Scheduled for' : 'Credited to'} {successResult.count} account(s)
                </p>
              </div>
              
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">{successResult.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Accounts</span>
                  <span className="font-medium">{successResult.count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-medium">{formatCurrency(successResult.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={successResult.scheduled ? 'warning' : 'success'}>
                    {successResult.scheduled ? 'Scheduled' : 'Completed'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setSuccessDialogOpen(false)} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default TopUpManagementPage;