import React, { useState } from 'react';
import { Settings, Calendar, Users, Clock, Play, Check, Loader2, CalendarClock, UserPlus, UserX, Activity } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

// Lifecycle audit log type
interface LifecycleAuditEntry {
  id: string;
  timestamp: string;
  yearProcessed: number;
  actionType: 'fetch_15yo' | 'activate_16yo' | 'close_30yo';
  totalRecordsAffected: number;
  status: 'completed' | 'failed';
  details?: string;
}

const SystemSettingsPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  // Scheduled dates
  const [fetch15yoDate, setFetch15yoDate] = useState<Date | undefined>();
  const [activate16yoDate, setActivate16yoDate] = useState<Date | undefined>();
  const [close30yoDate, setClose30yoDate] = useState<Date | undefined>();
  
  // Loading states
  const [fetch15yoLoading, setFetch15yoLoading] = useState(false);
  const [activate16yoLoading, setActivate16yoLoading] = useState(false);
  const [close30yoLoading, setClose30yoLoading] = useState(false);
  
  // Result dialog state
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultData, setResultData] = useState<{
    action: string;
    year: number;
    found: number;
    processed: number;
  } | null>(null);
  
  // Lifecycle audit log
  const [lifecycleAuditLog, setLifecycleAuditLog] = useState<LifecycleAuditEntry[]>([]);

  const addAuditEntry = (
    actionType: LifecycleAuditEntry['actionType'],
    yearProcessed: number,
    totalRecordsAffected: number,
    status: 'completed' | 'failed' = 'completed',
    details?: string
  ) => {
    const entry: LifecycleAuditEntry = {
      id: `LAL${Date.now()}`,
      timestamp: new Date().toISOString(),
      yearProcessed,
      actionType,
      totalRecordsAffected,
      status,
      details,
    };
    setLifecycleAuditLog(prev => [entry, ...prev]);
  };

  const getActionLabel = (actionType: LifecycleAuditEntry['actionType']) => {
    switch (actionType) {
      case 'fetch_15yo': return 'Fetch 15yo Data';
      case 'activate_16yo': return 'Activate 16yo Accounts';
      case 'close_30yo': return 'Close 30yo Accounts';
    }
  };

  const getActionBadgeVariant = (actionType: LifecycleAuditEntry['actionType']) => {
    switch (actionType) {
      case 'fetch_15yo': return 'secondary';
      case 'activate_16yo': return 'success';
      case 'close_30yo': return 'destructive';
    }
  };

  // Simulate running fetch 15yo data
  const handleRunFetch15yo = async () => {
    const birthYear = currentYear - 15;
    setFetch15yoLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Demo data - random count
    const foundCitizens = Math.floor(Math.random() * 50) + 10;
    const createdAccounts = foundCitizens;
    
    setFetch15yoLoading(false);
    setResultData({
      action: 'Fetch 15yo Data',
      year: birthYear,
      found: foundCitizens,
      processed: createdAccounts,
    });
    setResultDialogOpen(true);
    
    addAuditEntry('fetch_15yo', birthYear, createdAccounts, 'completed', 
      `Imported ${foundCitizens} citizens born in ${birthYear}. Created ${createdAccounts} pending accounts.`);
    
    toast({
      title: "Fetch Complete",
      description: `Found ${foundCitizens} citizens born in ${birthYear}.`,
    });
  };

  // Simulate running activate 16yo accounts
  const handleRunActivate16yo = async () => {
    const birthYear = currentYear - 16;
    setActivate16yoLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Demo data
    const pendingAccounts = Math.floor(Math.random() * 30) + 5;
    const activatedAccounts = pendingAccounts;
    
    setActivate16yoLoading(false);
    setResultData({
      action: 'Activate 16yo Accounts',
      year: birthYear,
      found: pendingAccounts,
      processed: activatedAccounts,
    });
    setResultDialogOpen(true);
    
    addAuditEntry('activate_16yo', birthYear, activatedAccounts, 'completed',
      `Activated ${activatedAccounts} pending accounts for citizens born in ${birthYear}.`);
    
    toast({
      title: "Activation Complete",
      description: `Activated ${activatedAccounts} accounts for birth year ${birthYear}.`,
    });
  };

  // Simulate running close 30yo accounts
  const handleRunClose30yo = async () => {
    const birthYear = currentYear - 30;
    setClose30yoLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Demo data
    const activeAccounts = Math.floor(Math.random() * 20) + 3;
    const closedAccounts = activeAccounts;
    
    setClose30yoLoading(false);
    setResultData({
      action: 'Close 30yo Accounts',
      year: birthYear,
      found: activeAccounts,
      processed: closedAccounts,
    });
    setResultDialogOpen(true);
    
    addAuditEntry('close_30yo', birthYear, closedAccounts, 'completed',
      `Closed ${closedAccounts} accounts for citizens born in ${birthYear}.`);
    
    toast({
      title: "Closure Complete",
      description: `Closed ${closedAccounts} accounts for birth year ${birthYear}.`,
    });
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="System Settings" 
        description="Configure system parameters and account lifecycle automation"
      />

      {/* Year Context Banner */}
      <Card className="mb-6 bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current System Year</p>
                <p className="text-2xl font-bold text-primary">{currentYear}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              <Clock className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Account Lifecycle Scheduler */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Account Lifecycle Scheduler
          </CardTitle>
          <CardDescription>
            Configure scheduled dates for automated account lifecycle management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Fetch 15yo Data */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-secondary-foreground" />
                  Fetch 15yo Data
                </CardTitle>
                <CardDescription className="text-xs">
                  Import citizens born {currentYear - 15} (15 years ago)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Scheduled Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !fetch15yoDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {fetch15yoDate ? format(fetch15yoDate, "PPP") : "Set schedule date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={fetch15yoDate}
                        onSelect={setFetch15yoDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="pt-2 border-t">
                  <Label className="text-xs text-muted-foreground mb-2 block">Manual Run</Label>
                  <Button 
                    onClick={handleRunFetch15yo} 
                    disabled={fetch15yoLoading}
                    className="w-full"
                    variant="secondary"
                  >
                    {fetch15yoLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Now
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                  <strong>Target:</strong> Birth year {currentYear - 15}
                </div>
              </CardContent>
            </Card>

            {/* Activate 16yo Accounts */}
            <Card className="border-2 border-success/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Activate 16yo Accounts
                </CardTitle>
                <CardDescription className="text-xs">
                  Activate pending accounts for citizens born {currentYear - 16}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Scheduled Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !activate16yoDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {activate16yoDate ? format(activate16yoDate, "PPP") : "Set schedule date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={activate16yoDate}
                        onSelect={setActivate16yoDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="pt-2 border-t">
                  <Label className="text-xs text-muted-foreground mb-2 block">Manual Run</Label>
                  <Button 
                    onClick={handleRunActivate16yo} 
                    disabled={activate16yoLoading}
                    className="w-full"
                    variant="success"
                  >
                    {activate16yoLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Now
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground bg-success/10 rounded p-2">
                  <strong>Target:</strong> Birth year {currentYear - 16}
                </div>
              </CardContent>
            </Card>

            {/* Close 30yo Accounts */}
            <Card className="border-2 border-destructive/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserX className="h-4 w-4 text-destructive" />
                  Close 30yo Accounts
                </CardTitle>
                <CardDescription className="text-xs">
                  Close accounts for citizens born {currentYear - 30}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Scheduled Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !close30yoDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {close30yoDate ? format(close30yoDate, "PPP") : "Set schedule date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={close30yoDate}
                        onSelect={setClose30yoDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="pt-2 border-t">
                  <Label className="text-xs text-muted-foreground mb-2 block">Manual Run</Label>
                  <Button 
                    onClick={handleRunClose30yo} 
                    disabled={close30yoLoading}
                    className="w-full"
                    variant="destructive"
                  >
                    {close30yoLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Now
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground bg-destructive/10 rounded p-2">
                  <strong>Target:</strong> Birth year {currentYear - 30}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Lifecycle Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Lifecycle Audit Log
          </CardTitle>
          <CardDescription>
            History of all lifecycle scheduler actions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action Type</TableHead>
                <TableHead>Year Processed</TableHead>
                <TableHead className="text-right">Records Affected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lifecycleAuditLog.length > 0 ? (
                lifecycleAuditLog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(entry.actionType) as any}>
                        {getActionLabel(entry.actionType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{entry.yearProcessed}</TableCell>
                    <TableCell className="text-right font-medium">
                      {entry.totalRecordsAffected}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.status === 'completed' ? 'success' : 'destructive'}>
                        {entry.status === 'completed' ? 'Completed' : 'Failed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {entry.details}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No lifecycle actions have been run yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              {resultData?.action} Complete
            </DialogTitle>
            <DialogDescription>
              Lifecycle action has been executed successfully.
            </DialogDescription>
          </DialogHeader>
          {resultData && (
            <div className="py-4 space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Birth Year Processed</span>
                  <span className="text-lg font-bold">{resultData.year}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Citizens Found</span>
                  <span className="text-lg font-bold text-primary">{resultData.found}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Records Processed</span>
                  <span className="text-lg font-bold text-success">{resultData.processed}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Found {resultData.found} citizens born in {resultData.year}. 
                {resultData.action.includes('Fetch') && ` Created ${resultData.processed} Pending accounts.`}
                {resultData.action.includes('Activate') && ` Activated ${resultData.processed} accounts.`}
                {resultData.action.includes('Close') && ` Closed ${resultData.processed} accounts.`}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResultDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default SystemSettingsPage;
