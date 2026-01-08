import React from 'react';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, CreditCard, ArrowRight, Receipt, Clock, BookOpen, Calendar, Users, DollarSign, AlertCircle } from 'lucide-react';
import { CitizenLayout } from '@/components/layouts/CitizenLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDataStore } from '@/hooks/useDataStore';
import {
  getEducationAccountByHolder,
  getTransactionsByAccount,
  getOutstandingChargesByAccount,
  getEnrolmentsByHolder,
  getCourse
} from '@/lib/dataStore';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/data';

const CitizenDashboard: React.FC = () => {
  const { citizenUser } = useAuth();
  const account = citizenUser ? getEducationAccountByHolder(citizenUser.id) : null;
  
  // Force re-render when data changes
  useDataStore(() => account);
  
  const transactions = account ? getTransactionsByAccount(account.id).slice(0, 5) : [];
  const outstandingCharges = account ? getOutstandingChargesByAccount(account.id) : [];
  const enrolments = citizenUser ? getEnrolmentsByHolder(citizenUser.id) : [];
  const activeEnrolments = enrolments.filter(e => e.isActive);
  const totalOutstanding = outstandingCharges.filter(c => c.status === 'unpaid').reduce((sum, c) => sum + c.amount, 0);

  if (!account) {
    return (
      <CitizenLayout>
        <div className="text-center py-16">
          <p>Account not found</p>
        </div>
      </CitizenLayout>
    );
  }

  return (
    <CitizenLayout>
      {/* Greeting */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Hi, {citizenUser?.firstName}!
        </h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back to your Education Account
        </p>
      </div>

      {/* Top Section: Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6 animate-slide-up">
        {/* Current Balance Card */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <Wallet className="h-5 w-5" />
              </div>
              <p className="text-sm opacity-90">Current Balance</p>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(account.balance)}</p>
            <p className="text-xs mt-2 opacity-75">
              Last top-up: {account.lastTopUpDate ? formatDate(account.lastTopUpDate) : 'N/A'}
            </p>
          </CardContent>
        </Card>

        {/* Outstanding Fees Card */}
        <Card className={totalOutstanding > 0 ? "border-warning bg-warning/5" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${totalOutstanding > 0 ? 'bg-warning/10' : 'bg-success/10'}`}>
                {totalOutstanding > 0 ? (
                  <AlertCircle className="h-5 w-5 text-warning" />
                ) : (
                  <DollarSign className="h-5 w-5 text-success" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">Outstanding Fees</p>
            </div>
            <p className={`text-3xl font-bold ${totalOutstanding > 0 ? 'text-warning' : 'text-success'}`}>
              {formatCurrency(totalOutstanding)}
            </p>
            <p className="text-xs mt-2 text-muted-foreground">
              {totalOutstanding > 0 
                ? `${outstandingCharges.filter(c => c.status === 'unpaid').length} pending payment(s)`
                : 'All fees paid'
              }
            </p>
          </CardContent>
        </Card>

        {/* Active Courses Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                <BookOpen className="h-5 w-5 text-info" />
              </div>
              <p className="text-sm text-muted-foreground">Enrolled Courses</p>
            </div>
            <p className="text-3xl font-bold">{activeEnrolments.length}</p>
            <p className="text-xs mt-2 text-muted-foreground">
              {enrolments.length - activeEnrolments.length} completed
            </p>
          </CardContent>
        </Card>

        {/* Account Status Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Users className="h-5 w-5 text-secondary-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Account Status</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={account.status === 'active' ? 'success' : 'warning'} className="text-sm px-3 py-1">
                {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
              </Badge>
            </div>
            <p className="text-xs mt-2 text-muted-foreground">
              Opened: {formatDate(account.openedAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pay Now Section - Only show if there are outstanding charges */}
      {totalOutstanding > 0 && (
        <Card className="mb-6 border-warning bg-gradient-to-r from-warning/10 to-warning/5 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/20">
                  <AlertCircle className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="font-semibold">You have outstanding fees</p>
                  <p className="text-sm text-muted-foreground">
                    Total amount due: <span className="font-bold text-warning">{formatCurrency(totalOutstanding)}</span>
                  </p>
                </div>
              </div>
              <Button size="lg" asChild>
                <Link to="/portal/courses">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pay Now
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Middle Section: Active Courses Table */}
      <Card className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Active Courses
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/portal/courses">
              View all <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {activeEnrolments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Monthly Fee</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEnrolments.slice(0, 5).map((enrolment) => {
                  const course = getCourse(enrolment.courseId);
                  if (!course) return null;
                  const hasCharge = outstandingCharges.some(c => c.courseId === course.id && c.status === 'unpaid');
                  
                  return (
                    <TableRow key={enrolment.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{course.name}</p>
                            <p className="text-xs text-muted-foreground">{course.code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(course.monthlyFee)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(enrolment.startDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {hasCharge ? (
                          <Badge variant="warning">Pending Payment</Badge>
                        ) : (
                          <Badge variant="success">Paid</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No active courses</p>
              <p className="text-sm text-muted-foreground mt-1">Enroll in a course to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Section: Recent Transactions */}
      <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/portal/transactions">
              View all <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((txn) => (
                <div 
                  key={txn.id} 
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      txn.type === 'top_up' ? 'bg-success/10' : 
                      txn.type === 'payment' ? 'bg-success/10' : 'bg-destructive/10'
                    }`}>
                      {txn.type === 'top_up' ? (
                        <TrendingUp className="h-5 w-5 text-success" />
                      ) : txn.type === 'payment' ? (
                        <CreditCard className="h-5 w-5 text-success" />
                      ) : (
                        <Receipt className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{txn.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(txn.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      txn.type === 'top_up' || txn.type === 'payment' ? 'text-success' : 'text-destructive'
                    }`}>
                      {txn.type === 'top_up' ? '+' : txn.type === 'charge' ? '-' : ''}{formatCurrency(Math.abs(txn.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bal: {formatCurrency(txn.balanceAfter)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No transactions yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </CitizenLayout>
  );
};

export default CitizenDashboard;
