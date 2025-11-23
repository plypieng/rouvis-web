'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Mock data for demonstration
const costRevenueData = [
  { month: 'Jan', revenue: 120000, costs: 70000, profit: 50000 },
  { month: 'Feb', revenue: 130000, costs: 72000, profit: 58000 },
  { month: 'Mar', revenue: 150000, costs: 75000, profit: 75000 },
  { month: 'Apr', revenue: 170000, costs: 78000, profit: 92000 },
  { month: 'May', revenue: 210000, costs: 85000, profit: 125000 },
  { month: 'Jun', revenue: 250000, costs: 95000, profit: 155000 },
  { month: 'Jul', revenue: 280000, costs: 100000, profit: 180000 },
  { month: 'Aug', revenue: 300000, costs: 105000, profit: 195000 },
  { month: 'Sep', revenue: 250000, costs: 95000, profit: 155000 },
  { month: 'Oct', revenue: 220000, costs: 90000, profit: 130000 },
  { month: 'Nov', revenue: 180000, costs: 85000, profit: 95000 },
  { month: 'Dec', revenue: 150000, costs: 80000, profit: 70000 },
];

const costBreakdownData = [
  { name: 'Seeds & Plants', value: 15, color: '#4ade80' },
  { name: 'Fertilizers', value: 20, color: '#fb923c' },
  { name: 'Pesticides', value: 10, color: '#f87171' },
  { name: 'Labor', value: 30, color: '#60a5fa' },
  { name: 'Equipment', value: 15, color: '#c084fc' },
  { name: 'Irrigation', value: 10, color: '#22d3ee' },
];

const revenueBreakdownData = [
  { name: 'Rice', value: 45, color: '#4ade80' },
  { name: 'Vegetables', value: 30, color: '#fb923c' },
  { name: 'Fruits', value: 15, color: '#f87171' },
  { name: 'Other Crops', value: 10, color: '#60a5fa' },
];

export function CostRevenueAnalysis() {
  return (
    <div className="space-y-6">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={costRevenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value) => `¥${value.toLocaleString()}`}
            />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="#4ade80" />
            <Bar dataKey="costs" name="Costs" fill="#f87171" />
            <Bar dataKey="profit" name="Profit" fill="#60a5fa" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-4 text-center">Cost Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4 text-center">Revenue Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Key Insights</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <span className="text-green-500 mr-2">↗</span>
            <span>Highest profit margins achieved in August (65%)</span>
          </li>
          <li className="flex items-start">
            <span className="text-yellow-500 mr-2">→</span>
            <span>Labor costs represent the largest expense category (30%)</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">↗</span>
            <span>Rice production continues to be the primary revenue source (45%)</span>
          </li>
          <li className="flex items-start">
            <span className="text-red-500 mr-2">↘</span>
            <span>Opportunity to reduce fertilizer costs through optimized application</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
