'use client';

import { useState } from 'react';
import { User, Mail, Phone, Clock, Edit2, Trash2, Plus, Search } from 'lucide-react';

const staff = [
  { id: '1', name: 'Maria Santos', email: 'maria@cafe.com', phone: '0917-123-4567', role: 'Barista', hours: 160, status: 'active' },
  { id: '2', name: 'Juan Cruz', email: 'juan@cafe.com', phone: '0922-987-6543', role: 'Cashier', hours: 140, status: 'active' },
  { id: '3', name: 'Ana Reyes', email: 'ana@cafe.com', phone: '0918-555-1234', role: 'Manager', hours: 180, status: 'active' },
  { id: '4', name: 'Carlos Lim', email: 'carlos@cafe.com', phone: '0919-777-8888', role: 'Barista', hours: 120, status: 'inactive' },
  { id: '5', name: 'Sofia Tan', email: 'sofia@cafe.com', phone: '0916-333-9999', role: 'Cashier', hours: 130, status: 'active' },
];

export default function StaffList() {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [newStaff, setNewStaff] = useState('');

  const roles = ['all', 'Barista', 'Cashier', 'Manager'];

  const filteredStaff = staff.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(search.toLowerCase()) ||
                         person.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || person.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const activeStaff = staff.filter(person => person.status === 'active').length;

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Staff List</h1>
        <p className="text-muted-foreground">Manage cafe employees</p>
      </div>

      {/* Stats & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card p-4 rounded-lg shadow border">
          <p className="text-sm text-muted-foreground">Total Staff</p>
          <p className="text-xl font-bold">{staff.length}</p>
        </div>
        <div className="bg-card p-4 rounded-lg shadow border">
          <p className="text-sm text-muted-foreground">Active Staff</p>
          <p className="text-xl font-bold">{activeStaff}</p>
        </div>
        <div className="bg-card p-4 rounded-lg shadow border">
          <p className="text-sm text-muted-foreground">Avg. Hours</p>
          <p className="text-xl font-bold">
            {Math.round(staff.reduce((sum, person) => sum + person.hours, 0) / staff.length)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl shadow border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2">
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-4 py-2 rounded-lg text-sm capitalize ${
                  filterRole === role
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
          
          <div className="flex gap-3 md:ml-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New staff name"
                value={newStaff}
                onChange={(e) => setNewStaff(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background"
              />
              <button className="flex items-center gap-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-card rounded-xl shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="p-4 text-left">Staff</th>
                <th className="p-4 text-left">Contact</th>
                <th className="p-4 text-left">Role</th>
                <th className="p-4 text-left">Hours</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map(person => (
                <tr key={person.id} className="border-t hover:bg-secondary/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{person.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{person.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{person.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {person.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{person.hours} hrs</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      person.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {person.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStaff.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4" />
            <p>No staff members found</p>
          </div>
        )}
      </div>
    </div>
  );
} 