import React from 'react';
import { Settings, Shield, Cog, Database } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AccountLifecycleSection from '@/components/admin/AccountLifecycleSection';

const SystemSettingsPage: React.FC = () => {
  return (
    <AdminLayout>
      <PageHeader 
        title="System Settings" 
        description="Configure system parameters and manage platform settings"
      />

      <div className="space-y-6">
        {/* Account Lifecycle Section */}
        <AccountLifecycleSection />

        {/* Placeholder cards for future settings */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* API Configuration Placeholder */}
          <Card className="border-dashed opacity-60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Database className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">API Configuration</CardTitle>
                  <CardDescription className="text-xs">
                    External API endpoints and credentials
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Coming soon</span>
                <Badge variant="outline" className="text-xs">Planned</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings Placeholder */}
          <Card className="border-dashed opacity-60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Security Settings</CardTitle>
                  <CardDescription className="text-xs">
                    Authentication and access control
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Coming soon</span>
                <Badge variant="outline" className="text-xs">Planned</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SystemSettingsPage;
