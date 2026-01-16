import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Calendar, 
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Eye,
  Clock,
  DollarSign,
  ArrowRight,
  History
} from 'lucide-react';
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
import { formatCurrency, formatDate, OutstandingCharge, Transaction } from '@/lib/data';

const CoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const { citizenUser } = useAuth();
  
  const educationAccount = citizenUser ? getEducationAccountByHolder(citizenUser.id) : null;
  const outstandingCharges = educationAccount ? getOutstandingChargesByAccount(educationAccount.id) : [];
  const enrolments = citizenUser ? getEnrolmentsByHolder(citizenUser.id) : [];
  const transactions = educationAccount ? getTransactionsByAccount(educationAccount.id) : [];
  
  // Force re-render when data changes
  useDataStore(() => educationAccount);

  const [selectedCharges, setSelectedCharges] = useState<string[]>([]);
  const [courseDetailOpen, setCourseDetailOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Sort enrolments by newest first
  const sortedEnrolments = [...enrolments].sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
  const activeEnrolments = sortedEnrolments.filter(e => e.isActive);
  
  // Sort pending charges by due date (earliest first for payments)
  const pendingCharges = outstandingCharges
    .filter(c => c.status === 'unpaid')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const selectedTotal = selectedCharges.reduce((sum, id) => {
    const charge = pendingCharges.find(c => c.id === id);
    return sum + (charge?.amount || 0);
  }, 0);

  const handleSelectCharge = (chargeId: string, checked: boolean) => {
    if (checked) {
      setSelectedCharges([...selectedCharges, chargeId]);
    } else {
      setSelectedCharges(selectedCharges.filter(id => id !== chargeId));
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
    setSelectedCourseId(courseId);
    setCourseDetailOpen(true);
  };

  // Get course details for the selected course
  const selectedCourse = selectedCourseId ? getCourse(selectedCourseId) : null;
  const selectedEnrolment = selectedCourseId 
    ? activeEnrolments.find(e => e.courseId === selectedCourseId) 
    : null;
  const courseCharges = selectedCourseId 
    ? outstandingCharges.filter(c => c.courseId === selectedCourseId)
    : [];
  // Sort course transactions by newest first
  const courseTransactions = selectedCourseId
    ? transactions
        .filter(t => t.courseId === selectedCourseId || 
          t.description?.toLowerCase().includes(selectedCourse?.name?.toLowerCase() || ''))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  // Calculate fee breakdown for selected course
  const totalCourseFee = selectedCourse ? selectedCourse.monthlyFee * 12 : 0; // Assuming yearly
  const paidAmount = courseCharges.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
  const upcomingFee = courseCharges.filter(c => c.status === 'unpaid').reduce((sum, c) => sum + c.amount, 0);

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
              {activeEnrolments.length > 0 ? (
                <div className="space-y-4">
                  {activeEnrolments.map((enrolment) => {
                    const course = getCourse(enrolment.courseId);
                    if (!course) return null;
                    
                    const charge = pendingCharges.find(c => c.courseId === course.id);
                    const hasPendingPayment = !!charge;

                    return (
                      <div
                        key={enrolment.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                            <BookOpen className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{course.name}</h3>
                            <p className="text-sm text-muted-foreground">{course.code}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Enrolled: {formatDate(enrolment.startDate)}
                              </span>
                              <span>{formatCurrency(course.monthlyFee)}/mo</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewCourseDetails(course.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          {hasPendingPayment ? (
                            <>
                              <Badge variant="warning">Pending</Badge>
                              <Button size="sm" onClick={() => handleProceedToCheckout(charge?.id)}>
                                Pay
                              </Button>
                            </>
                          ) : (
                            <Badge variant="success">Paid</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No courses enrolled</p>
                  <p className="text-sm">You are not currently enrolled in any courses</p>
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
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingCharges.map((charge) => (
                        <TableRow key={charge.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCharges.includes(charge.id)}
                              onCheckedChange={(checked) => 
                                handleSelectCharge(charge.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">{charge.courseName}</TableCell>
                          <TableCell>{charge.period}</TableCell>
                          <TableCell>{formatDate(charge.dueDate)}</TableCell>
                          <TableCell>
                            <Badge variant="warning">Pending</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(charge.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
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

      {/* Course Details Dialog */}
      <Dialog open={courseDetailOpen} onOpenChange={setCourseDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Details
            </DialogTitle>
            <DialogDescription>
              View course information and payment history
            </DialogDescription>
          </DialogHeader>
          
          {selectedCourse && selectedEnrolment && (
            <div className="space-y-6 pt-4">
              {/* Course Information */}
              <div>
                <h3 className="font-semibold text-lg mb-3">{selectedCourse.name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Course Code</span>
                    <p className="font-medium">{selectedCourse.code}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Provider</span>
                    <p className="font-medium">{selectedCourse.provider}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Enrolled Since</span>
                    <p className="font-medium">{formatDate(selectedEnrolment.startDate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monthly Fee</span>
                    <p className="font-medium">{formatCurrency(selectedCourse.monthlyFee)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Fee Summary */}
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4" />
                  Fee Summary
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Total Fee</p>
                    <p className="text-xl font-bold">{formatCurrency(totalCourseFee)}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Paid</p>
                    <p className="text-xl font-bold text-success">{formatCurrency(paidAmount)}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Upcoming</p>
                    <p className="text-xl font-bold text-warning">{formatCurrency(upcomingFee)}</p>
                  </Card>
                </div>
              </div>

              {/* Upcoming Payments */}
              {courseCharges.filter(c => c.status === 'unpaid').length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4" />
                      Upcoming Payments
                    </h4>
                    <div className="space-y-2">
                      {courseCharges.filter(c => c.status === 'unpaid').map(charge => (
                        <div key={charge.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{charge.period}</p>
                            <p className="text-sm text-muted-foreground">Due: {formatDate(charge.dueDate)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{formatCurrency(charge.amount)}</span>
                            <Button size="sm" onClick={() => {
                              setCourseDetailOpen(false);
                              handleProceedToCheckout(charge.id);
                            }}>
                              Pay
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Payment History */}
              <Separator />
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <History className="h-4 w-4" />
                  Payment History
                </h4>
                {courseTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {courseTransactions.slice(0, 5).map(txn => (
                      <div key={txn.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{txn.externalDescription || txn.description}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(txn.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${txn.status === 'completed' ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(Math.abs(txn.amount))}
                          </p>
                          <Badge variant={txn.status === 'completed' ? 'success' : 'destructive'}>
                            {txn.status === 'completed' ? 'Success' : 'Failed'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No payment history for this course
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CitizenLayout>
  );
};

export default CoursesPage;
