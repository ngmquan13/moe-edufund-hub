import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, Clock, DollarSign, History, Building, FileText, CreditCard, Lock } from 'lucide-react';
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
  
  // Sort course transactions by newest first
  const courseTransactions = useMemo(() => {
    if (!courseId || !course) return [];
    return transactions
      .filter(t => t.courseId === courseId || 
        t.description?.toLowerCase().includes(course?.name?.toLowerCase() || '') ||
        t.courses?.some(c => c.courseId === courseId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [courseId, course, transactions]);

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

  // Generate all payment cycles for recurring courses
  const allPaymentCycles = useMemo(() => {
    if (!course || !enrolment || course.paymentType !== 'recurring' || !course.billingCycle) {
      return [];
    }

    const cycleMonths = BILLING_CYCLE_MONTHS[course.billingCycle];
    const totalCycles = course.durationMonths ? Math.ceil(course.durationMonths / cycleMonths) : 1;
    const enrollmentDate = new Date(enrolment.startDate);
    const paymentDeadlineDays = course.paymentDeadlineDays || 5;
    const today = new Date();

    const cycles: Array<{
      id: string;
      period: string;
      amount: number;
      dueDate: Date;
      status: 'paid' | 'payable' | 'locked' | 'overdue';
      charge?: OutstandingCharge;
    }> = [];

    for (let i = 0; i < totalCycles; i++) {
      const cycleStart = new Date(enrollmentDate);
      cycleStart.setMonth(cycleStart.getMonth() + (i * cycleMonths));
      
      const dueDate = new Date(cycleStart);
      dueDate.setDate(dueDate.getDate() + paymentDeadlineDays);

      const period = `${cycleStart.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
      
      // Find matching charge if exists
      const charge = courseCharges.find(c => c.period?.includes(period) || c.period === `Cycle ${i + 1}`);
      
      let status: 'paid' | 'payable' | 'locked' | 'overdue' = 'locked';
      
      if (charge) {
        if (charge.status === 'paid') {
          status = 'paid';
        } else if (charge.status === 'overdue') {
          status = 'overdue';
        } else if (today >= cycleStart && today <= dueDate) {
          status = 'payable';
        } else if (today > dueDate) {
          status = 'overdue';
        }
      } else {
        // Check if this cycle is currently due
        if (today >= cycleStart && today <= dueDate) {
          status = 'payable';
        } else if (today > dueDate && today < new Date(cycleStart.getTime() + cycleMonths * 30 * 24 * 60 * 60 * 1000)) {
          // Check if overdue but within the cycle period
          status = 'overdue';
        }
      }

      cycles.push({
        id: `cycle-${i + 1}`,
        period: `Cycle ${i + 1} - ${period}`,
        amount: course.monthlyFee,
        dueDate,
        status,
        charge,
      });
    }

    return cycles;
  }, [course, enrolment, courseCharges]);

  // Determine current payment status for the course
  const currentPaymentStatus = useMemo(() => {
    const unpaidCharges = courseCharges.filter(c => c.status === 'unpaid' || c.status === 'overdue');
    if (unpaidCharges.length === 0) {
      // No pending charges - check if all cycles are complete
      const paidCycles = allPaymentCycles.filter(c => c.status === 'paid');
      if (paidCycles.length > 0 && paidCycles.length < allPaymentCycles.length) {
        return 'ongoing';
      }
      return 'paid';
    }
    if (unpaidCharges.some(c => c.status === 'overdue')) {
      return 'overdue';
    }
    return 'pending';
  }, [courseCharges, allPaymentCycles]);

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
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
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
              [{course.code}] - {course.name}
            </h1>
            <p className="text-muted-foreground mt-1">{course.provider}</p>
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
              <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Provider</p>
                <p className="font-medium">{course.provider}</p>
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
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-xl font-bold text-success">{formatCurrency(feeBreakdown.paid)}</p>
            </Card>
            <Card className="p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground">Upcoming</p>
              <p className="text-xl font-bold text-warning">{formatCurrency(feeBreakdown.upcoming)}</p>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Payments - Show all cycles */}
      {allPaymentCycles.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h4 className="font-semibold flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4" />
              Payment Schedule
            </h4>
            <div className="space-y-2">
              {allPaymentCycles.map((cycle) => (
                <div 
                  key={cycle.id} 
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    cycle.status === 'locked' ? 'bg-muted/30 opacity-70' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {cycle.status === 'locked' && (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{cycle.period}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {formatDate(cycle.dueDate.toISOString())}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(cycle.amount)}</span>
                    {cycle.status === 'paid' && (
                      <Badge variant="success">Paid</Badge>
                    )}
                    {cycle.status === 'payable' && cycle.charge && (
                      <Button size="sm" onClick={() => handleProceedToCheckout(cycle.charge!.id)}>
                        Pay
                      </Button>
                    )}
                    {cycle.status === 'overdue' && cycle.charge && (
                      <>
                        <Badge variant="destructive">Overdue</Badge>
                        <Button size="sm" variant="destructive" onClick={() => handleProceedToCheckout(cycle.charge!.id)}>
                          Pay Now
                        </Button>
                      </>
                    )}
                    {cycle.status === 'locked' && (
                      <Badge variant="secondary">Not Due Yet</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {allPaymentCycles.some(c => c.status === 'locked') && (
              <p className="text-sm text-muted-foreground mt-4 flex items-center gap-2">
                <Lock className="h-3 w-3" />
                Locked payments will become available when their billing cycle begins.
              </p>
            )}
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
