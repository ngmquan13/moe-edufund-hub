import React, { useState } from 'react';
import { Calendar, Clock, Play, Check, Loader2, CalendarClock, UserPlus, UserX, Activity } from 'lucide-react';
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

// Lifecycle audit log type with enhanced fields
interface LifecycleAuditEntry {
  id: string;
  timestamp: string;
  actionType: 'fetch_15yo' | 'activate_16yo' | 'close_30yo';
  targetYear: number;
  recordsCreated: number;
  recordsSkipped: number;
  status: 'completed' | 'failed';
  details?: string;
  fetchSessionId?: string;
}

// Fetch session to track batches
interface FetchSession {
  id: string;
  createdAt: string;
  targetYear: number;
  scheduledActivationDate?: Date;
  recordsCreated: number;
}

// Simulated existing NRICs for deduplication demo
const existingNrics = new Set(['S1234567A', 'S2345678B', 'S3456789C']);

const AccountLifecycleSection: React.FC = () => {
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
    created: number;
    skipped: number;
    sessionId?: string;
  } | null>(null);
  
  // Lifecycle audit log
  const [lifecycleAuditLog, setLifecycleAuditLog] = useState<LifecycleAuditEntry[]>([]);
  
  // Fetch sessions tracking
  const [fetchSessions, setFetchSessions] = useState<FetchSession[]>([]);

  const generateSessionId = () => `FS${Date.now().toString(36).toUpperCase()}`;

  const addAuditEntry = (
    actionType: LifecycleAuditEntry['actionType'],
    targetYear: number,
    recordsCreated: number,
    recordsSkipped: number,
    status: 'completed' | 'failed' = 'completed',
    details?: string,
    fetchSessionId?: string
  ) => {
    const entry: LifecycleAuditEntry = {
      id: `LAL${Date.now()}`,
      timestamp: new Date().toISOString(),
      targetYear,
      actionType,
      recordsCreated,
      recordsSkipped,
      status,
      details,
      fetchSessionId,
    };
    setLifecycleAuditLog(prev => [entry, ...prev]);
  };

  const getActionLabel = (actionType: LifecycleAuditEntry['actionType']) => {
    switch (actionType) {
      case 'fetch_15yo': return 'Fetch 15yo Data';
      case 'activate_16yo': return 'Activate 16yo';
      case 'close_30yo': return 'Close 30yo';
    }
  };

  const getActionBadgeVariant = (actionType: LifecycleAuditEntry['actionType']) => {
    switch (actionType) {
      case 'fetch_15yo': return 'secondary';
      case 'activate_16yo': return 'success';
      case 'close_30yo': return 'destructive';
    }
  };

  // Fetch 15yo data with deduplication logic
  const handleRunFetch15yo = async () => {
    const birthYear = currentYear - 15;
    setFetch15yoLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Demo data - simulate fetching with deduplication
    const totalCitizensFound = Math.floor(Math.random() * 50) + 20;
    const duplicatesFound = Math.floor(Math.random() * 5) + 1; // Simulate some duplicates
    const recordsCreated = totalCitizensFound - duplicatesFound;
    
    // Create a new fetch session
    const sessionId = generateSessionId();
    const newSession: FetchSession = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      targetYear: birthYear,
      scheduledActivationDate: activate16yoDate,
      recordsCreated,
    };
    setFetchSessions(prev => [...prev, newSession]);
    
    setFetch15yoLoading(false);
    setResultData({
      action: 'Fetch 15yo Data',
      year: birthYear,
      found: totalCitizensFound,
      created: recordsCreated,
      skipped: duplicatesFound,
      sessionId,
    });
    setResultDialogOpen(true);
    
    addAuditEntry(
      'fetch_15yo', 
      birthYear, 
      recordsCreated, 
      duplicatesFound,
      'completed', 
      `Fetched ${totalCitizensFound} records for ${birthYear}. ${recordsCreated} Created, ${duplicatesFound} Skipped (Already Exists).`,
      sessionId
    );
    
    toast({
      title: "Fetch Complete",
      description: `Created ${recordsCreated} pending accounts. ${duplicatesFound} skipped (duplicates).`,
    });
  };

  // Activate 16yo accounts - only activates pending accounts from current batch
  const handleRunActivate16yo = async () => {
    const birthYear = currentYear - 16;
    setActivate16yoLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Demo data - only pending accounts without pre-set activation dates
    const pendingAccounts = Math.floor(Math.random() * 30) + 5;
    const accountsWithPresetDates = Math.floor(Math.random() * 3); // Some accounts have manual dates
    const activatedAccounts = pendingAccounts - accountsWithPresetDates;
    
    setActivate16yoLoading(false);
    setResultData({
      action: 'Activate 16yo Accounts',
      year: birthYear,
      found: pendingAccounts,
      created: activatedAccounts,
      skipped: accountsWithPresetDates,
    });
    setResultDialogOpen(true);
    
    addAuditEntry(
      'activate_16yo', 
      birthYear, 
      activatedAccounts, 
      accountsWithPresetDates,
      'completed',
      `Activated ${activatedAccounts} pending accounts for ${birthYear}. ${accountsWithPresetDates} Skipped (Pre-set activation date).`
    );
    
    toast({
      title: "Activation Complete",
      description: `Activated ${activatedAccounts} accounts. ${accountsWithPresetDates} skipped (pre-set dates).`,
    });
  };

  // Close 30yo accounts
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
      created: closedAccounts,
      skipped: 0,
    });
    setResultDialogOpen(true);
    
    addAuditEntry(
      'close_30yo', 
      birthYear, 
      closedAccounts, 
      0,
      'completed',
      `Closed ${closedAccounts} accounts for citizens born in ${birthYear}.`
    );
    
    toast({
      title: "Closure Complete",
      description: `Closed ${closedAccounts} accounts for birth year ${birthYear}.`,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <CalendarClock className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Account Lifecycle Scheduler</CardTitle>
              <CardDescription className="text-xs">
                Automated account lifecycle management
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Year: {currentYear}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compact Scheduler Cards */}
        <div className="grid gap-3 md:grid-cols-3">
          {/* Fetch 15yo Data */}
          <Card className="border bg-card/50">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Fetch 15yo Data</span>
                </div>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {currentYear - 15}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left h-8 text-xs",
                        !fetch15yoDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-1.5 h-3 w-3" />
                      {fetch15yoDate ? format(fetch15yoDate, "dd MMM yyyy") : "Schedule date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={fetch15yoDate}
                      onSelect={setFetch15yoDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Button 
                  onClick={handleRunFetch15yo} 
                  disabled={fetch15yoLoading}
                  className="w-full h-8 text-xs"
                  variant="secondary"
                  size="sm"
                >
                  {fetch15yoLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1.5" />
                      Run Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activate 16yo Accounts */}
          <Card className="border border-success/30 bg-success/5">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">Activate 16yo</span>
                </div>
                <Badge variant="success" className="text-[10px] px-1.5 py-0">
                  {currentYear - 16}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left h-8 text-xs",
                        !activate16yoDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-1.5 h-3 w-3" />
                      {activate16yoDate ? format(activate16yoDate, "dd MMM yyyy") : "Schedule date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={activate16yoDate}
                      onSelect={setActivate16yoDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Button 
                  onClick={handleRunActivate16yo} 
                  disabled={activate16yoLoading}
                  className="w-full h-8 text-xs"
                  variant="success"
                  size="sm"
                >
                  {activate16yoLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1.5" />
                      Run Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Close 30yo Accounts */}
          <Card className="border border-destructive/30 bg-destructive/5">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Close 30yo</span>
                </div>
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {currentYear - 30}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left h-8 text-xs",
                        !close30yoDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-1.5 h-3 w-3" />
                      {close30yoDate ? format(close30yoDate, "dd MMM yyyy") : "Schedule date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={close30yoDate}
                      onSelect={setClose30yoDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Button 
                  onClick={handleRunClose30yo} 
                  disabled={close30yoLoading}
                  className="w-full h-8 text-xs"
                  variant="destructive"
                  size="sm"
                >
                  {close30yoLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1.5" />
                      Run Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lifecycle Audit Log */}
        <div className="border rounded-lg">
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Lifecycle Audit Log</span>
            </div>
          </div>
          <div className="max-h-[280px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-9">Timestamp</TableHead>
                  <TableHead className="h-9">Action</TableHead>
                  <TableHead className="h-9">Target Year</TableHead>
                  <TableHead className="h-9 text-right">Created</TableHead>
                  <TableHead className="h-9 text-right">Skipped</TableHead>
                  <TableHead className="h-9">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lifecycleAuditLog.length > 0 ? (
                  lifecycleAuditLog.map((entry) => (
                    <TableRow key={entry.id} className="text-xs">
                      <TableCell className="py-2">
                        {format(new Date(entry.timestamp), 'dd/MM/yy HH:mm')}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant={getActionBadgeVariant(entry.actionType) as any} className="text-[10px]">
                          {getActionLabel(entry.actionType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 font-medium">{entry.targetYear}</TableCell>
                      <TableCell className="py-2 text-right font-medium text-success">
                        {entry.recordsCreated}
                      </TableCell>
                      <TableCell className="py-2 text-right font-medium text-muted-foreground">
                        {entry.recordsSkipped}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant={entry.status === 'completed' ? 'success' : 'destructive'} className="text-[10px]">
                          {entry.status === 'completed' ? 'Done' : 'Failed'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                      No lifecycle actions have been run yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Check className="h-4 w-4 text-success" />
              {resultData?.action} Complete
            </DialogTitle>
            <DialogDescription className="text-xs">
              Lifecycle action executed successfully.
            </DialogDescription>
          </DialogHeader>
          {resultData && (
            <div className="py-3 space-y-3">
              <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Target Year</span>
                  <span className="font-bold">{resultData.year}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Records Found</span>
                  <span className="font-bold text-primary">{resultData.found}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Records Created/Processed</span>
                  <span className="font-bold text-success">{resultData.created}</span>
                </div>
                {resultData.skipped > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Records Skipped</span>
                    <span className="font-bold text-muted-foreground">{resultData.skipped}</span>
                  </div>
                )}
                {resultData.sessionId && (
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground">Fetch Session ID</span>
                    <Badge variant="outline" className="text-xs">{resultData.sessionId}</Badge>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {resultData.action.includes('Fetch') && 
                  `Fetched ${resultData.found} records for ${resultData.year}. ${resultData.created} Created, ${resultData.skipped} Skipped (Already Exists).`
                }
                {resultData.action.includes('Activate') && 
                  `Activated ${resultData.created} pending accounts. ${resultData.skipped} Skipped (Pre-set activation date).`
                }
                {resultData.action.includes('Close') && 
                  `Closed ${resultData.created} accounts for citizens born in ${resultData.year}.`
                }
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResultDialogOpen(false)} size="sm">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AccountLifecycleSection;
