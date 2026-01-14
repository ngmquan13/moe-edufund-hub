import React, { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Wallet, Calendar, Phone, Mail, MapPin, CreditCard, XCircle, Clock, TrendingUp, TrendingDown, Filter, BookOpen, DollarSign, CheckCircle, Eye, EyeOff, IdCard, Activity, UserCog, Building, CalendarClock, PlayCircle } from 'lucide-react';
import { updateEducationAccount, getAuditLogs, getEducationAccounts, addAuditLog } from '@/lib/dataStore';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  getAccountHolder,
  getTransactionsByAccount,
  getOutstandingChargesByAccount,
  getCourse,
  getEnrolments
} from '@/lib/dataStore';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getSchoolingLabel,
  getRoleBadgeLabel,
  PerformerRole
} from '@/lib/data';
import { toast } from '@/hooks/use-toast';
import { useDataStore } from '@/hooks/useDataStore';

// Account Log entry type combining transactions, audit logs, and lifecycle events
interface AccountLogEntry {
  id: string;
  type: 'created' | 'activated' | 'suspended' | 'reactivated' | 'closed' | 'top_up' | 'charge' | 'payment' | 'enrolment' | 'admin_action' | 'scheduled_activation';
  title: string;
  description: string;
  amount?: number;
  balanceAfter?: number;
  performedBy?: string;
  performerRole?: PerformerRole;
  createdAt: string;
}

