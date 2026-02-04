"use client";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client"; // Adjust import path to your auth client

interface User {
  id: string;
  name: string;
  email: string;

  createdAt?: Date;
  role?: string;
}

const StaffListPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter states
  const [searchValue, setSearchValue] = useState("");
  const [searchField, setSearchField] = useState<"name" | "email">("name");
  const [filterValue, setFilterValue] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 10; // You can make this configurable
  const offset = (page - 1) * limit;

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const query: any = {
        limit,
        offset,
        sortBy,
        sortDirection,
      };

      // Add search if there's a value
      if (searchValue.trim()) {
        query.searchValue = searchValue.trim();
        query.searchField = searchField;
        query.searchOperator = "contains"; // most common choice
      }

      // Add filter if there's a value (example: exact email match)
      if (filterValue.trim()) {
        query.filterField = "email";
        query.filterValue = filterValue.trim();
        query.filterOperator = "eq";
      }

      const { data, error } = await authClient.admin.listUsers({ query });

      if (error) throw new Error(error.message || "Failed to fetch users");

      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users when filters, page, sort changes
  useEffect(() => {
    fetchUsers();
  }, [page, searchValue, searchField, filterValue, sortBy, sortDirection]);

  const totalPages = Math.ceil(total / limit);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
    setPage(1); // reset to first page on sort change
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Staff Management</h1>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Search</label>
          <div className="flex">
            <select
              value={searchField}
              onChange={(e) => {
                setSearchField(e.target.value as "name" | "email");
                setPage(1);
              }}
              className="border rounded-l px-3 py-2 bg-gray-50"
            >
              <option value="name">Name</option>
              <option value="email">Email</option>
            </select>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setPage(1);
              }}
              placeholder="Search staff..."
              className="flex-1 border rounded-r px-3 py-2"
            />
          </div>
        </div>

        <div className="w-full md:w-64">
          <label className="block text-sm font-medium mb-1">
            Filter by Email
          </label>
          <input
            type="email"
            value={filterValue}
            onChange={(e) => {
              setFilterValue(e.target.value);
              setPage(1);
            }}
            placeholder="hello@example.com"
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">Loading staff members...</div>
      ) : error ? (
        <div className="text-red-600 bg-red-50 p-4 rounded">{error}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No staff members found matching your criteria.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    Name{" "}
                    {sortBy === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("email")}
                  >
                    Email{" "}
                    {sortBy === "email" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  {/* Add more columns as needed */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {users.length} of {total} staff members
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StaffListPage;
