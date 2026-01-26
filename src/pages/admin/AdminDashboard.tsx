import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Wallet, 
  TrendingUp, 
  ArrowRight,
  BookOpen
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { useDataStore } from '@/hooks/useDataStore';
import { 
  getEducationAccounts, 
  getBatches, 
  getTransactions,
  getAccountHolder,
  getCourses
} from '@/lib/dataStore';
import { formatCurrency, formatDateTime } from '@/lib/data';

// ============== Stat Card Component ==============

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  variant: 'blue' | 'green';
}

const DashboardStatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle,
  icon,
  variant
}) => {
  const bgClasses = variant === 'blue' 
    ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20'
    : 'bg-gradient-to-br from-success/5 to-success/10 border-success/20';
  
  const iconBgClasses = variant === 'blue'
    ? 'bg-primary/10 text-primary'
    : 'bg-success/10 text-success';

  return (
    <Card className={`${bgClasses} border`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClasses}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============== Main Dashboard Component ==============

const AdminDashboard: React.FC = () => {
  const educationAccounts = useDataStore(getEducationAccounts);
  const batches = useDataStore(getBatches);
  const transactions = useDataStore(getTransactions);
  const courses = useDataStore(getCourses);
  
  const [topUpTypeFilter, setTopUpTypeFilter] = useState<string>('all');
  const [topUpStatusFilter, setTopUpStatusFilter] = useState<string>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<string>('all');

  // ============== Stats Calculations ==============
  
  // Account Stats
  const totalAccounts = educationAccounts.length;
  const activeAccounts = educationAccounts.filter(ea => ea.status === 'active').length;
  
  // Top-up Stats
  const topUpTransactions = transactions.filter(t => t.type === 'top_up');
  const topUpCount = topUpTransactions.length;
  
  // Course Stats
  const totalCourses = courses.length;
  const activeCourses = courses.filter(c => c.isActive).length;
  
  // ============== Top-up History Data ==============
  
  const filteredTopUps = useMemo(() => {
    return topUpTransactions
      .filter(t => {
        // Type filter (batch or ad-hoc)
        if (topUpTypeFilter !== 'all') {
          const isBatch = t.description?.toLowerCase().includes('batch');
          if (topUpTypeFilter === 'batch' && !isBatch) return false;
          if (topUpTypeFilter === 'adhoc' && isBatch) return false;
        }
        
        // Status filter
        if (topUpStatusFilter !== 'all' && t.status !== topUpStatusFilter) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [topUpTransactions, topUpTypeFilter, topUpStatusFilter]);
  
  // ============== Latest Account Creation Data ==============
  
  const latestAccounts = useMemo(() => {
    return educationAccounts
      .filter(ea => {
        if (accountStatusFilter !== 'all' && ea.status !== accountStatusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
      .slice(0, 5);
  }, [educationAccounts, accountStatusFilter]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'destructive';
      case 'active': return 'active';
      case 'suspended': return 'suspended';
      case 'closed': return 'closed';
      default: return 'secondary';
    }
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="Dashboard" 
        description="Overview of Education Account operations"
      />

      {/* Stats Cards Row */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <DashboardStatCard
          title="Total Accounts"
          value={totalAccounts}
          subtitle={`${activeAccounts} Active`}
          icon={<Users className="h-6 w-6" />}
          variant="blue"
        />
        <DashboardStatCard
          title="Top-Ups"
          value={topUpCount > 0 ? topUpCount : 'null'}
          subtitle={topUpCount > 0 ? `${topUpCount} times` : 'times'}
          icon={<Wallet className="h-6 w-6" />}
          variant="green"
        />
        <DashboardStatCard
          title="Total Courses"
          value={totalCourses}
          subtitle={`${activeCourses} Active`}
          icon={<BookOpen className="h-6 w-6" />}
          variant="blue"
        />
      </div>

      {/* Top-up History Section */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top-up History
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={topUpTypeFilter} onValueChange={setTopUpTypeFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="adhoc">Ad-hoc</SelectItem>
                <SelectItem value="batch">Batch</SelectItem>
              </SelectContent>
            </Select>
            <Select value={topUpStatusFilter} onValueChange={setTopUpStatusFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" asChild className="text-primary">
              <Link to="/admin/topups" className="flex items-center gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTopUps.length > 0 ? (
                filteredTopUps.map(txn => {
                  const account = educationAccounts.find(ea => ea.id === txn.accountId);
                  const holder = account ? getAccountHolder(account.holderId) : null;
                  const isBatch = txn.description?.toLowerCase().includes('batch');
                  
                  return (
                    <TableRow key={txn.id}>
                      <TableCell className="font-mono text-sm">{txn.reference || txn.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell>
                        {holder ? `${holder.firstName} ${holder.lastName}` : account?.id.slice(0, 8) || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{isBatch ? 'Batch' : 'Ad-hoc'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(txn.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(txn.status)} className="capitalize">
                          {txn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(txn.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
                      <p>No top-up history found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Latest Account Creation Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Latest Account Creation
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={accountStatusFilter} onValueChange={setAccountStatusFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" asChild className="text-primary">
              <Link to="/admin/accounts" className="flex items-center gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Number</TableHead>
                <TableHead>Account Holder</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestAccounts.length > 0 ? (
                latestAccounts.map(account => {
                  const holder = getAccountHolder(account.holderId);
                  
                  return (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono text-sm">{account.id.slice(0, 12).toUpperCase()}</TableCell>
                      <TableCell className="font-medium">
                        {holder ? `${holder.firstName} ${holder.lastName}` : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {holder?.email || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(account.balance)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(account.status)} className="capitalize">
                          {account.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(account.openedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="h-8 w-8 mb-2 opacity-50" />
                      <p>No accounts found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Footer Section */}
      <footer className="border-t pt-4 mt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>System Status: Operational</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="#" className="hover:text-foreground transition-colors">Data Policy</Link>
            <span>•</span>
            <span>© {new Date().getFullYear()} Ministry of Education. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </AdminLayout>
  );
};

export default AdminDashboard;
