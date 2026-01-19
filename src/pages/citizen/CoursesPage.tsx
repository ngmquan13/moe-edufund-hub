import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  BookOpen, 
  Calendar, 
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Search,
  Filter
} from 'lucide-react';
import { CitizenLayout } from '@/components/layouts/CitizenLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/hooks/useDataStore';
import {
  getEducationAccountByHolder,
  getOutstandingChargesByAccount,
  getEnrolmentsByHolder,
  getCourse,
  getCourses
} from '@/lib/dataStore';
import { formatCurrency, formatDate, BillingCycle, Course } from '@/lib/data';

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

const CoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const { citizenUser } = useAuth();
  
  const educationAccount = citizenUser ? getEducationAccountByHolder(citizenUser.id) : null;
  const outstandingCharges = educationAccount ? getOutstandingChargesByAccount(educationAccount.id) : [];
  const enrolments = citizenUser ? getEnrolmentsByHolder(citizenUser.id) : [];
  const allCourses = useDataStore(getCourses);
  
  // Force re-render when data changes
  useDataStore(() => educationAccount);

  const [selectedCharges, setSelectedCharges] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');

  // Sort enrolments by newest first (by enrollment date)
  const sortedEnrolments = useMemo(() => {
    return [...enrolments]
      .filter(e => e.isActive)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [enrolments]);

  // Get unique providers from enrolled courses
  const enrolledProviders = useMemo(() => {
    const providers = new Set<string>();
    sortedEnrolments.forEach(e => {
      const course = getCourse(e.courseId);
      if (course?.provider) providers.add(course.provider);
    });
    return Array.from(providers).sort();
  }, [sortedEnrolments]);

  // Filter enrolled courses
  const filteredEnrolments = useMemo(() => {
    return sortedEnrolments.filter(enrolment => {
      const course = getCourse(enrolment.courseId);
      if (!course) return false;

      // Search filter
      const matchesSearch = searchQuery === '' || 
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.provider.toLowerCase().includes(searchQuery.toLowerCase());

      // Provider filter
      const matchesProvider = providerFilter === 'all' || course.provider === providerFilter;

      // Payment type filter
      const matchesPaymentType = paymentTypeFilter === 'all' || course.paymentType === paymentTypeFilter;

      return matchesSearch && matchesProvider && matchesPaymentType;
    });
  }, [sortedEnrolments, searchQuery, providerFilter, paymentTypeFilter]);
  
  // Sort pending charges by due date (earliest first for payments)
  const pendingCharges = outstandingCharges
    .filter(c => c.status === 'unpaid' || c.status === 'overdue')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const selectedTotal = selectedCharges.reduce((sum, id) => {
    const charge = pendingCharges.find(c => c.id === id);
    return sum + (charge?.amount || 0);
  }, 0);

  const handleSelectCharge = (chargeId: string, checked: boolean) => {
    if (checked) {
      const newSelected = [...selectedCharges, chargeId];
      setSelectedCharges(newSelected);
      setSelectAll(newSelected.length === pendingCharges.length);
    } else {
      setSelectedCharges(selectedCharges.filter(id => id !== chargeId));
      setSelectAll(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedCharges(pendingCharges.map(c => c.id));
    } else {
      setSelectedCharges([]);
    }
  };

  const handleProceedToCheckout = (chargeId?: string) => {
    const chargesToPay = chargeId ? [chargeId] : selectedCharges;
    if (chargesToPay.length === 0) return;
    
    navigate('/portal/courses/checkout', { 
      state: { selectedCharges: chargesToPay } 
    });
  };

  const handleViewCourseDetails = (courseId: string) => {
    navigate(`/portal/courses/${courseId}`);
  };

  // Get payment status for a course enrollment - only 3 statuses: paid, pending, ongoing
  const getCoursePaymentStatus = (courseId: string): 'paid' | 'ongoing' | 'pending' => {
    const courseCharges = outstandingCharges.filter(c => c.courseId === courseId);
    const unpaidCharges = courseCharges.filter(c => c.status === 'unpaid');
    const paidCharges = courseCharges.filter(c => c.status === 'paid');
    
    if (unpaidCharges.length === 0) {
      // No pending charges
      if (paidCharges.length > 0) {
        // Has paid charges - ongoing (paid for current cycle)
        return 'ongoing';
      }
      // All payments complete
      return 'paid';
    }
    // Has unpaid charges - pending
    return 'pending';
  };

  const getPaymentStatusBadge = (status: 'paid' | 'ongoing' | 'pending') => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'ongoing':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Ongoing</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  const getBillingCycleSuffix = (course: Course) => {
    if (course.paymentType !== 'recurring' || !course.billingCycle) return '';
    switch (course.billingCycle) {
      case 'monthly': return '/mo';
      case 'quarterly': return '/qtr';
      case 'bi_annually': return '/6mo';
      case 'annually': return '/yr';
      default: return '';
    }
  };

  return (
    <CitizenLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Courses</h1>
        <p className="text-muted-foreground">View your enrolled courses and pending payments</p>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Course Details
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pending Payments
            {pendingCharges.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingCharges.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Course Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Courses</CardTitle>
              <CardDescription>All courses you are currently enrolled in</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={providerFilter} onValueChange={setProviderFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Providers</SelectItem>
                    {enrolledProviders.map(provider => (
                      <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Payment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredEnrolments.length > 0 ? (
                <div className="space-y-4">
                  {filteredEnrolments.map((enrolment) => {
                    const course = getCourse(enrolment.courseId);
                    if (!course) return null;
                    
                    const charge = pendingCharges.find(c => c.courseId === course.id);
                    const hasPendingPayment = !!charge;
                    const paymentStatus = getCoursePaymentStatus(course.id);

                    return (
                      <div
                        key={enrolment.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-4 cursor-pointer transition-colors hover:bg-secondary/50"
                        onClick={() => handleViewCourseDetails(course.id)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                            <BookOpen className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {course.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">{course.provider}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Enrolled: {formatDate(enrolment.startDate)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {course.paymentType === 'one_time' ? 'One-time' : 'Recurring'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          {hasPendingPayment ? (
                            <>
                              {getPaymentStatusBadge(paymentStatus)}
                              <span className="font-bold text-lg text-foreground">
                                {formatCurrency(charge?.amount || course.monthlyFee)}
                              </span>
                              <Button size="sm" onClick={() => handleProceedToCheckout(charge?.id)}>
                                Pay
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="font-medium text-muted-foreground">
                                {formatCurrency(course.monthlyFee)}{getBillingCycleSuffix(course)}
                              </span>
                              {getPaymentStatusBadge(paymentStatus)}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No courses found</p>
                  <p className="text-sm">
                    {sortedEnrolments.length > 0 
                      ? 'Try adjusting your search or filters'
                      : 'You are not currently enrolled in any courses'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Pending Payments
              </CardTitle>
              <CardDescription>Select charges to pay</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingCharges.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectAll}
                            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                          />
                        </TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingCharges.map((charge) => {
                        const course = getCourse(charge.courseId);
                        return (
                          <TableRow key={charge.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedCharges.includes(charge.id)}
                                onCheckedChange={(checked) => 
                                  handleSelectCharge(charge.id, checked as boolean)
                                }
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {course?.name || charge.courseName}
                            </TableCell>
                            <TableCell>{charge.period}</TableCell>
                            <TableCell>{formatDate(charge.dueDate)}</TableCell>
                            <TableCell>
                              <Badge variant="warning">Pending</Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(charge.amount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {selectedCharges.length > 0 && (
                    <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {selectedCharges.length} item(s) selected
                        </p>
                        <p className="text-lg font-bold">
                          Total: {formatCurrency(selectedTotal)}
                        </p>
                      </div>
                      <Button onClick={() => handleProceedToCheckout()}>
                        Proceed to Checkout
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success opacity-70" />
                  <p className="font-medium">All payments up to date</p>
                  <p className="text-sm">You have no pending payments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </CitizenLayout>
  );
};

export default CoursesPage;
