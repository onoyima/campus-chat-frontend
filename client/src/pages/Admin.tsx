
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, Search, LayoutDashboard, Users, MessageSquare, Settings, UserPlus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMyIdentity } from "@/hooks/use-identity";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAuthHeaders } from "@/lib/api-config";

export default function AdminPage() {
  const { data: me, isLoading: meLoading } = useMyIdentity();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'chats'>('dashboard');
  
  if (meLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  if (!me || (me.role !== 'SUPER_ADMIN' && me.role !== 'VC')) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You do not have permission to view this page.</p>
        <Link href="/">
          <Button>Return Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 px-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            A
          </div>
          <span className="font-bold text-lg">Admin Panel</span>
        </div>
        
        <nav className="space-y-1">
          <Button 
            variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'} 
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Button>
          <Button 
            variant={activeTab === 'users' ? 'secondary' : 'ghost'} 
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab('users')}
          >
            <Users className="h-4 w-4" /> User Management
          </Button>
          <Button 
            variant={activeTab === 'chats' ? 'secondary' : 'ghost'} 
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab('chats')}
          >
            <MessageSquare className="h-4 w-4" /> Group Management
          </Button>
        </nav>
        
        <div className="mt-auto">
           <Link href="/">
             <Button variant="outline" className="w-full">Back to App</Button>
           </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
            <h2 className="font-semibold text-lg capitalize">{activeTab === 'chats' ? 'Group Management' : activeTab}</h2>
            <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                    <AvatarFallback>{me.displayName.substring(0,2)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{me.displayName}</span>
            </div>
        </header>
        
        <main className="p-6">
            {activeTab === 'dashboard' && <DashboardOverview />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'chats' && <GroupManagement />}
        </main>
      </div>
    </div>
  );
}

function DashboardOverview() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['/api/admin/stats'],
        queryFn: async () => {
            const res = await fetch('/api/admin/stats', { headers: getAuthHeaders() });
            return await res.json();
        }
    });

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                    <p className="text-xs text-muted-foreground">Registered identities</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
                    <p className="text-xs text-muted-foreground">Active in last 24h</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
                    <p className="text-xs text-muted-foreground">Across all chats</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Groups</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalGroups || 0}</div>
                    <p className="text-xs text-muted-foreground">Active group chats</p>
                </CardContent>
            </Card>
        </div>
    );
}

