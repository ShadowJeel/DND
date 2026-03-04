# Sales Analytics Dashboard - Real-time Data Analysis

## 🎯 Overview

The Sales Analytics Dashboard provides **real-time insights** into your business performance with interactive charts, metrics tracking, and automated data refresh capabilities.

## ✨ Key Features

### 1. **Real-time Updates**
- ⚡ Auto-refresh every 30 seconds for analytics data
- 🔴 Live activity banner showing last 5 minutes of activity
- 📊 Real-time badge updates for inquiries, offers, and accepted orders

### 2. **Time Period Analysis**
Choose from multiple time ranges:
- **Today** - Current day performance
- **Last 7 Days** - Weekly trends
- **Last 30 Days** - Monthly overview
- **Last Year** - Annual performance

### 3. **Key Performance Metrics**

#### Total Sales
- Revenue generated in selected period
- Growth rate comparison with previous period
- Trend indicator (up/down)

#### Total Orders
- Number of completed transactions
- Order volume tracking

#### Average Order Value
- Per transaction average
- Revenue efficiency metric

#### Total Quantity
- Units sold across all products
- Volume performance

### 4. **Interactive Charts**

#### Sales Trend (Area Chart)
- Revenue over time visualization
- Smooth gradient fills
- Interactive tooltips showing exact values
- Responsive to time period selection

#### Product Distribution (Pie Chart)
- Sales breakdown by product category
- Color-coded segments
- Click to highlight specific products

#### Top Products (Bar Chart)
- Revenue ranking by product
- Easy comparison between products
- Rotated labels for readability

#### Orders Over Time (Line Chart)
- Transaction count trends
- Quantity trends overlay
- Dual-line comparison

### 5. **Product Performance Table**
Detailed breakdown showing:
- Product name
- Total sales (₹)
- Number of orders
- Total quantity sold
- Average price per ton

## 🚀 Accessing the Dashboard

### Navigation
1. Log in to your DND Purchase account
2. Click **"Sales Analytics"** in the sidebar navigation
3. Dashboard loads with default "Last 30 Days" view

### Available For
- ✅ **Buyers** - View your purchasing analytics
- ✅ **Sellers** - Track your sales performance
- ✅ **Both** - See combined analytics

## 📊 Using the Dashboard

### Changing Time Periods
1. Click any of the time period buttons at the top:
   - Today
   - Last 7 Days
   - Last 30 Days
   - Last Year
2. All charts and metrics update automatically

### Viewing Different Chart Types
1. Use the tabs above charts:
   - **Sales Trend** - Revenue over time
   - **Products** - Product analysis and distribution
   - **Orders** - Transaction and quantity trends
2. Click any tab to switch views

### Refreshing Data
- **Automatic**: Dashboard refreshes every 30 seconds
- **Manual**: Click the "Refresh" button to update immediately
- **Real-time Banner**: Updates every 5 seconds with latest activity

## 🔍 Understanding the Data

### Metrics Explained

**Growth Rate**
- Compares current period with previous equivalent period
- 🟢 Green = Positive growth
- 🔴 Red = Negative growth
- Percentage shows rate of change

**Real-time Activity**
- Shows activity in last 5 minutes:
  - New Inquiries created
  - New Offers submitted
  - Offers Accepted

### Chart Interactions

**Hovering**
- Hover over any chart element to see exact values
- Tooltips show formatted currency and numbers

**Time Series Charts**
- X-axis shows date/time based on selected period
- Y-axis shows revenue (₹) or count values

**Product Charts**
- Pie chart shows percentage distribution
- Bar chart shows absolute values for comparison

## 💡 Best Practices

### For Buyers
1. **Monitor Spending**: Track total purchases over time
2. **Product Analysis**: See which products you buy most
3. **Order Frequency**: Analyze ordering patterns
4. **Vendor Performance**: Compare offers from different sellers

### For Sellers
1. **Revenue Tracking**: Monitor sales performance
2. **Product Performance**: Identify top-selling products
3. **Pricing Strategy**: Analyze average prices and trends
4. **Win Rate**: Track offer acceptance rates

## 🔧 Technical Details

### Data Sources
- SQLite database (local development)
- Real-time queries with optimized indexes
- Aggregated calculations for performance

### Update Frequency
- **Analytics**: 30 seconds
- **Real-time Stats**: 5 seconds
- **Manual Refresh**: Instant

### Performance
- Cached queries for speed
- Efficient database indexes
- Responsive charts with throttling

## 📈 Analytics API

### Endpoints

#### Overview Data
```
GET /api/analytics?type=overview&period=month&userId=XXX&role=buyer
```

#### Product Analytics
```
GET /api/analytics?type=products&period=week&userId=XXX&role=seller
```

#### Real-time Stats
```
GET /api/analytics?type=realtime
```

### Response Format
```json
{
  "metrics": {
    "totalSales": 1500000,
    "totalOrders": 25,
    "averageOrderValue": 60000,
    "totalQuantity": 5000,
    "growthRate": 15.5
  },
  "timeSeries": [
    {
      "date": "2026-02-01",
      "sales": 50000,
      "orders": 2,
      "quantity": 100
    }
  ]
}
```

## 🛠️ Customization

### Adding New Metrics
Edit `lib/analytics.ts` to add custom calculations:
```typescript
export function getCustomMetric(period: TimePeriod) {
  // Your custom query here
}
```

### Changing Chart Colors
Modify the COLORS array in `app/dashboard/analytics/page.tsx`:
```typescript
const COLORS = ["#3B82F6", "#10B981", "#F59E0B", ...]
```

### Adjusting Refresh Intervals
```typescript
// In analytics page component
useEffect(() => {
  const interval = setInterval(fetchAnalytics, 30000) // Change 30000 to desired ms
  return () => clearInterval(interval)
}, [fetchAnalytics])
```

## 🔐 Security

- User-specific data isolation
- Role-based access control
- Authenticated API endpoints
- SQL injection prevention via prepared statements

## 📱 Responsive Design

The dashboard is fully responsive:
- **Desktop**: Full charts with all features
- **Tablet**: Optimized layouts with tab navigation
- **Mobile**: Stacked cards and scrollable charts

## 🐛 Troubleshooting

### No Data Showing
1. Check if any accepted offers exist in database
2. Verify user ID and role are correct
3. Try changing time period to "Last Year"

### Charts Not Loading
1. Ensure recharts library is installed: `pnpm add recharts`
2. Check browser console for errors
3. Refresh the page

### Real-time Updates Not Working
1. Check if API endpoint is accessible
2. Verify network connection
3. Look for console errors

## 📝 Files Structure

```
app/
  dashboard/
    analytics/
      page.tsx                    # Main analytics dashboard
  api/
    analytics/
      route.ts                    # Analytics API endpoint

lib/
  analytics.ts                    # Analytics functions & queries

components/
  dashboard-shell.tsx             # Navigation with analytics link
```

## 🚀 Future Enhancements

Potential improvements:
- Export data to CSV/Excel
- Email reports scheduling
- Custom date range picker
- Comparative analysis (YoY, MoM)
- Forecasting and predictions
- Advanced filtering options
- Custom KPI configuration
- Data export and sharing

---

**Need Help?** Contact support or check the [Database Documentation](./DATABASE.md) for more details on data structure.
