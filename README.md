# PACD Monitoring System

A comprehensive Public Assistance Complaint Desk (PACD) monitoring system built as a single-page web application with client-side SQLite database functionality.

## 🌟 Features

### Core Functionality
- **Daily Entry Form**: Record daily activities with date and officer-in-charge information
- **Clients Served Tracking**: Monitor New Member, Amendment, Yakap Assignment, and ER2 statistics
- **Customer Satisfaction Survey**: Track Yes/No responses for service quality
- **Auto-calculation**: Real-time computation of total clients served

### Data Management
- **SQLite Database**: Client-side database using sql.js for local data persistence
- **CRUD Operations**: Complete Create, Read, Update, Delete functionality
- **Search & Filter**: Find records by date or officer name
- **Data Export**: Export records to CSV format
- **Backup & Restore**: JSON-based data backup and restore functionality

### Analytics & Visualization
- **Dashboard**: Real-time statistics and metrics
- **Interactive Charts**: Client trends and satisfaction data using Chart.js
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🚀 Quick Start

1. **Open the Application**
   - Open `index.html` in your web browser
   - No installation or server setup required

2. **Add Your First Record**
   - Navigate to the "Data Entry" tab
   - Fill in the date and officer name
   - Enter client service numbers
   - Add satisfaction survey responses
   - Click "Save Record"

3. **View and Manage Records**
   - Switch to the "Records" tab to view all entries
   - Use search and filter functions to find specific records
   - Edit or delete records as needed

4. **Analyze Data**
   - Visit the "Dashboard" tab for insights and visualizations
   - View trends in client service and satisfaction

## 📋 System Requirements

- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge
- **JavaScript Enabled**: Required for SQLite and chart functionality
- **Local Storage**: Browser must support localStorage for data persistence

## 🛠️ Technical Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: SQLite via sql.js (WebAssembly)
- **Charts**: Chart.js for data visualization
- **Storage**: Browser localStorage for database persistence
- **Architecture**: Single-page application (SPA)

## 📊 Database Schema

```sql
CREATE TABLE pacd_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    officer_name TEXT NOT NULL,
    new_member INTEGER NOT NULL DEFAULT 0,
    amendment INTEGER NOT NULL DEFAULT 0,
    yakap_assignment INTEGER NOT NULL DEFAULT 0,
    er2 INTEGER NOT NULL DEFAULT 0,
    total_clients INTEGER NOT NULL DEFAULT 0,
    yes_count INTEGER NOT NULL DEFAULT 0,
    no_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Usage Guide

### Data Entry
1. **Date**: Select the date of the record
2. **Officer Name**: Enter the name of the officer-in-charge
3. **Clients Served**: Input numbers for each service type
   - Total is automatically calculated
4. **Satisfaction Survey**: Enter Yes/No response counts
5. **Save**: Click "Save Record" to store the data

### Records Management
- **Search**: Type in the search box to filter by date or officer name
- **Date Filter**: Use the date picker to filter by specific date
- **Edit**: Click the "Edit" button to modify existing records
- **Delete**: Click "Delete" to remove records (with confirmation)

### Data Export
- **CSV Export**: Download all records as a CSV file
- **Backup**: Create a JSON backup of all data
- **Restore**: Upload a previously created backup file

### Dashboard Analytics
- **Total Records**: Number of entries in the database
- **Total Clients Served**: Sum of all clients across all records
- **Satisfaction Rate**: Percentage of positive responses
- **Average Daily Clients**: Mean number of clients per day

## 🌐 Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 80+ | ✅ Full Support |
| Firefox | 75+ | ✅ Full Support |
| Safari | 13+ | ✅ Full Support |
| Edge | 80+ | ✅ Full Support |

## 🔒 Data Privacy

- **Local Storage**: All data is stored locally in your browser
- **No Server Communication**: No data is sent to external servers
- **Offline Functionality**: Works completely offline
- **Data Control**: You have full control over your data with export/backup options

## 📱 Mobile Responsiveness

The application is fully responsive and works on:
- **Desktop**: Full functionality with optimized layout
- **Tablet**: Touch-friendly interface with adapted layouts
- **Mobile**: Compact design with swipe-friendly navigation

## 🐛 Troubleshooting

### Common Issues

1. **Database Not Loading**
   - Refresh the page
   - Check browser console for errors
   - Ensure JavaScript is enabled

2. **Charts Not Displaying**
   - Check internet connection (Chart.js loads from CDN)
   - Verify browser supports Canvas API

3. **Data Not Persisting**
   - Check browser localStorage settings
   - Ensure private/incognito mode is not enabled
   - Clear browser cache and reload

4. **Export Not Working**
   - Check browser download permissions
   - Ensure pop-up blockers are not interfering

### Performance Tips

- **Large Datasets**: For >1000 records, consider using date filters
- **Mobile Performance**: Use Wi-Fi for initial load (CDN resources)
- **Browser Memory**: Periodically export and clear old records if needed

## 📝 License

This project is open-source and available under the MIT License.

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve the system.

## 📞 Support

For technical support or questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Ensure all requirements are met

---

**PACD Monitoring System** - Efficient, reliable, and user-friendly complaint desk management.
