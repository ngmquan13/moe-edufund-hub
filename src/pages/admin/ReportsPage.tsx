import React, { useState } from 'react';
import { FileText, Download, BarChart3, Users, DollarSign } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useDataStore } from '@/hooks/useDataStore';
import { getTransactions, getEducationAccounts, getAccountHolders } from '@/lib/dataStore';
import { formatCurrency } from '@/lib/data';

const ReportsPage: React.FC = () => {
  const transactions = useDataStore(getTransactions);
  const accounts = useDataStore(getEducationAccounts);
  const holders = useDataStore(getAccountHolders);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredTransactions = transactions.filter(txn => {
    if (!startDate && !endDate) return true;
    const txnDate = new Date(txn.createdAt);
    if (startDate && txnDate < new Date(startDate)) return false;
    if (endDate && txnDate > new Date(endDate + 'T23:59:59')) return false;
    return true;
  });

  const activeAccounts = accounts.filter(a => a.status === 'active').length;
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalTransactions = filteredTransactions.length;

  const handleExport = (type: string) => {
    toast({
      title: "Export Started",
      description: `Exporting ${type} report as CSV...`,
    });
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="Reports" 
        description="View system reports and analytics"
      />

      {/* Date Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{activeAccounts}</p>
            <p className="text-muted-foreground">of {accounts.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{formatCurrency(totalBalance)}</p>
            <p className="text-muted-foreground">across all accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-info">{totalTransactions}</p>
            <p className="text-muted-foreground">in selected period</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
          <CardDescription>Export reports for analysis</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Button variant="outline" className="justify-start h-auto py-4" onClick={() => handleExport('accounts')}>
            <FileText className="h-5 w-5 mr-3" />
            <div className="text-left">
              <p className="font-medium">Account Summary Report</p>
              <p className="text-sm text-muted-foreground">All accounts with balances and status</p>
            </div>
          </Button>
          <Button variant="outline" className="justify-start h-auto py-4" onClick={() => handleExport('enrolments')}>
            <FileText className="h-5 w-5 mr-3" />
            <div className="text-left">
              <p className="font-medium">Enrolment Report</p>
              <p className="text-sm text-muted-foreground">Course enrolments by student</p>
            </div>
          </Button>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default ReportsPage;