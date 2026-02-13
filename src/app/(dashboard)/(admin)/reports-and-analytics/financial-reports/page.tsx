'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// Data for different time periods
const dailyData = [
  { time: '8 AM', coffee: 600, food: 300, frappe: 200, tea: 150 },
  { time: '10 AM', coffee: 1200, food: 500, frappe: 400, tea: 300 },
  { time: '12 PM', coffee: 1800, food: 1200, frappe: 800, tea: 500 },
  { time: '2 PM', coffee: 1500, food: 900, frappe: 700, tea: 400 },
  { time: '4 PM', coffee: 1600, food: 1000, frappe: 900, tea: 600 },
  { time: '6 PM', coffee: 1900, food: 1300, frappe: 1100, tea: 700 },
  { time: '8 PM', coffee: 1400, food: 800, frappe: 600, tea: 400 },
  { time: '10 PM', coffee: 800, food: 400, frappe: 300, tea: 200 },
]

const weeklyData = [
  { day: 'Mon', coffee: 4200, food: 3200, frappe: 2800, tea: 1800 },
  { day: 'Tue', coffee: 5200, food: 3800, frappe: 3200, tea: 2200 },
  { day: 'Wed', coffee: 4800, food: 3500, frappe: 2900, tea: 2000 },
  { day: 'Thu', coffee: 6200, food: 4500, frappe: 3800, tea: 2800 },
  { day: 'Fri', coffee: 8500, food: 6200, frappe: 5200, tea: 3800 },
  { day: 'Sat', coffee: 9200, food: 7800, frappe: 6800, tea: 4500 },
  { day: 'Sun', coffee: 6800, food: 5200, frappe: 4500, tea: 3200 },
]

const monthlyData = [
  { week: 'Week 1', coffee: 25000, food: 18000, frappe: 15000, tea: 10000 },
  { week: 'Week 2', coffee: 32000, food: 24000, frappe: 21000, tea: 15000 },
  { week: 'Week 3', coffee: 38000, food: 29000, frappe: 25000, tea: 18000 },
  { week: 'Week 4', coffee: 42000, food: 32000, frappe: 28000, tea: 21000 },
]

const categories = [
  { key: 'coffee', label: 'Coffee', color: '#3B82F6', icon: '☕' },
  { key: 'food', label: 'Food', color: '#10B981', icon: '🍰' },
  { key: 'frappe', label: 'Frappe', color: '#8B5CF6', icon: '🧊' },
  { key: 'tea', label: 'Tea', color: '#F59E0B', icon: '🍵' },
]