const AccountDetailPage: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  
  // Use dataStore with useDataStore to get reactive data for newly created accounts
  const educationAccounts = useDataStore(getEducationAccounts);
  const account = educationAccounts.find(ea => ea.id === accountId) || null;
  const holder = account ? getAccountHolder(account.holderId) : null;
  const transactions = account ? getTransactionsByAccount(account.id) : [];
  const allEnrolments = useDataStore(getEnrolments);
  const enrolments = holder ? allEnrolments.filter(e => e.holderId === holder.id) : [];
  const outstandingCharges = account ? getOutstandingChargesByAccount(account.id) : [];
  const auditLogs = useDataStore(getAuditLogs);
  
  // Pagination states
  const [coursesPage, setCoursesPage] = useState(1);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [accountLogPage, setAccountLogPage] = useState(1);
  const itemsPerPage = 5;
  
  const [showFullNric, setShowFullNric] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [newActivationDate, setNewActivationDate] = useState<Date | undefined>();

  // Helper function to get role badge variant
  const getRoleBadgeVariant = (role?: PerformerRole) => {
    switch (role) {
      case 'admin': return 'default';
      case 'finance': return 'secondary';
      case 'school_ops': return 'outline';
      case 'customer_service': return 'outline';
      case 'it_support': return 'outline';
      case 'student': return 'secondary';
      case 'system': return 'outline';
      default: return 'outline';
    }
  };

  // Build comprehensive account log
  const accountLog = useMemo((): AccountLogEntry[] => {
    if (!account || !holder) return [];
    
    const entries: AccountLogEntry[] = [];
    
    // Audit log entries related to this account - process first to capture all admin actions
    const accountAuditLogs = auditLogs.filter(log => 
      log.entityId === account.id || log.entityId === holder.id
    );
    
    // Track which events we've added from audit logs
    const hasAccountCreated = accountAuditLogs.some(log => log.action === 'Account Created');
    const hasScheduledActivation = accountAuditLogs.some(log => log.action === 'Activation Scheduled' || log.action === 'Activation Rescheduled');
    
    // Account creation - use audit log if available, otherwise fallback
    if (!hasAccountCreated) {
      entries.push({
        id: `created-${account.id}`,
        type: 'created',
        title: 'Account Created',
        description: `Education account ${account.id} was created for ${holder.firstName} ${holder.lastName}`,
        performedBy: 'System',
        performerRole: 'system',
        createdAt: account.openedAt + 'T00:00:00',
      });
    }
    
    // Activation event (if not pending_activation or not_active)
    if (account.status === 'active' || account.status === 'suspended' || account.status === 'closed') {
      entries.push({
        id: `activated-${account.id}`,
        type: 'activated',
        title: 'Account Activated',
        description: `Account was activated and ready for use`,
        performedBy: 'System',
        performerRole: 'system',
        createdAt: account.openedAt + 'T00:01:00',
      });
    }
    
    // Scheduled activation from account data if no audit log
    if (account.status === 'pending_activation' && account.scheduledActivationDate && !hasScheduledActivation) {
      entries.push({
        id: `scheduled-${account.id}`,
        type: 'scheduled_activation',
        title: 'Activation Scheduled',
        description: `This account has been set to be activated on ${format(new Date(account.scheduledActivationDate), 'dd/MM/yyyy')}`,
        performedBy: 'System',
        performerRole: 'system',
        createdAt: account.openedAt + 'T00:00:30',
      });
    }
    
    // Suspension event
    if (account.suspendedAt) {
      entries.push({
        id: `suspended-${account.id}`,
        type: 'suspended',
        title: 'Account Suspended',
        description: `Account was suspended`,
        performedBy: 'Admin User',
        performerRole: 'admin',
        createdAt: account.suspendedAt + 'T00:00:00',
      });
    }
    
    // Closed event
    if (account.closedAt) {
      entries.push({
        id: `closed-${account.id}`,
        type: 'closed',
        title: 'Account Closed',
        description: `Account was closed`,
        performedBy: 'Admin User',
        performerRole: 'admin',
        createdAt: account.closedAt + 'T00:00:00',
      });
    }
    
    // Transaction entries
    transactions.forEach(txn => {
      let type: AccountLogEntry['type'] = 'top_up';
      let title = 'Top-up Received';
      let performerRole: PerformerRole = 'admin';
      
      if (txn.type === 'charge') {
        type = 'charge';
        title = 'Fee Charged';
        performerRole = 'system';
      } else if (txn.type === 'payment') {
        type = 'payment';
        title = 'Online Payment Made';
        performerRole = 'student';
      }
      
      entries.push({
        id: txn.id,
        type,
        title,
        description: txn.description,
        amount: txn.amount,
        balanceAfter: txn.balanceAfter,
        performedBy: txn.type === 'top_up' ? 'Admin User' : (txn.type === 'payment' ? holder.firstName + ' ' + holder.lastName : 'System'),
        performerRole,
        createdAt: txn.createdAt,
      });
    });
    
    // Enrolment entries
    enrolments.forEach(enr => {
      const course = getCourse(enr.courseId);
      entries.push({
        id: `enrol-${enr.id}`,
        type: 'enrolment',
        title: 'Course Enrolled',
        description: `Enrolled in ${course?.name || 'Unknown Course'}`,
        performedBy: 'Admin User',
        performerRole: 'admin',
        createdAt: enr.startDate + 'T00:00:00',
      });
    });
    
    // Process audit logs
    accountAuditLogs.forEach(log => {
      if (log.action === 'Account Created') {
        entries.push({
          id: log.id,
          type: 'created',
          title: 'Account Created',
          description: log.details,
          performedBy: log.userName,
          performerRole: log.userRole || 'admin',
          createdAt: log.createdAt,
        });
      } else if (log.action === 'Activation Scheduled' || log.action === 'Activation Rescheduled') {
        entries.push({
          id: log.id,
          type: 'scheduled_activation',
          title: log.action,
          description: log.details,
          performedBy: log.userName,
          performerRole: log.userRole || 'admin',
          createdAt: log.createdAt,
        });
      } else if (log.action === 'Account Reactivated') {
        entries.push({
          id: log.id,
          type: 'reactivated',
          title: 'Account Reactivated',
          description: log.details,
          performedBy: log.userName,
          performerRole: log.userRole || 'admin',
          createdAt: log.createdAt,
        });
      } else if (log.action === 'Account Suspended') {
        // Update existing suspended entry with audit log info
        const existingSuspended = entries.find(e => e.id === `suspended-${account.id}`);
        if (existingSuspended) {
          existingSuspended.performedBy = log.userName;
          existingSuspended.performerRole = log.userRole || 'admin';
          existingSuspended.description = log.details;
        }
      } else if (log.action === 'Account Activated Now') {
        entries.push({
          id: log.id,
          type: 'activated',
          title: 'Account Activated',
          description: log.details,
          performedBy: log.userName,
          performerRole: log.userRole || 'admin',
          createdAt: log.createdAt,
        });
      } else {
        entries.push({
          id: log.id,
          type: 'admin_action',
          title: log.action,
          description: log.details,
          performedBy: log.userName,
          performerRole: log.userRole || 'admin',
          createdAt: log.createdAt,
        });
      }
    });
    
    // Sort by date (newest first)
    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [account, holder, transactions, enrolments, auditLogs]);


  if (!account || !holder) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-lg font-medium text-foreground">Account not found</p>
          <Button variant="link" asChild className="mt-2">
            <Link to="/admin/accounts">Back to Accounts</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const handleSuspend = () => {
    updateEducationAccount(account.id, { 
      status: 'suspended',
      suspendedAt: new Date().toISOString().split('T')[0]
    });
    addAuditLog({
      id: `AUD${String(Date.now()).slice(-6)}`,
      action: 'Account Suspended',
      entityType: 'EducationAccount',
      entityId: account.id,
      userId: 'USR001',
      userName: 'John Tan',
      userRole: 'admin',
      details: `Account ${account.id} has been suspended`,
      createdAt: new Date().toISOString(),
    });
    toast({
      title: "Account Suspended",
      description: `Account ${account.id} has been suspended.`,
      variant: "destructive"
    });
  };

  const handleReactivate = () => {
    updateEducationAccount(account.id, { 
      status: 'active',
      suspendedAt: null
    });
    addAuditLog({
      id: `AUD${String(Date.now()).slice(-6)}`,
      action: 'Account Reactivated',
      entityType: 'EducationAccount',
      entityId: account.id,
      userId: 'USR001',
      userName: 'John Tan',
      userRole: 'admin',
      details: `Account ${account.id} has been reactivated`,
      createdAt: new Date().toISOString(),
    });
    toast({
      title: "Account Reactivated",
      description: `Account ${account.id} has been reactivated.`,
    });
  };

  const handleActivateNow = () => {
    updateEducationAccount(account.id, { 
      status: 'active',
      activationStatus: 'active_immediately',
      scheduledActivationDate: null
    });
    addAuditLog({
      id: `AUD${String(Date.now()).slice(-6)}`,
      action: 'Account Activated Now',
      entityType: 'EducationAccount',
      entityId: account.id,
      userId: 'USR001',
      userName: 'John Tan',
      userRole: 'admin',
      details: `Account ${account.id} was activated immediately (previously scheduled for ${account.scheduledActivationDate ? format(new Date(account.scheduledActivationDate), 'dd/MM/yyyy') : 'later'})`,
      createdAt: new Date().toISOString(),
    });
    toast({
      title: "Account Activated",
      description: `Account ${account.id} has been activated immediately.`,
    });
  };

  const handleRescheduleActivation = () => {
    if (!newActivationDate) {
      toast({
        title: "Validation Error",
        description: "Please select a new activation date.",
        variant: "destructive",
      });
      return;
    }
    const oldDate = account.scheduledActivationDate;
    updateEducationAccount(account.id, { 
      scheduledActivationDate: newActivationDate.toISOString().split('T')[0]
    });
    addAuditLog({
      id: `AUD${String(Date.now()).slice(-6)}`,
      action: 'Activation Rescheduled',
      entityType: 'EducationAccount',
      entityId: account.id,
      userId: 'USR001',
      userName: 'John Tan',
      userRole: 'admin',
      details: `Activation date rescheduled from ${oldDate ? format(new Date(oldDate), 'dd/MM/yyyy') : 'not set'} to ${format(newActivationDate, 'dd/MM/yyyy')}`,
      createdAt: new Date().toISOString(),
    });
    toast({
      title: "Activation Rescheduled",
      description: `Account ${account.id} activation rescheduled to ${format(newActivationDate, 'dd/MM/yyyy')}.`,
    });
    setRescheduleDialogOpen(false);
    setNewActivationDate(undefined);
  };

  // Helper function to mask/display NRIC
  const displayNric = () => {
    if (!holder.nric || holder.nric.length < 4) return 'N/A';
    if (showFullNric) return holder.nric;
    return '****' + holder.nric.slice(-4);
  };

  // Calculate financial statistics
  const totalTopUps = transactions
    .filter(t => t.type === 'top_up' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalCharges = Math.abs(transactions
    .filter(t => t.type === 'charge' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0));
  
  const totalPayments = transactions
    .filter(t => t.type === 'payment' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const overallMoneyIn = totalTopUps + totalPayments;
  const overallMoneyOut = totalCharges;
  
  // Get log entry icon based on type
  const getLogIcon = (type: AccountLogEntry['type']) => {
    switch (type) {
      case 'created': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'activated': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'suspended': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'reactivated': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'closed': return <XCircle className="h-4 w-4 text-muted-foreground" />;
      case 'top_up': return <TrendingUp className="h-4 w-4 text-success" />;
      case 'charge': return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'payment': return <DollarSign className="h-4 w-4 text-primary" />;
      case 'enrolment': return <BookOpen className="h-4 w-4 text-primary" />;
      case 'admin_action': return <UserCog className="h-4 w-4 text-muted-foreground" />;
      case 'scheduled_activation': return <CalendarClock className="h-4 w-4 text-primary" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getLogBadgeVariant = (type: AccountLogEntry['type']) => {
    switch (type) {
      case 'created':
      case 'activated':
      case 'reactivated':
        return 'success';
      case 'suspended':
      case 'closed':
        return 'destructive';
      case 'top_up':
        return 'success';
      case 'charge':
        return 'warning';
      case 'payment':
        return 'default';
      case 'enrolment':
        return 'secondary';
      case 'admin_action':
        return 'outline';
      case 'scheduled_activation':
        return 'default';
      default:
        return 'secondary';
    }
  };

  // Get payment status for each course (only Paid, Pending Payment, Unpaid)
  const getCoursePaymentStatus = (courseId: string): 'paid' | 'pending' | 'unpaid' => {
    const charge = outstandingCharges.find(c => c.courseId === courseId);
    if (!charge) return 'paid';
    return 'pending';
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/admin/accounts">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accounts
          </Link>
        </Button>
      </div>

      <PageHeader 
        title={`${holder.firstName} ${holder.lastName}`}
        description={`Account ID: ${account.id}`}
      >
        <Button variant="outline" asChild>
          <Link to={`/admin/topup-management`}>
            <CreditCard className="h-4 w-4 mr-2" />
            Top-up
          </Link>
        </Button>
        {account.status === 'active' && (
          <Button variant="destructive" onClick={handleSuspend}>
            <XCircle className="h-4 w-4 mr-2" />
            Suspend
          </Button>
        )}
        {account.status === 'suspended' && (
          <Button variant="default" onClick={handleReactivate}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Re-activate
          </Button>
        )}
        {account.status === 'pending_activation' && (
          <>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(true)}>
              <CalendarClock className="h-4 w-4 mr-2" />
              Re-schedule
            </Button>
            <Button variant="default" onClick={handleActivateNow}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Activate Now
            </Button>
          </>
        )}
      </PageHeader>

      {/* Reschedule Activation Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Activation</DialogTitle>
            <DialogDescription>
              Select a new activation date for this account. Current scheduled date: {account.scheduledActivationDate ? format(new Date(account.scheduledActivationDate), 'dd/MM/yyyy') : 'Not set'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newActivationDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newActivationDate ? format(newActivationDate, "PPP") : "Pick new activation date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={newActivationDate}
                  onSelect={setNewActivationDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRescheduleActivation}>Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Overview - Upper Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Current Balance"
          value={formatCurrency(account.balance)}
          subtitle="Available funds"
          icon={<Wallet className="h-5 w-5" />}
          variant="primary"
        />
        <StatCard
          title="Total Top-ups Received"
          value={formatCurrency(totalTopUps)}
          subtitle={`Since ${formatDate(account.openedAt)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="Balance Spent"
          value={formatCurrency(totalCharges)}
          subtitle="Paid via account balance"
          icon={<TrendingDown className="h-5 w-5" />}
          variant="warning"
        />
        <StatCard
          title="Enrolled Courses"
          value={String(enrolments.length)}
          subtitle={enrolments.filter(e => e.isActive).length > 0 ? `${enrolments.filter(e => e.isActive).length} active` : 'No active courses'}
          icon={<BookOpen className="h-5 w-5" />}
          variant="info"
        />
      </div>

      {/* Profile Information Section */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column - Profile Header & Personal Info */}
            <div className="lg:w-1/3 space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20">
                  <span className="text-2xl font-bold text-primary">
                    {holder.firstName[0]}{holder.lastName[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{holder.firstName} {holder.lastName}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{account.id}</p>
                  <Badge variant={account.status as any} className="mt-1">{getStatusLabel(account.status)}</Badge>
                </div>
              </div>

              {/* Account Status Section */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Schooling Status</p>
                    <p className="text-sm font-medium">{getSchoolingLabel(holder.schoolingStatus)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Account Opened</p>
                    <p className="text-sm font-medium">{formatDate(account.openedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Top-up</p>
                    <p className="text-sm font-medium">{account.lastTopUpDate ? formatDate(account.lastTopUpDate) : 'Never'}</p>
                  </div>
                  {account.suspendedAt && (
                    <div>
                      <p className="text-xs text-muted-foreground">Suspended On</p>
                      <p className="text-sm font-medium text-warning">{formatDate(account.suspendedAt)}</p>
                    </div>
                  )}
                  {account.closedAt && (
                    <div>
                      <p className="text-xs text-muted-foreground">Closed On</p>
                      <p className="text-sm font-medium text-destructive">{formatDate(account.closedAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-border" />

            {/* Right Column - Contact & Personal Details */}
            <div className="lg:flex-1 grid md:grid-cols-2 gap-x-8 gap-y-4">
              {/* NRIC */}
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <IdCard className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">NRIC</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono">{displayNric()}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-primary/10"
                      onClick={() => setShowFullNric(!showFullNric)}
                    >
                      {showFullNric ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Date of Birth */}
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date of Birth</p>
                  <p className="text-sm">{formatDate(holder.dateOfBirth)}</p>
                  <p className="text-xs text-muted-foreground">{holder.age} years old</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                  <p className="text-sm truncate">{holder.email}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                  <p className="text-sm">{holder.phone}</p>
                </div>
              </div>

              {/* Address - Full width */}
              <div className="md:col-span-2 flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</p>
                  <p className="text-sm">{holder.address}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* All Courses Section - Full width with table and pagination */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            All Courses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(() => {
            const totalCoursesPages = Math.ceil(enrolments.length / itemsPerPage);
            const paginatedEnrolments = enrolments.slice((coursesPage - 1) * itemsPerPage, coursesPage * itemsPerPage);
            
            return (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Course Fee</TableHead>
                      <TableHead>Payment Type</TableHead>
                      <TableHead>Enrolled Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEnrolments.length > 0 ? (
                      paginatedEnrolments.map((enrolment) => {
                        const course = getCourse(enrolment.courseId);
                        const paymentStatus = getCoursePaymentStatus(enrolment.courseId);
                        const charge = outstandingCharges.find(c => c.courseId === enrolment.courseId);
                        
                        return (
                          <TableRow key={enrolment.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{course?.name}</span>
                                <Badge variant="secondary">{course?.code}</Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{course && formatCurrency(course.monthlyFee)}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                {course?.paymentType === 'one_time' ? '(one-time)' : '/mo'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {course?.paymentType === 'one_time' ? 'One-time' : 'Recurring'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(enrolment.startDate)}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={paymentStatus === 'paid' ? 'success' : 'warning'}
                              >
                                {paymentStatus === 'paid' && 'Paid'}
                                {paymentStatus === 'pending' && `Pending ${charge ? formatCurrency(charge.amount) : ''}`}
                                {paymentStatus === 'unpaid' && `Unpaid ${charge ? formatCurrency(charge.amount) : ''}`}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No courses enrolled
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {totalCoursesPages > 1 && (
                  <div className="border-t p-2">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCoursesPage(p => Math.max(1, p - 1))}
                            className={coursesPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalCoursesPages }, (_, i) => i + 1).map(page => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCoursesPage(page)}
                              isActive={coursesPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCoursesPage(p => Math.min(totalCoursesPages, p + 1))}
                            className={coursesPage === totalCoursesPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Transaction History Section - Full width with pagination */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(() => {
            const sortedTransactions = [...transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const totalTransactionsPages = Math.ceil(sortedTransactions.length / itemsPerPage);
            const paginatedTransactions = sortedTransactions.slice((transactionsPage - 1) * itemsPerPage, transactionsPage * itemsPerPage);
            
            return (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.length > 0 ? (
                      paginatedTransactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell className="font-mono text-sm">{txn.id}</TableCell>
                          <TableCell className="text-sm">
                            {formatDateTime(txn.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={txn.type === 'top_up' ? 'success' : txn.type === 'charge' ? 'warning' : 'default'}>
                              {txn.type === 'top_up' ? 'Top-up' : txn.type === 'charge' ? 'Charge' : 'Payment'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-muted-foreground max-w-[250px] truncate">
                              {txn.description}
                            </p>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${txn.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                            {txn.amount > 0 ? '+' : ''}{formatCurrency(txn.amount)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(txn.balanceAfter)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {totalTransactionsPages > 1 && (
                  <div className="border-t p-2">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setTransactionsPage(p => Math.max(1, p - 1))}
                            className={transactionsPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalTransactionsPages }, (_, i) => i + 1).map(page => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setTransactionsPage(page)}
                              isActive={transactionsPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setTransactionsPage(p => Math.min(totalTransactionsPages, p + 1))}
                            className={transactionsPage === totalTransactionsPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Account Log Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Account Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(() => {
            const filteredLog = accountLog.filter(entry => !['top_up', 'charge', 'payment'].includes(entry.type));
            const totalLogPages = Math.ceil(filteredLog.length / itemsPerPage);
            const paginatedLog = filteredLog.slice((accountLogPage - 1) * itemsPerPage, accountLogPage * itemsPerPage);
            
            return (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Modified Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Detail</TableHead>
                      <TableHead>Performed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLog.length > 0 ? (
                      paginatedLog.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm">
                            {formatDateTime(entry.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getLogBadgeVariant(entry.type) as any}>
                              {entry.title}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {entry.description}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{entry.performedBy}</span>
                              {entry.performerRole && entry.performerRole !== 'system' && (
                                <Badge variant={getRoleBadgeVariant(entry.performerRole) as any} className="text-xs px-1.5 py-0">
                                  {getRoleBadgeLabel(entry.performerRole)}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No activity found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {totalLogPages > 1 && (
                  <div className="border-t p-2">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setAccountLogPage(p => Math.max(1, p - 1))}
                            className={accountLogPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalLogPages }, (_, i) => i + 1).map(page => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setAccountLogPage(page)}
                              isActive={accountLogPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setAccountLogPage(p => Math.min(totalLogPages, p + 1))}
                            className={accountLogPage === totalLogPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AccountDetailPage;