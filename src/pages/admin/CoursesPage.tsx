import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Users, Search, X, Upload, Download, DollarSign, Calendar as CalendarIcon, Eye, UserPlus, AlertCircle, Info } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, differenceInMonths, addMonths, isBefore, isAfter, isEqual } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { useDataStore } from '@/hooks/useDataStore';
import { 
  getCourses, 
  getEnrolmentsByCourse, 
  addCourse, 
  updateCourse,
  getAccountHolders,
  getAccountHolder,
  addEnrolment,
  removeEnrolment,
  getTransactions,
  getEducationAccount,
  getEducationAccounts,
  getOutstandingCharges
} from '@/lib/dataStore';
import { formatCurrency, formatDateTime, PaymentType, BillingCycle, getStatusLabel } from '@/lib/data';
import { ProviderCombobox } from '@/components/ui/provider-combobox';

const BILLING_CYCLE_DURATIONS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  bi_annually: 6,
  annually: 12,
};

const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  bi_annually: 'Bi-annually (6 months)',
  annually: 'Annually',
};

const BILLING_CYCLE_LABELS_COMPACT: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  bi_annually: 'Bi-annually',
  annually: 'Annually',
};

// Minimum duration requirements for each billing cycle (Rule of 2)
const BILLING_CYCLE_MIN_MONTHS: Record<BillingCycle, number> = {
  monthly: 2,      // D >= 2 months
  quarterly: 6,    // D >= 6 months (2 quarters)
  bi_annually: 12, // D >= 12 months (2 bi-annual periods)
  annually: 24,    // D >= 24 months (2 years)
};

const CoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const courses = useDataStore(getCourses);
  const accountHolders = useDataStore(getAccountHolders);
  const transactions = useDataStore(getTransactions);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [manageStudentsDialogOpen, setManageStudentsDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<typeof courses[0] | null>(null);
  
  // Form states
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formFee, setFormFee] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formPaymentType, setFormPaymentType] = useState<PaymentType>('recurring');
  const [formBillingCycle, setFormBillingCycle] = useState<BillingCycle>('monthly');
  const [formStartDate, setFormStartDate] = useState<Date | undefined>();
  const [formEndDate, setFormEndDate] = useState<Date | undefined>();
  const [formPaymentDeadlineDays, setFormPaymentDeadlineDays] = useState('');
  
  // Student search states
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [billingCycleError, setBillingCycleError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get unique providers for filter
  const uniqueProviders = [...new Set(courses.map(c => c.provider).filter(Boolean))].sort();

  // Calculate duration in months between start and end dates
  const durationMonths = useMemo(() => {
    if (!formStartDate || !formEndDate) return 0;
    return differenceInMonths(formEndDate, formStartDate);
  }, [formStartDate, formEndDate]);

  // Determine which billing cycles are enabled based on duration
  const billingCycleValidation = useMemo(() => {
    const validation: Record<BillingCycle, { enabled: boolean; minMonths: number }> = {
      monthly: { enabled: durationMonths >= BILLING_CYCLE_MIN_MONTHS.monthly, minMonths: BILLING_CYCLE_MIN_MONTHS.monthly },
      quarterly: { enabled: durationMonths >= BILLING_CYCLE_MIN_MONTHS.quarterly, minMonths: BILLING_CYCLE_MIN_MONTHS.quarterly },
      bi_annually: { enabled: durationMonths >= BILLING_CYCLE_MIN_MONTHS.bi_annually, minMonths: BILLING_CYCLE_MIN_MONTHS.bi_annually },
      annually: { enabled: durationMonths >= BILLING_CYCLE_MIN_MONTHS.annually, minMonths: BILLING_CYCLE_MIN_MONTHS.annually },
    };
    return validation;
  }, [durationMonths]);

  // Check if current billing cycle is valid when dates change
  useEffect(() => {
    if (formPaymentType === 'recurring' && formStartDate && formEndDate) {
      const currentCycleValidation = billingCycleValidation[formBillingCycle];
      if (!currentCycleValidation.enabled) {
        setBillingCycleError(`Duration too short. Minimum ${currentCycleValidation.minMonths} months required for ${BILLING_CYCLE_LABELS[formBillingCycle]}.`);
        setFormBillingCycle('monthly'); // Reset to monthly as fallback
      } else {
        setBillingCycleError(null);
      }
    } else {
      setBillingCycleError(null);
    }
  }, [formStartDate, formEndDate, durationMonths, billingCycleValidation]);

  // Calculate payment schedule preview
  const paymentSchedule = useMemo(() => {
    if (!formStartDate || !formEndDate || formPaymentType !== 'recurring') return [];
    
    const cycleMonths = BILLING_CYCLE_DURATIONS[formBillingCycle];
    const schedule: Date[] = [];
    let currentDate = new Date(formStartDate);
    
    while (isBefore(currentDate, formEndDate) || isEqual(currentDate, formEndDate)) {
      schedule.push(new Date(currentDate));
      currentDate = addMonths(currentDate, cycleMonths);
    }
    
    return schedule;
  }, [formStartDate, formEndDate, formBillingCycle, formPaymentType]);

  // Check if form is valid for submission
  const isFormValid = useMemo(() => {
    const baseValid = formCode && formName && formProvider && formFee && formDescription;
    if (formPaymentType === 'recurring') {
      // Billing cycle is mandatory for recurring payments
      if (!formBillingCycle) return false;
      if (formStartDate && formEndDate) {
        return baseValid && billingCycleValidation[formBillingCycle].enabled && !billingCycleError;
      }
    }
    return baseValid;
  }, [formCode, formName, formProvider, formFee, formDescription, formPaymentType, formStartDate, formEndDate, formBillingCycle, billingCycleValidation, billingCycleError]);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = providerFilter === 'all' || course.provider === providerFilter;
    const matchesPaymentType = paymentTypeFilter === 'all' || course.paymentType === paymentTypeFilter;
    return matchesSearch && matchesProvider && matchesPaymentType;
  });

  const filteredStudents = accountHolders.filter(holder => {
    const matchesSearch = 
      holder.firstName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      holder.lastName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      holder.id.toLowerCase().includes(studentSearchQuery.toLowerCase());
    return matchesSearch;
  });

  const resetForm = () => {
    setFormCode('');
    setFormName('');
    setFormProvider('');
    setFormFee('');
    setFormDescription('');
    setFormActive(true);
    setFormPaymentType('recurring');
    setFormBillingCycle('monthly');
    setFormStartDate(undefined);
    setFormEndDate(undefined);
    setFormPaymentDeadlineDays('');
    setBillingCycleError(null);
  };

  const handleCreateCourse = () => {
    if (!formCode || !formName || !formProvider || !formFee || !formDescription) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Code, Name, Provider, Fee, Description).",
        variant: "destructive",
      });
      return;
    }

    // Calculate duration in months from start and end date if provided
    let durationMonths = 12; // Default to 12 months
    if (formStartDate && formEndDate) {
      const monthsDiff = (formEndDate.getFullYear() - formStartDate.getFullYear()) * 12 + (formEndDate.getMonth() - formStartDate.getMonth());
      durationMonths = Math.max(1, monthsDiff);
    }

    const newCourse = {
      id: `CRS${String(Date.now()).slice(-6)}`,
      code: formCode.toUpperCase(),
      name: formName,
      provider: formProvider,
      monthlyFee: parseFloat(formFee),
      description: formDescription,
      startDate: formStartDate ? formStartDate.toISOString().split('T')[0] : undefined,
      endDate: formEndDate ? formEndDate.toISOString().split('T')[0] : undefined,
      isActive: formActive,
      paymentType: formPaymentType,
      billingCycle: formPaymentType === 'recurring' ? formBillingCycle : undefined,
      paymentDeadlineDays: formPaymentDeadlineDays ? parseInt(formPaymentDeadlineDays, 10) : undefined,
      durationMonths,
    };

    addCourse(newCourse);

    toast({
      title: "Course Created",
      description: `${formName} has been created successfully.`,
    });

    setCreateDialogOpen(false);
    resetForm();
  };

  const handleEditCourse = (course: typeof courses[0]) => {
    setSelectedCourse(course);
    setFormCode(course.code);
    setFormName(course.name);
    setFormProvider(course.provider || '');
    setFormFee(course.monthlyFee.toString());
    setFormDescription(course.description);
    setFormActive(course.isActive);
    setFormPaymentType(course.paymentType || 'recurring');
    setFormBillingCycle(course.billingCycle || 'monthly');
    setFormStartDate(course.startDate ? new Date(course.startDate) : undefined);
    setFormEndDate(course.endDate ? new Date(course.endDate) : undefined);
    setFormPaymentDeadlineDays(course.paymentDeadlineDays ? course.paymentDeadlineDays.toString() : '');
    setEditDialogOpen(true);
  };

  const handleViewDetails = (course: typeof courses[0]) => {
    navigate(`/admin/courses/${course.id}`);
  };

  const handleUpdateCourse = () => {
    if (!selectedCourse || !formCode || !formName || !formProvider || !formFee || !formDescription) return;

    let durationMonths = selectedCourse.durationMonths || 12;
    if (formStartDate && formEndDate) {
      const monthsDiff = (formEndDate.getFullYear() - formStartDate.getFullYear()) * 12 + (formEndDate.getMonth() - formStartDate.getMonth());
      durationMonths = Math.max(1, monthsDiff);
    }

    updateCourse(selectedCourse.id, {
      code: formCode.toUpperCase(),
      name: formName,
      provider: formProvider,
      monthlyFee: parseFloat(formFee),
      description: formDescription,
      isActive: formActive,
      paymentType: formPaymentType,
      billingCycle: formPaymentType === 'recurring' ? formBillingCycle : undefined,
      paymentDeadlineDays: formPaymentDeadlineDays ? parseInt(formPaymentDeadlineDays, 10) : undefined,
      startDate: formStartDate ? formStartDate.toISOString().split('T')[0] : undefined,
      endDate: formEndDate ? formEndDate.toISOString().split('T')[0] : undefined,
      durationMonths,
    });

    toast({
      title: "Course Updated",
      description: `${formName} has been updated successfully.`,
    });

    setEditDialogOpen(false);
    setSelectedCourse(null);
    resetForm();
  };

  const handleManageStudents = (course: typeof courses[0]) => {
    setSelectedCourse(course);
    setStudentSearchQuery('');
    setSelectedStudentIds([]);
    setManageStudentsDialogOpen(true);
  };

  const handleSelectStudent = (holderId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudentIds([...selectedStudentIds, holderId]);
    } else {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== holderId));
    }
  };

  const handleAddSelectedStudents = () => {
    if (!selectedCourse || selectedStudentIds.length === 0) return;

    let addedCount = 0;
    selectedStudentIds.forEach(holderId => {
      const enrolments = getEnrolmentsByCourse(selectedCourse.id);
      const existing = enrolments.find(e => e.holderId === holderId && e.isActive);

      if (!existing) {
        addEnrolment({
          id: `ENR${String(Date.now()).slice(-6)}${holderId}`,
          holderId: holderId,
          courseId: selectedCourse.id,
          startDate: new Date().toISOString().split('T')[0],
          endDate: null,
          isActive: true,
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      toast({
        title: "Students Enrolled",
        description: `${addedCount} student(s) enrolled in ${selectedCourse.name}.`,
      });
    }

    setSelectedStudentIds([]);
    setStudentSearchQuery('');
  };

  const handleRemoveStudent = (enrolmentId: string) => {
    removeEnrolment(enrolmentId);
    toast({
      title: "Student Removed",
      description: "Student has been removed from the course.",
    });
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Simulate file import
    toast({
      title: "Import Started",
      description: `Processing ${file.name}...`,
    });

    setTimeout(() => {
      toast({
        title: "Import Complete",
        description: "Course data has been imported successfully.",
      });
      setImportDialogOpen(false);
    }, 1500);
  };

  const CourseFormFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Course Code *</Label>
          <Input 
            id="code" 
            placeholder="e.g., IT101" 
            value={formCode}
            onChange={(e) => setFormCode(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fee">Fee (SGD) *</Label>
          <Input 
            id="fee" 
            type="number" 
            placeholder="0.00"
            value={formFee}
            onChange={(e) => setFormFee(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Course Name *</Label>
        <Input 
          id="name" 
          placeholder="e.g., Introduction to Programming"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="provider">Provider (School/Institution) *</Label>
        <ProviderCombobox
          value={formProvider}
          onChange={setFormProvider}
          placeholder="Type to search providers..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea 
          id="description" 
          placeholder="Brief description of the course (required)"
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
        />
      </div>

      {/* Start Date and End Date - Moved above Payment Type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formStartDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formStartDate ? format(formStartDate, "PPP") : "Pick start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end" side="bottom">
              <Calendar
                mode="single"
                selected={formStartDate}
                onSelect={setFormStartDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formEndDate ? format(formEndDate, "PPP") : "Pick end date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end" side="bottom">
              <Calendar
                mode="single"
                selected={formEndDate}
                onSelect={setFormEndDate}
                disabled={(date) => formStartDate ? date < formStartDate : false}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Payment Type */}
      <div className="space-y-2">
        <Label>Payment Type</Label>
        <Select value={formPaymentType} onValueChange={(v) => setFormPaymentType(v as PaymentType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one_time">One-time Payment</SelectItem>
            <SelectItem value="recurring">Recurring Payment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recurring Payment: Billing Cycle with Validation */}
      {formPaymentType === 'recurring' && (
        <div className="space-y-2">
          <Label>Billing Cycle *</Label>
          <TooltipProvider>
            <Select 
              value={formBillingCycle} 
              onValueChange={(v) => {
                setFormBillingCycle(v as BillingCycle);
                setBillingCycleError(null);
              }}
            >
              <SelectTrigger className={billingCycleError ? "border-destructive" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(BILLING_CYCLE_LABELS) as [BillingCycle, string][]).map(([value, label]) => {
                  const validation = billingCycleValidation[value];
                  const isDisabled = formStartDate && formEndDate && !validation.enabled;
                  
                  return (
                    <Tooltip key={value}>
                      <TooltipTrigger asChild>
                        <div>
                          <SelectItem 
                            value={value} 
                            disabled={!!isDisabled}
                            className={isDisabled ? "text-muted-foreground opacity-50" : ""}
                          >
                            {label}
                          </SelectItem>
                        </div>
                      </TooltipTrigger>
                      {isDisabled && (
                        <TooltipContent side="right" className="bg-popover border shadow-md">
                          <p>Min {validation.minMonths} months required</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </SelectContent>
            </Select>
          </TooltipProvider>
          {billingCycleError && (
            <div className="flex items-center gap-1.5 text-destructive text-xs">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{billingCycleError}</span>
            </div>
          )}
        </div>
      )}

      {/* Payment Deadline - for both payment types */}
      <div className="space-y-2">
        <Label htmlFor="paymentDeadline">Payment Deadline (Days)</Label>
        <Input
          id="paymentDeadline"
          type="number"
          placeholder="e.g., 14"
          value={formPaymentDeadlineDays}
          onChange={(e) => setFormPaymentDeadlineDays(e.target.value)}
          min="1"
        />
        <p className="text-xs text-muted-foreground">
          Number of days after enrolment by which payment must be made. Status changes from Pending to Overdue if not paid.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="active">Active</Label>
        <Switch 
          id="active" 
          checked={formActive}
          onCheckedChange={setFormActive}
        />
      </div>
    </>
  );

  // Fee charges calculations
  const charges = transactions.filter(t => t.type === 'charge' && t.status === 'completed');
  const chargeSummary = {
    count: charges.length,
    total: Math.abs(charges.reduce((sum, t) => sum + t.amount, 0)),
  };

  const handleExport = (type: string) => {
    toast({
      title: "Export Started",
      description: `Exporting ${type} report as CSV...`,
    });
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="All Courses" 
        description="Manage courses and enrolments"
      >
        <div className="flex gap-2">
          {/* Import Button */}
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Import Courses</DialogTitle>
                <DialogDescription>
                  Upload an Excel or CSV file to import courses
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Click to upload</p>
                  <p className="text-sm text-muted-foreground">or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-2">Excel (.xlsx) or CSV files</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Course Button */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-primary">Create New Course</DialogTitle>
                <DialogDescription>
                  Add a new course to the education account system.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <CourseFormFields />
                
                {/* Payment Schedule Preview */}
                {formPaymentType === 'recurring' && formStartDate && formEndDate && billingCycleValidation[formBillingCycle].enabled && paymentSchedule.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <Label className="text-primary font-semibold">Payment Schedule Preview</Label>
                    <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Billing Cycle:</span>
                        <Badge variant="secondary">{BILLING_CYCLE_LABELS[formBillingCycle]}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Payments:</span>
                        <Badge className="bg-primary text-primary-foreground">
                          {paymentSchedule.length} Payment{paymentSchedule.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {formFee && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total Amount:</span>
                          <span className="font-semibold text-primary">
                            {formatCurrency(parseFloat(formFee) * paymentSchedule.length)}
                          </span>
                        </div>
                      )}
                      {formPaymentDeadlineDays && (
                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5 border-t border-border pt-3">
                          <Info className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>Each student has {formPaymentDeadlineDays} days to pay from their enrolment date.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateCourse} 
                  disabled={!isFormValid}
                  className="bg-primary hover:bg-primary/90"
                >
                  Create Course
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Search & Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-3">
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {uniqueProviders.map(provider => (
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
          </div>
        </CardContent>
      </Card>

      {/* Courses Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredCourses.map((course) => {
          const enrolments = getEnrolmentsByCourse(course.id);
          const activeEnrolments = enrolments.filter(e => e.isActive);
          // Get created date from course data or fallback to current date
          const createdDate = course.startDate ? new Date(course.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

          return (
            <Card 
              key={course.id} 
              className="overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleViewDetails(course)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="secondary" className="mb-2">{course.code}</Badge>
                    <CardTitle className="text-lg">{course.name}</CardTitle>
                  </div>
                  <Badge variant={course.isActive ? 'active' : 'closed'}>
                    {course.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>
                
                <p className="text-xs text-muted-foreground mb-3">
                  Created: {createdDate}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">
                    {course.paymentType === 'one_time' ? 'One-time' : 'Recurring'}
                  </Badge>
                  {course.paymentType === 'recurring' && course.billingCycle && (
                    <Badge variant="outline">
                      {BILLING_CYCLE_LABELS[course.billingCycle]}
                    </Badge>
                  )}
                  {course.durationMonths && (
                    <Badge variant="outline">
                      {course.durationMonths} month{course.durationMonths > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{activeEnrolments.length} enrolled</span>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(course.monthlyFee)}
                    {course.paymentType === 'recurring' && course.billingCycle && (
                      course.billingCycle === 'monthly' ? '/mo' :
                      course.billingCycle === 'quarterly' ? '/qtr' :
                      course.billingCycle === 'bi_annually' ? '/6mo' :
                      course.billingCycle === 'annually' ? '/yr' : ''
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-muted-foreground text-center">
        Showing {filteredCourses.length} of {courses.length} courses
      </p>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <CourseFormFields />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCourse}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Students Dialog - Compact */}
      <Dialog open={manageStudentsDialogOpen} onOpenChange={setManageStudentsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Students - {selectedCourse?.name}</DialogTitle>
            <DialogDescription>
              Search and add students to this course.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Student Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected Students */}
            {selectedStudentIds.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                {selectedStudentIds.map(id => {
                  const holder = getAccountHolder(id);
                  const account = getEducationAccounts().find(acc => acc.holderId === id);
                  return (
                    <Badge key={id} variant="secondary" className="pl-2 pr-1 py-1">
                      {holder ? `${holder.firstName} ${holder.lastName}` : id}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 hover:bg-transparent"
                        onClick={() => handleSelectStudent(id, false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Search Results */}
            {studentSearchQuery && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {filteredStudents
                  .filter(holder => {
                    // Exclude already enrolled students
                    const enrolments = selectedCourse ? getEnrolmentsByCourse(selectedCourse.id) : [];
                    return !enrolments.some(e => e.holderId === holder.id && e.isActive);
                  })
                  .slice(0, 10).map(holder => {
                    const isSelected = selectedStudentIds.includes(holder.id);
                    const account = getEducationAccounts().find(acc => acc.holderId === holder.id);
                    
                    return (
                      <div
                        key={holder.id}
                        className={`flex items-center justify-between p-2 cursor-pointer hover:bg-secondary/50 ${
                          isSelected ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => handleSelectStudent(holder.id, !isSelected)}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={isSelected} />
                          <div>
                            <p className="font-medium text-sm">{holder.firstName} {holder.lastName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{account?.id || holder.id}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {filteredStudents.filter(holder => {
                  const enrolments = selectedCourse ? getEnrolmentsByCourse(selectedCourse.id) : [];
                  return !enrolments.some(e => e.holderId === holder.id && e.isActive);
                }).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-3">No students found</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageStudentsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSelectedStudents} disabled={selectedStudentIds.length === 0}>
              <Plus className="h-4 w-4 mr-1" /> Enroll {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default CoursesPage;