import React, { useState } from 'react';
import { Calendar, Clock, Play, Check, Loader2, CalendarClock, Save, Eye, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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

// Session-related types
interface LifecycleSession {
  id: string;
  timestamp: string;
  actionType: 'fetch_15yo' | 'activate_16yo' | 'close_30yo';
  targetYear: number;
  recordsCreated: number;
  recordsSkipped: number;
  status: 'completed' | 'failed';
  adminName: string;
  executionTimeMs: number;
  fetchDate?: string;
  activationDate?: string;
  generatedAccounts: GeneratedAccount[];
  skippedRecords: SkippedRecord[];
}

interface GeneratedAccount {
  accountHolderId: string;
  name: string;
  nric: string;
}

interface SkippedRecord {
  name: string;
  nric: string;
  reason: string;
}

// Demo names for generated accounts
const demoNames = [
  'Ahmad bin Hassan', 'Siti Nurhaliza', 'Tan Wei Ming', 'Priya Devi',
  'Muhammad Faris', 'Ng Siew Ling', 'Rajesh Kumar', 'Fatimah Zahra',
  'Lee Jia Wei', 'Nurul Aisyah', 'Wong Mei Hua', 'Arun Sharma',
  'Lim Boon Huat', 'Khadijah Ibrahim', 'Chen Xiao Ming', 'Kavitha Rajan'
];

// Simulated existing NRICs for deduplication demo
const existingNrics = new Set(['S1234567A', 'S2345678B', 'S3456789C']);

const AccountLifecycleSection: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const birthYear15 = currentYear - 15;
  const birthYear16 = currentYear - 16;
  const birthYear30 = currentYear - 30;
  
  // Configuration dates
  const [fetchScheduleDate, setFetchScheduleDate] = useState<Date | undefined>();
  const [activationScheduleDate, setActivationScheduleDate] = useState<Date | undefined>();
  const [closeScheduleDate, setCloseScheduleDate] = useState<Date | undefined>();
  
  // Loading states
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Lifecycle sessions (audit log)
  const [lifecycleSessions, setLifecycleSessions] = useState<LifecycleSession[]>([]);
  
  // Session details view
  const [selectedSession, setSelectedSession] = useState<LifecycleSession | null>(null);
  const [sessionDetailsOpen, setSessionDetailsOpen] = useState(false);
  const [nricVisibility, setNricVisibility] = useState<Record<string, boolean>>({});

  const generateSessionId = () => `LS-${Date.now().toString(36).toUpperCase()}`;
  const generateAccountHolderId = (index: number) => `AH${(1000 + index).toString().padStart(4, '0')}`;
  const generateNric = (index: number) => {
    const letters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ';
    return `S${(9000000 + index).toString()}${letters[index % letters.length]}`;
  };

  const getActionLabel = (actionType: LifecycleSession['actionType']) => {
    switch (actionType) {
      case 'fetch_15yo': return 'Fetch 15yo Data';
      case 'activate_16yo': return 'Activate 16yo';
      case 'close_30yo': return 'Close 30yo';
    }
  };

  const getActionBadgeVariant = (actionType: LifecycleSession['actionType']) => {
    switch (actionType) {
      case 'fetch_15yo': return 'secondary';
      case 'activate_16yo': return 'outline';
      case 'close_30yo': return 'destructive';
    }
  };

  // Save configuration without modal
  const handleSaveConfiguration = async () => {
    setSaveLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setSaveLoading(false);
    
    toast({
      title: "Configuration Saved",
      description: `Fetch: ${fetchScheduleDate ? format(fetchScheduleDate, 'dd MMM yyyy') : 'not set'}, Activation: ${activationScheduleDate ? format(activationScheduleDate, 'dd MMM yyyy') : 'not set'}, Close: ${closeScheduleDate ? format(closeScheduleDate, 'dd MMM yyyy') : 'not set'}.`,
    });
  };

  // Run simulation - executes fetch and activation logic
  const handleRunSimulation = async () => {
    setSimulationLoading(true);
    const startTime = Date.now();
    
    // Simulate API call with fetch logic
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Generate demo data with deduplication
    const totalCitizensFound = Math.floor(Math.random() * 30) + 15;
    const duplicatesFound = Math.floor(Math.random() * 4) + 1;
    const recordsCreated = totalCitizensFound - duplicatesFound;
    
    // Generate accounts
    const generatedAccounts: GeneratedAccount[] = [];
    const skippedRecords: SkippedRecord[] = [];
    
    for (let i = 0; i < recordsCreated; i++) {
      const nric = generateNric(i + Math.floor(Math.random() * 1000));
      const fullNric = nric;
      // Skip if NRIC exists (deduplication)
      if (!existingNrics.has(nric)) {
        generatedAccounts.push({
          accountHolderId: generateAccountHolderId(generatedAccounts.length + 1),
          name: demoNames[i % demoNames.length],
          nric: fullNric, // Store full NRIC
        });
      }
    }
    
    // Generate skipped records
    for (let i = 0; i < duplicatesFound; i++) {
      skippedRecords.push({
        name: demoNames[(recordsCreated + i) % demoNames.length],
        nric: `S${(9000000 + recordsCreated + i).toString()}${String.fromCharCode(65 + ((recordsCreated + i) % 26))}`,
        reason: 'Duplicate NRIC - account already exists',
      });
    }
    
    const executionTime = Date.now() - startTime;
    const sessionId = generateSessionId();
    
    // Create new session entry
    const newSession: LifecycleSession = {
      id: sessionId,
      timestamp: new Date().toISOString(),
      actionType: 'fetch_15yo',
      targetYear: birthYear15,
      recordsCreated: generatedAccounts.length,
      recordsSkipped: duplicatesFound,
      status: 'completed',
      adminName: 'John Tan',
      executionTimeMs: executionTime,
      fetchDate: fetchScheduleDate ? format(fetchScheduleDate, 'dd MMM') : undefined,
      activationDate: activationScheduleDate ? format(activationScheduleDate, 'dd MMM') : undefined,
      generatedAccounts,
      skippedRecords,
    };
    
    setLifecycleSessions(prev => [newSession, ...prev]);
    setSimulationLoading(false);
    
    toast({
      title: "Simulation Complete",
      description: `Session ${sessionId}: Created ${generatedAccounts.length} pending accounts. ${duplicatesFound} skipped (duplicates).`,
    });
  };

  // Toggle NRIC visibility
  const toggleNricVisibility = (accountId: string) => {
    setNricVisibility(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  // Get masked/unmasked NRIC
  const getDisplayNric = (accountId: string, nric: string) => {
    if (nricVisibility[accountId]) {
      return nric;
    }
    return `****${nric.slice(-4)}`;
  };

  // Open session details
  const handleViewSessionDetails = (session: LifecycleSession) => {
    setSelectedSession(session);
    setSessionDetailsOpen(true);
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
              <CardTitle className="text-lg">Account Lifecycle</CardTitle>
              <CardDescription className="text-xs">
                Session-based account lifecycle management
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Year: {currentYear}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Lifecycle Session Setup Card */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Lifecycle Session Setup
            </CardTitle>
            <CardDescription className="text-xs">
              Configure the scheduled dates for automatic lifecycle processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Helper Text */}
            <div className="bg-muted/50 rounded-lg p-3 border border-muted space-y-1.5">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Auto-targeting:</span> System will automatically target citizens based on age thresholds:
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px]">Fetch 15yo: {birthYear15}</Badge>
                <Badge variant="outline" className="text-[10px]">Activate 16yo: {birthYear16}</Badge>
                <Badge variant="destructive" className="text-[10px]">Close 30yo: {birthYear30}</Badge>
              </div>
            </div>
            
            {/* Date Pickers Row */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Fetch Schedule Date - Day/Month only */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Fetch Schedule (Day/Month)
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left h-9 text-sm",
                        !fetchScheduleDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {fetchScheduleDate ? format(fetchScheduleDate, "dd MMM") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={fetchScheduleDate}
                      onSelect={setFetchScheduleDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Activation Schedule Date - Day/Month only */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Activation Schedule (Day/Month)
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left h-9 text-sm",
                        !activationScheduleDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {activationScheduleDate ? format(activationScheduleDate, "dd MMM") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={activationScheduleDate}
                      onSelect={setActivationScheduleDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Close Schedule Date - Day/Month only */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Close Schedule (Day/Month)
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left h-9 text-sm",
                        !closeScheduleDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {closeScheduleDate ? format(closeScheduleDate, "dd MMM") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={closeScheduleDate}
                      onSelect={setCloseScheduleDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button 
                onClick={handleSaveConfiguration}
                disabled={saveLoading}
                className="flex-1"
                size="sm"
              >
                {saveLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleRunSimulation}
                disabled={simulationLoading}
                variant="secondary"
                className="flex-1"
                size="sm"
              >
                {simulationLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lifecycle Session Log */}
        <div className="border rounded-lg">
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Lifecycle Session Log</span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {lifecycleSessions.length} sessions
              </Badge>
            </div>
          </div>
          <div className="max-h-[300px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-9">Timestamp</TableHead>
                  <TableHead className="h-9">Action</TableHead>
                  <TableHead className="h-9">Target Year</TableHead>
                  <TableHead className="h-9 text-right">Created</TableHead>
                  <TableHead className="h-9 text-right">Skipped</TableHead>
                  <TableHead className="h-9">Status</TableHead>
                  <TableHead className="h-9 text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lifecycleSessions.length > 0 ? (
                  lifecycleSessions.map((session) => (
                    <TableRow 
                      key={session.id} 
                      className="text-xs cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleViewSessionDetails(session)}
                    >
                      <TableCell className="py-2 font-mono text-[11px]">
                        {format(new Date(session.timestamp), 'dd/MM/yy HH:mm')}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant={getActionBadgeVariant(session.actionType) as any} className="text-[10px]">
                          {getActionLabel(session.actionType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 font-medium">{session.targetYear}</TableCell>
                      <TableCell className="py-2 text-right font-medium text-green-600">
                        {session.recordsCreated}
                      </TableCell>
                      <TableCell className="py-2 text-right font-medium text-muted-foreground">
                        {session.recordsSkipped}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge 
                          variant={session.status === 'completed' ? 'default' : 'destructive'} 
                          className={cn(
                            "text-[10px]",
                            session.status === 'completed' && "bg-green-600"
                          )}
                        >
                          {session.status === 'completed' ? 'Done' : 'Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewSessionDetails(session);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                      No lifecycle sessions have been run yet. Use "Run Simulation" to create a session.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Session Details Side Panel */}
      <Sheet open={sessionDetailsOpen} onOpenChange={setSessionDetailsOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Session Details
            </SheetTitle>
            <SheetDescription className="text-xs">
              Detailed information about this lifecycle session
            </SheetDescription>
          </SheetHeader>
          
          {selectedSession && (
            <div className="space-y-4">
              {/* Session Header Info */}
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Session ID</span>
                  <Badge variant="outline" className="font-mono text-xs">{selectedSession.id}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Admin</span>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{selectedSession.adminName}</span>
                    <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                  </div>
                </div>
              </div>

              {/* Parameters Summary */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Parameters Summary
                </h4>
                <div className="grid gap-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b">
                    <span className="text-muted-foreground">Target Year</span>
                    <Badge variant="secondary">{selectedSession.targetYear}</Badge>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b">
                    <span className="text-muted-foreground">Fetch Date</span>
                    <span className="font-medium">
                      {selectedSession.fetchDate || 'Not scheduled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b">
                    <span className="text-muted-foreground">Activation Date</span>
                    <span className="font-medium">
                      {selectedSession.activationDate || 'Not scheduled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-muted-foreground">Status</span>
                    <Badge 
                      variant={selectedSession.status === 'completed' ? 'default' : 'destructive'}
                      className={cn(
                        "text-[10px]",
                        selectedSession.status === 'completed' && "bg-green-600"
                      )}
                    >
                      {selectedSession.status === 'completed' ? 'Completed' : 'Failed'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Results Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center border border-green-200 dark:border-green-900">
                  <div className="text-2xl font-bold text-green-600">{selectedSession.recordsCreated}</div>
                  <div className="text-[10px] text-green-700 dark:text-green-400">Records Created</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center border">
                  <div className="text-2xl font-bold text-muted-foreground">{selectedSession.recordsSkipped}</div>
                  <div className="text-[10px] text-muted-foreground">Records Skipped</div>
                </div>
              </div>

              {/* Generated Accounts Table */}
              <div className="border rounded-lg">
                <div className="px-3 py-2 border-b bg-muted/30">
                  <span className="text-xs font-medium">Generated Accounts ({selectedSession.recordsCreated})</span>
                </div>
                <div className="max-h-[200px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[11px]">
                        <TableHead className="h-8">Account ID</TableHead>
                        <TableHead className="h-8">Name</TableHead>
                        <TableHead className="h-8">NRIC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSession.generatedAccounts.length > 0 ? (
                        selectedSession.generatedAccounts.map((account, index) => (
                          <TableRow key={index} className="text-[11px]">
                            <TableCell className="py-1.5 font-mono">
                              {account.accountHolderId}
                            </TableCell>
                            <TableCell className="py-1.5">{account.name}</TableCell>
                            <TableCell className="py-1.5">
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-muted-foreground">
                                  {getDisplayNric(account.accountHolderId, account.nric)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => toggleNricVisibility(account.accountHolderId)}
                                >
                                  {nricVisibility[account.accountHolderId] ? (
                                    <Eye className="h-3 w-3" />
                                  ) : (
                                    <Eye className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-xs text-muted-foreground">
                            No accounts generated
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Skipped Records Table */}
              {selectedSession.skippedRecords && selectedSession.skippedRecords.length > 0 && (
                <div className="border rounded-lg border-amber-200 dark:border-amber-900">
                  <div className="px-3 py-2 border-b bg-amber-50 dark:bg-amber-950/30">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      Skipped Records ({selectedSession.recordsSkipped})
                    </span>
                  </div>
                  <div className="max-h-[150px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-[11px]">
                          <TableHead className="h-8">Name</TableHead>
                          <TableHead className="h-8">NRIC</TableHead>
                          <TableHead className="h-8">Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSession.skippedRecords.map((record, index) => (
                          <TableRow key={index} className="text-[11px]">
                            <TableCell className="py-1.5">{record.name}</TableCell>
                            <TableCell className="py-1.5 font-mono text-muted-foreground">
                              ****{record.nric.slice(-4)}
                            </TableCell>
                            <TableCell className="py-1.5 text-amber-600 dark:text-amber-400">
                              {record.reason}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Validation Note */}
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-900">
                <p className="text-[11px] text-blue-700 dark:text-blue-400">
                  <strong>Validation:</strong> Duplicate NRICs were automatically skipped. 
                  Manually created accounts with pre-set activation dates were not overwritten.
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
};

export default AccountLifecycleSection;
