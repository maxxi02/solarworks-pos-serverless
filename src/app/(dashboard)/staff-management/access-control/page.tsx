'use client';

import { useState } from 'react';
import { User, Lock, Shield, Ban, Check, X } from 'lucide-react';

const users = [
  { id: '1', name: 'Maria Santos', email: 'maria@cafe.com', role: 'Manager', permissions: ['all'], status: 'active' },
  { id: '2', name: 'Juan Cruz', email: 'juan@cafe.com', role: 'Cashier', permissions: ['sales', 'inventory'], status: 'active' },
  { id: '3', name: 'Ana Reyes', email: 'ana@cafe.com', role: 'Barista', permissions: ['sales', 'menu'], status: 'blocked' },
  { id: '4', name: 'Carlos Lim', email: 'carlos@cafe.com', role: 'Staff', permissions: ['sales'], status: 'inactive' },
];

const permissionsList = [
  { id: 'sales', name: 'Sales', description: 'Process sales and view reports' },
  { id: 'inventory', name: 'Inventory', description: 'Manage stock and supplies' },
  { id: 'menu', name: 'Menu', description: 'Edit menu items and prices' },
  { id: 'staff', name: 'Staff', description: 'View staff information' },
  { id: 'financial', name: 'Financial', description: 'Access financial reports' },
  { id: 'admin', name: 'Admin', description: 'Full system access' },
];

const roles = ['Manager', 'Cashier', 'Barista', 'Staff'];

export default function AccessControl() {
 const [selectedUser, setSelectedUser] = useState<typeof users[number] | null>(null);

  const togglePermission = (permissionId: string) => {
    if (!selectedUser) return;
    
    const updatedPermissions = selectedUser.permissions.includes(permissionId)
      ? selectedUser.permissions.filter((p: string) => p !== permissionId)
      : [...selectedUser.permissions, permissionId];
    
    setSelectedUser({ ...selectedUser, permissions: updatedPermissions });
  };

  const handleBlockAccount = () => {
    if (selectedUser) {
      const newStatus = selectedUser.status === 'blocked' ? 'active' : 'blocked';
      setSelectedUser({ ...selectedUser, status: newStatus });
      alert(`${selectedUser.name} account ${newStatus === 'blocked' ? 'blocked' : 'unblocked'}`);
    }
  };

  const handleSave = () => {
    if (selectedUser) {
      alert(`Saved changes for ${selectedUser.name}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'blocked': return 'bg-red-500';
      case 'inactive': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Access Control</h1>
        <p className="text-muted-foreground">Manage user roles and permissions</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card p-4 rounded-lg shadow border">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="text-xl font-bold">{users.length}</p>
        </div>
        <div className="bg-card p-4 rounded-lg shadow border">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-xl font-bold">{users.filter(u => u.status === 'active').length}</p>
        </div>
        <div className="bg-card p-4 rounded-lg shadow border">
          <p className="text-sm text-muted-foreground">Blocked</p>
          <p className="text-xl font-bold">{users.filter(u => u.status === 'blocked').length}</p>
        </div>
        <div className="bg-card p-4 rounded-lg shadow border">
          <p className="text-sm text-muted-foreground">Inactive</p>
          <p className="text-xl font-bold">{users.filter(u => u.status === 'inactive').length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl shadow border p-6">
            <h3 className="font-semibold mb-4">Users</h3>
            <div className="space-y-3">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedUser?.id === user.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full ${user.status === 'blocked' ? 'bg-red-100' : 'bg-secondary'} flex items-center justify-center`}>
                        <User className={`h-5 w-5 ${user.status === 'blocked' ? 'text-red-600' : ''}`} />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{user.role}</span>
                          <span className={`h-2 w-2 rounded-full ${getStatusColor(user.status)}`} />
                          <span className="capitalize">{user.status}</span>
                        </div>
                      </div>
                    </div>
                    {user.status === 'blocked' && (
                      <Ban className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="bg-card rounded-xl shadow border p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedUser.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : selectedUser.status === 'blocked'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedUser.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleBlockAccount}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      selectedUser.status === 'blocked'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    <Ban className="h-4 w-4" />
                    {selectedUser.status === 'blocked' ? 'Unblock' : 'Block'}
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
                  >
                    <Check className="h-4 w-4" /> Save
                  </button>
                </div>
              </div>

              {/* Account Actions */}
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">Account Actions</h4>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Reset Password
                  </button>
                  <button className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50">
                    Force Logout
                  </button>
                </div>
              </div>

              {/* User Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <select 
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select 
                    value={selectedUser.status}
                    onChange={(e) => setSelectedUser({...selectedUser, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h4 className="font-medium mb-4">Permissions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {permissionsList.map(permission => (
                    <div key={permission.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="h-4 w-4" />
                            <span className="font-medium">{permission.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{permission.description}</p>
                        </div>
                        <button
                          onClick={() => togglePermission(permission.id)}
                          className={`h-6 w-6 rounded-full flex items-center justify-center ${
                            selectedUser.permissions.includes(permission.id)
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {selectedUser.permissions.includes(permission.id) ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl shadow border p-6 text-center">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Select a User</h3>
              <p className="text-muted-foreground">
                Choose a user to manage their access permissions
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}