export default function BusinessGraph() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['coffee', 'food', 'frappe', 'tea'])
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')

  const getData = () => {
    switch (timePeriod) {
      case 'daily': return dailyData
      case 'weekly': return weeklyData
      case 'monthly': return monthlyData
      default: return weeklyData
    }
  }

  const getXAxisKey = () => {
    switch (timePeriod) {
      case 'daily': return 'time'
      case 'weekly': return 'day'
      case 'monthly': return 'week'
      default: return 'day'
    }
  }

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString('en-PH')}`
  }

  const toggleCategory = (categoryKey: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryKey)
        ? prev.filter(key => key !== categoryKey)
        : [...prev, categoryKey]
    )
  }

  const getPeriodLabel = () => {
    switch (timePeriod) {
      case 'daily': return 'Hourly Sales Today (8 AM - 10 PM)'
      case 'weekly': return 'Daily Sales This Week'
      case 'monthly': return 'Weekly Sales This Month'
      default: return 'Daily Sales This Week'
    }
  }

  const getPeakTime = () => {
    switch (timePeriod) {
      case 'daily': 
        const peak = dailyData.reduce((prev, current) => 
          (prev.coffee + prev.food + prev.frappe + prev.tea) > 
          (current.coffee + current.food + current.frappe + current.tea) ? prev : current
        )
        return peak.time
      case 'weekly': return 'Saturday'
      case 'monthly': return 'Week 4'
      default: return 'Saturday'
    }
  }

  const getTopCategory = () => {
    const data = getData()
    const totals = {
      coffee: data.reduce((sum, item) => sum + item.coffee, 0),
      food: data.reduce((sum, item) => sum + item.food, 0),
      frappe: data.reduce((sum, item) => sum + item.frappe, 0),
      tea: data.reduce((sum, item) => sum + item.tea, 0),
    }
    
    const maxKey = Object.entries(totals).reduce((a, b) => a[1] > b[1] ? a : b)[0]
    return categories.find(cat => cat.key === maxKey)?.label || 'Coffee'
  }

  const data = getData()
  const xAxisKey = getXAxisKey()
  const peakTime = getPeakTime()
  const topCategory = getTopCategory()

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg p-4 sm:p-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Sales Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">{getPeriodLabel()}</p>
        </div>
        
        {/* Time Period Selector */}
        <div className="inline-flex rounded-lg border border-gray-300 p-1">
          <button
            onClick={() => setTimePeriod('daily')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timePeriod === 'daily'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setTimePeriod('weekly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timePeriod === 'weekly'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimePeriod('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timePeriod === 'monthly'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Graph Container */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={data} 
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#E5E7EB" 
                vertical={false}
                strokeOpacity={0.5}
              />
              <XAxis 
                dataKey={xAxisKey} 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: timePeriod === 'daily' ? 12 : 14, fontWeight: 500 }}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
                width={40}
                tickFormatter={(value) => `₱${value/1000}k`}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), null]}
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  padding: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
                labelStyle={{ 
                  color: '#111827', 
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              />
              {selectedCategories.map(categoryKey => {
                const category = categories.find(c => c.key === categoryKey)
                return category ? (
                  <Line
                    key={category.key}
                    type="monotone"
                    dataKey={category.key}
                    name={category.label}
                    stroke={category.color}
                    strokeWidth={3}
                    strokeOpacity={0.9}
                    dot={{ 
                      strokeWidth: 3, 
                      r: timePeriod === 'daily' ? 4 : 5,
                      stroke: category.color,
                      fill: 'white'
                    }}
                    activeDot={{ 
                      r: timePeriod === 'daily' ? 6 : 8, 
                      strokeWidth: 3,
                      stroke: category.color,
                      fill: 'white'
                    }}
                  />
                ) : null
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Categories Control */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <h3 className="text-lg font-semibold text-gray-800">Product Categories</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategories(['coffee', 'food', 'frappe', 'tea'])}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Show All
            </button>
            <button
              onClick={() => setSelectedCategories([])}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              Hide All
            </button>
          </div>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categories.map(category => {
            const total = data.reduce((sum, item) => 
              sum + (item[category.key as keyof typeof data[0]] as number), 0
            )
            const avg = total / data.length
            
            return (
              <button
                key={category.key}
                onClick={() => toggleCategory(category.key)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${
                  selectedCategories.includes(category.key)
                    ? 'border-blue-200 bg-white shadow-md'
                    : 'border-gray-200 bg-white opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">{category.icon}</span>
                      <span className="font-bold text-gray-900">{category.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm text-gray-600">
                        {formatCurrency(avg)} avg
                      </span>
                    </div>
                  </div>
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    selectedCategories.includes(category.key)
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {selectedCategories.includes(category.key) ? '✓' : '○'}
                  </div>
                </div>
                <div className="mt-3 text-left">
                  <div className="text-xs text-gray-500 mb-1">Total {timePeriod} sales</div>
                  <div className="text-lg font-bold text-gray-900">{formatCurrency(total)}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-gray-600 text-sm">Total {timePeriod} revenue:</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(
                  data.reduce((total, item) => 
                    total + item.coffee + item.food + item.frappe + item.tea, 0
                  )
                )}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span>Peak: {peakTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                  <span>Best Seller: {topCategory}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}