function UserManagement() {
    const [search, setSearch] = useState("");
    const updateRole = useUpdateRole();
    const toggleSuspension = useToggleSuspension();
    const provisionUser = useProvisionUser();
    
    // We use global search for Admin
    const { data: users, isLoading } = useQuery({
      queryKey: ['/api/admin/global-search', search],
      queryFn: async () => {
          if (!search) return [];
          const res = await fetch(`/api/admin/search?q=${search}`, { 
            headers: getAuthHeaders() 
          });
          return await res.json();
      },
      enabled: search.length > 2
  });
    
    // Also fetch registered users for the list (default view)
    const { data: registeredUsers, isLoading: regLoading } = useQuery({
        queryKey: [api.admin.users.path],
        queryFn: async () => {
             const res = await fetch(api.admin.users.path, { 
               headers: getAuthHeaders() 
             });
             return await res.json();
        }
    });
    
    const displayUsers = search.length > 2 ? users : registeredUsers;

    return (
    <div className="space-y-4">
        <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search users (staff/student)..." 
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>User Directory</CardTitle>
                <CardDescription>Manage roles and permissions</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading || regLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Avatar</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayUsers?.map((user: any) => (
                                <TableRow key={`${user.entityType}-${user.id}`}>
                                    <TableCell>
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={`/api/users/${user.entityType}/${user.entityId || user.id}/avatar`} />
                                            <AvatarFallback>{user.displayName?.substring(0,2)}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell className="font-medium">{user.displayName}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell><Badge variant="outline">{user.entityType}</Badge></TableCell>
                                    <TableCell>
                                        {user.role ? (
                                            <Badge variant="secondary">{user.role}</Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Not Registered</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                        {user.chatId ? (
                                          <>
                                          <Select 
                                            defaultValue={user.role} 
                                            onValueChange={(val) => updateRole.mutate({ id: user.chatId, role: val })}
                                            disabled={updateRole.isPending}
                                          >
                                            <SelectTrigger className="w-[130px] h-8">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="STUDENT">Student</SelectItem>
                                              <SelectItem value="STAFF">Staff</SelectItem>
                                              <SelectItem value="LECTURER">Lecturer</SelectItem>
                                              <SelectItem value="HOD">HOD</SelectItem>
                                              <SelectItem value="DEAN">Dean</SelectItem>
                                              <SelectItem value="VC">VC</SelectItem>
                                              <SelectItem value="REGISTRAR">Registrar</SelectItem>
                                              <SelectItem value="BURSAR">Bursar</SelectItem>
                                              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          
                                          <Button 
                                            size="sm" 
                                            variant={user.isSuspended ? "destructive" : "outline"}
                                            onClick={() => toggleSuspension.mutate({ id: user.chatId, isSuspended: !user.isSuspended })}
                                            disabled={toggleSuspension.isPending}
                                          >
                                            {user.isSuspended ? "Unsuspend" : "Suspend"}
                                          </Button>
                                          </>
                                        ) : (
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                className="gap-2"
                                                onClick={() => provisionUser.mutate({ entityType: user.entityType, entityId: user.id })}
                                                disabled={provisionUser.isPending}
                                            >
                                                <UserPlus className="h-4 w-4" /> Activate
                                            </Button>
                                        )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

function GroupManagement() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    
    const { data: groups, isLoading } = useQuery({
        queryKey: ['/api/admin/groups'],
        queryFn: async () => {
            const res = await fetch('/api/admin/groups', { headers: getAuthHeaders() });
            return await res.json();
        }
    });
    
    const deleteGroup = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/admin/groups/${id}`, { 
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to delete group");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/groups'] });
            toast({ title: "Group Deleted", description: "The conversation has been removed." });
        },
        onError: () => toast({ title: "Error", description: "Could not delete group", variant: "destructive" })
    });

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Active Groups</CardTitle>
                <CardDescription>Manage all group chats on the platform</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Members</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groups?.map((group: any) => (
                            <TableRow key={group.id}>
                                <TableCell className="font-medium">{group.name}</TableCell>
                                <TableCell>{group.memberCount} members</TableCell>
                                <TableCell>{new Date(group.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Button 
                                        size="sm" 
                                        variant="destructive"
                                        onClick={() => {
                                            if (confirm("Are you sure? This will delete all messages in this group.")) {
                                                deleteGroup.mutate(group.id);
                                            }
                                        }}
                                        disabled={deleteGroup.isPending}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function useProvisionUser() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: { entityType: string, entityId: number }) => {
            const res = await fetch('/api/admin/users/provision', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to activate user");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/global-search'] });
            queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
            toast({ title: "User Activated", description: "You can now assign roles to this user." });
        },
        onError: () => toast({ title: "Error", description: "Failed to activate user", variant: "destructive" })
    });
}

function useUpdateRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, role }: { id: number, role: string }) => {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role })
      });
      if (!res.ok) throw new Error("Failed to update role");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/global-search'] });
      toast({ title: "Role Updated", description: "User permissions have been modified." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

function useToggleSuspension() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isSuspended }: { id: number, isSuspended: boolean }) => {
      const res = await fetch(`/api/admin/users/${id}/suspend`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isSuspended })
      });
      if (!res.ok) throw new Error("Failed to update suspension status");
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/global-search'] });
      toast({ 
          title: variables.isSuspended ? "User Suspended" : "User Unsuspended", 
          description: variables.isSuspended ? "User can no longer send messages." : "User messaging restored." 
      });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}
