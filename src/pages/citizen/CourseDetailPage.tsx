import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, Clock, DollarSign, History, FileText, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CitizenLayout } from '@/components/layouts/CitizenLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/hooks/useDataStore';
import {
  getEducationAccountByHolder,
  getOutstandingChargesByAccount,
  getEnrolmentsByHolder,
  getCourse,
  getTransactionsByAccount
} from '@/lib/dataStore';
import { formatCurrency, formatDate, BillingCycle, Course, OutstandingCharge, Transaction } from '@/lib/data';

const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  bi_annually: 'Bi-annually',
  annually: 'Annually',
};

const BILLING_CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  bi_annually: 6,
  annually: 12,
};

const CitizenCourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { citizenUser } = useAuth();
  
  const educationAccount = citizenUser ? getEducationAccountByHolder(citizenUser.id) : null;
  const outstandingCharges = educationAccount ? getOutstandingChargesByAccount(educationAccount.id) : [];
  const enrolments = citizenUser ? getEnrolmentsByHolder(citizenUser.id) : [];
  const transactions = educationAccount ? getTransactionsByAccount(educationAccount.id) : [];
  
  // Force re-render when data changes
  useDataStore(() => educationAccount);

  const course = courseId ? getCourse(courseId) : null;
  const enrolment = courseId 
    ? enrolments.find(e => e.courseId === courseId && e.isActive) 
    : null;
  const courseCharges = courseId 
    ? outstandingCharges.filter(c => c.courseId === courseId)
    : [];
  
  // Sort course transactions by newest first - strictly filter by courseId only
  const courseTransactions = useMemo(() => {
    if (!courseId) return [];
    return transactions
      .filter(t => t.courseId === courseId || t.courses?.some(c => c.courseId === courseId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [courseId, transactions]);

  // Calculate fee breakdown
  const feeBreakdown = useMemo(() => {
    if (!course) return { total: 0, paid: 0, upcoming: 0 };
    
    // Calculate total based on payment type and duration
    let totalPayments = 1;
    if (course.paymentType === 'recurring' && course.billingCycle && course.durationMonths) {
      const cycleMonths = BILLING_CYCLE_MONTHS[course.billingCycle];
      totalPayments = Math.ceil(course.durationMonths / cycleMonths);
    }
    const total = course.monthlyFee * totalPayments;
    
    const paid = courseCharges.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
    const upcoming = courseCharges.filter(c => c.status === 'unpaid' || c.status === 'overdue').reduce((sum, c) => sum + c.amount, 0);
    
    return { total, paid, upcoming };
  }, [course, courseCharges]);

  // Generate payment cycles - supports both one-time and recurring courses
  // Key logic: Student must pay cycles sequentially - only the FIRST unpaid cycle is "pending" (payable),
  // all subsequent cycles are "ongoing" (not yet payable until previous cycle is paid)
  const upcomingPaymentCycles = useMemo(() => {
    if (!course || !enrolment) {
      return [];
    }

    // Handle one-time payment courses
    if (course.paymentType === 'one_time') {
      const charge = courseCharges.find(c => c.status === 'unpaid');
      if (!charge) return []; // Already paid
      
      const enrollmentDate = new Date(enrolment.startDate);
      const paymentDeadlineDays = course.paymentDeadlineDays || 5;
      const dueDate = new Date(enrollmentDate);
      dueDate.setDate(dueDate.getDate() + paymentDeadlineDays);
      
      return [{
        id: 'one-time-payment',
        period: `${course.name} - One-time Payment`,
        amount: course.monthlyFee,
        dueDate,
        status: 'pending' as const,
        charge,
        cycleNumber: 1,
      }];
    }

    // Handle recurring courses
    if (!course.billingCycle) {
      return [];
    }

    const cycleMonths = BILLING_CYCLE_MONTHS[course.billingCycle];
    const enrollmentDate = new Date(enrolment.startDate);
    const courseEndDate = course.endDate ? new Date(course.endDate) : null;
    const paymentDeadlineDays = course.paymentDeadlineDays || 5;

    const unpaidCycles: Array<{
      id: string;
      period: string;
      amount: number;
      dueDate: Date;
      status: 'pending' | 'ongoing';
      charge?: OutstandingCharge;
      cycleNumber: number;
    }> = [];

    // Helper function to format period based on billing cycle
    const formatPeriodLabel = (date: Date, billingCycle: BillingCycle): string => {
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-indexed
      
      switch (billingCycle) {
        case 'monthly':
          // "Jan 2026", "Feb 2026", etc.
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        case 'quarterly':
          // Q1 = Jan-Mar (months 0-2), Q2 = Apr-Jun (months 3-5), Q3 = Jul-Sep (months 6-8), Q4 = Oct-Dec (months 9-11)
          const quarter = Math.floor(month / 3) + 1;
          return `Q${quarter} ${year}`;
        case 'bi_annually':
          // H1 = Jan-Jun (months 0-5), H2 = Jul-Dec (months 6-11)
          const half = month < 6 ? 1 : 2;
          return `H${half} ${year}`;
        case 'annually':
          // Just the year
          return `${year}`;
        default:
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    };

    // Calculate cycles starting from enrollment date
    let cycleIndex = 0;
    let cycleStart = new Date(enrollmentDate);
    let displayCycleNumber = 1; // For display purposes, relative to student's enrollment
    
    while (true) {
      // Stop if we've passed the course end date
      if (courseEndDate && cycleStart > courseEndDate) break;
      
      const dueDate = new Date(cycleStart);
      dueDate.setDate(dueDate.getDate() + paymentDeadlineDays);

      const periodLabel = formatPeriodLabel(cycleStart, course.billingCycle!);
      const fullPeriodLabel = `Cycle ${displayCycleNumber} - ${periodLabel}`;
      
      // Find matching charge - match against full period label or partial period label
      // Also check for charges that match the display cycle number or contain the period label
      const charge = courseCharges.find(c => {
        if (!c.period) return false;
        // Exact match on full label (e.g., "Cycle 1 - Jan 2026")
        if (c.period === fullPeriodLabel) return true;
        // Match if charge period contains the period label (e.g., "Jan 2026" in "Cycle 1 - Jan 2026")
        if (c.period.includes(periodLabel)) return true;
        // Fallback: match cycle number for first unpaid charge
        if (c.period === `Cycle ${cycleIndex + 1}`) return true;
        return false;
      });
      
      // Skip paid cycles - they should only appear in payment history
      if (charge?.status === 'paid') {
        cycleStart = new Date(cycleStart);
        cycleStart.setMonth(cycleStart.getMonth() + cycleMonths);
        cycleIndex++;
        displayCycleNumber++;
        continue;
      }
      
      // Add to unpaid cycles list
      unpaidCycles.push({
        id: `cycle-${displayCycleNumber}`,
        period: `Cycle ${displayCycleNumber} - ${periodLabel}`,
        amount: course.monthlyFee,
        dueDate,
        status: 'ongoing', // Will be updated below
        charge,
        cycleNumber: displayCycleNumber,
      });

      // Move to next cycle
      cycleStart = new Date(cycleStart);
      cycleStart.setMonth(cycleStart.getMonth() + cycleMonths);
      cycleIndex++;
      displayCycleNumber++;
      
      // Safety limit
      if (cycleIndex > 24) break;
    }

    // Key logic: Only the FIRST unpaid cycle is "pending" (payable) AND only if it has an outstanding charge
    // All other cycles are "ongoing" (student must pay sequentially)
    if (unpaidCycles.length > 0 && unpaidCycles[0].charge) {
      unpaidCycles[0].status = 'pending';
      // Rest remain 'ongoing' (already set as default)
    }

    return unpaidCycles;
  }, [course, enrolment, courseCharges]);

  // Determine current payment status for the course - only 3 statuses: paid, pending, ongoing
  const currentPaymentStatus = useMemo(() => {
    const unpaidCharges = courseCharges.filter(c => c.status === 'unpaid');
    if (unpaidCharges.length === 0) {
      // No pending charges
      const paidCharges = courseCharges.filter(c => c.status === 'paid');
      if (paidCharges.length > 0 && upcomingPaymentCycles.length > 0) {
        // Has paid charges and still has upcoming cycles - ongoing
        return 'ongoing';
      }
      // All payments complete
      return 'paid';
    }
    // Has unpaid charges - pending
    return 'pending';
  }, [courseCharges, upcomingPaymentCycles]);

  const handleProceedToCheckout = (chargeId: string) => {
    navigate('/portal/courses/checkout', { 
      state: { selectedCharges: [chargeId] } 
    });
  };

  if (!course || !enrolment) {
    return (
      <CitizenLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">Course not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/portal/courses')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Courses
          </Button>
        </div>
      </CitizenLayout>
    );
  }

  const getPaymentStatusBadge = () => {
    switch (currentPaymentStatus) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'ongoing':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Ongoing</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      default:
        return null;
    }
  };

  return (
    <CitizenLayout>
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/portal/courses')} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Courses
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-primary" />
              {course.name}
            </h1>
          </div>
          {getPaymentStatusBadge()}
        </div>
      </div>

      {/* Course Information */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-lg mb-4">Course Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Course Code</p>
                <p className="font-medium">{course.code}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Enrolled Since</p>
                <p className="font-medium">{formatDate(enrolment.startDate)}</p>
              </div>
            </div>
            {course.startDate && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-medium">{formatDate(course.startDate)}</p>
                </div>
              </div>
            )}
            {course.endDate && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">End Date</p>
                  <p className="font-medium">{formatDate(course.endDate)}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Provider</p>
                <p className="font-medium">{course.provider}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Payment Type</p>
                <p className="font-medium">{course.paymentType === 'one_time' ? 'One-time' : 'Recurring'}</p>
              </div>
            </div>
            {course.paymentType === 'recurring' && course.billingCycle && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Billing Cycle</p>
                  <p className="font-medium">{BILLING_CYCLE_LABELS[course.billingCycle]}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Fee per Cycle</p>
                <p className="font-medium">{formatCurrency(course.monthlyFee)}</p>
              </div>
            </div>
          </div>
          {course.description && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-muted-foreground text-sm mb-1">Description</p>
              <p className="text-sm">{course.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Summary */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h4 className="font-semibold flex items-center gap-2 mb-4">
            <DollarSign className="h-4 w-4" />
            Fee Summary
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground">Total Fee</p>
              <p className="text-xl font-bold">{formatCurrency(feeBreakdown.total)}</p>
            </Card>
            <Card className="p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-xl font-bold text-success">{formatCurrency(feeBreakdown.paid)}</p>
            </Card>
            <Card className="p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground">Total Outstanding</p>
              <p className="text-xl font-bold text-warning">{formatCurrency(feeBreakdown.total - feeBreakdown.paid)}</p>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Payment Schedule - Only show unpaid upcoming cycles */}
      {upcomingPaymentCycles.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h4 className="font-semibold flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4" />
              Payment Schedule
            </h4>
            <div className="space-y-2">
              {upcomingPaymentCycles.map((cycle) => (
                <div 
                  key={cycle.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{cycle.period}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {formatDate(cycle.dueDate.toISOString())}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(cycle.amount)}</span>
                    {cycle.status === 'pending' && cycle.charge ? (
                      <>
                        <Badge variant="warning">Pending</Badge>
                        <Button size="sm" onClick={() => handleProceedToCheckout(cycle.charge!.id)}>
                          Pay
                        </Button>
                      </>
                    ) : (
                      <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Ongoing</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold flex items-center gap-2 mb-4">
            <History className="h-4 w-4" />
            Payment History
          </h4>
          {courseTransactions.length > 0 ? (
            <div className="space-y-2">
              {courseTransactions.map(txn => (
                <div key={txn.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{txn.externalDescription || txn.description}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(txn.createdAt)}</p>
                    <p className="text-xs text-muted-foreground font-mono">ID: {txn.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(Math.abs(txn.amount))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No payment history for this course
            </p>
          )}
        </CardContent>
      </Card>
    </CitizenLayout>
  );
};

export default CitizenCourseDetailPage;
