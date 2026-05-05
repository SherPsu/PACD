import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBqr4zFXGfITzuSJhMLG29FMPlUMFcpuek",
    authDomain: "pacd-59a6d.firebaseapp.com",
    projectId: "pacd-59a6d",
    storageBucket: "pacd-59a6d.firebasestorage.app",
    messagingSenderId: "278480981552",
    appId: "1:278480981552:web:c5198de402ab1ec6a9a7f5",
    measurementId: "G-0Q2TGQ0G8Y"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

let clientsChart = null;
let satisfactionChart = null;

class PACDMonitoringSystem {
    constructor() {
        this.records = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.listenRecords();
        this.setDefaultDate();
        this.updateLastUpdated();
        this.startClock();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Form submissions
        document.getElementById('dailyEntryForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('editForm').addEventListener('submit', (e) => this.handleEditSubmit(e));

        // Form controls
        document.getElementById('clearForm').addEventListener('click', () => this.clearForm());
        document.getElementById('cancelEdit').addEventListener('click', () => this.closeEditModal());

        // Auto-calculation
        ['newMember', 'amendment', 'yakapAssignment', 'er2'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.calculateTotal());
        });

        // Satisfaction survey validation
        ['yesCount', 'noCount'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.validateSatisfactionSurvey());
        });

        // Search and filter
        document.getElementById('searchInput').addEventListener('input', () => this.filterRecords());
        document.getElementById('filterDate').addEventListener('change', () => this.filterRecords());

        // Export and backup
        document.getElementById('exportCSV').addEventListener('click', () => this.exportToExcel());
        document.getElementById('backupData').addEventListener('click', () => this.backupData());
        document.getElementById('restoreData').addEventListener('click', () => this.restoreData());

        // File input for restore
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileRestore(e));

        // Modal close
        document.querySelector('.modal-close').addEventListener('click', () => this.closeEditModal());
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeEditModal();
            }
        });
    }

    switchTab(tabName) {
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button and corresponding tab
        document.querySelector(`.nav-tab[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
        
        // Update dashboard if switching to dashboard tab
        if (tabName === 'dashboard') {
            this.updateDashboard();
        }
    }

    calculateTotal() {
        const newMember = parseInt(document.getElementById('newMember').value) || 0;
        const amendment = parseInt(document.getElementById('amendment').value) || 0;
        const yakapAssignment = parseInt(document.getElementById('yakapAssignment').value) || 0;
        const er2 = parseInt(document.getElementById('er2').value) || 0;
        
        const total = newMember + amendment + yakapAssignment + er2;
        document.getElementById('totalClients').value = total;
        
        // Validate satisfaction survey when total changes
        this.validateSatisfactionSurvey();
    }

    validateSatisfactionSurvey() {
        const totalClients = parseInt(document.getElementById('totalClients').value) || 0;
        const yesCount = parseInt(document.getElementById('yesCount').value) || 0;
        const noCount = parseInt(document.getElementById('noCount').value) || 0;
        const satisfactionTotal = yesCount + noCount;
        
        const yesInput = document.getElementById('yesCount');
        const noInput = document.getElementById('noCount');
        
        // Check if elements exist before trying to validate
        if (!yesInput || !noInput || !document.getElementById('totalClients')) {
            return true; // Skip validation if elements don't exist
        }
        
        // Clear previous validation states
        yesInput.style.borderColor = '';
        noInput.style.borderColor = '';
        
        // Remove existing error message if any
        const existingError = document.getElementById('satisfaction-error');
        if (existingError) {
            existingError.remove();
        }
        
        if (satisfactionTotal > totalClients && totalClients > 0) {
            // Add error styling
            yesInput.style.borderColor = '#EF4444'; // Use direct color instead of CSS variable
            noInput.style.borderColor = '#EF4444';
            
            // Create and show error message
            const errorDiv = document.createElement('div');
            errorDiv.id = 'satisfaction-error';
            errorDiv.style.color = '#EF4444';
            errorDiv.style.fontSize = '14px';
            errorDiv.style.marginTop = '8px';
            errorDiv.textContent = `Total satisfaction responses (${satisfactionTotal}) cannot exceed total clients served (${totalClients})`;
            
            // Insert error message after the satisfaction survey section
            const satisfactionSection = yesInput.closest('.form-section');
            if (satisfactionSection) {
                satisfactionSection.appendChild(errorDiv);
            }
            
            return false;
        }
        
        return true;
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const dateField = document.getElementById('date');
        this.setDefaultDate();
        
        if (!this.validateSatisfactionSurvey()) {
            this.showNotification('Please fix the validation errors before submitting.', 'error');
            return;
        }
        
        const officerName = document.getElementById('officerName').value;
        if (!officerName) {
            this.showNotification('Please select an officer name.', 'error');
            return;
        }
        
        const formData = {
            date: dateField.value,
            officer_name: officerName,
            new_member: parseInt(document.getElementById('newMember').value) || 0,
            amendment: parseInt(document.getElementById('amendment').value) || 0,
            yakap_assignment: parseInt(document.getElementById('yakapAssignment').value) || 0,
            er2: parseInt(document.getElementById('er2').value) || 0,
            total_clients: parseInt(document.getElementById('totalClients').value) || 0,
            yes_count: parseInt(document.getElementById('yesCount').value) || 0,
            no_count: parseInt(document.getElementById('noCount').value) || 0,
            created_at: new Date().toISOString()
        };
        
        try {
            await addDoc(collection(db, 'pacd_records'), formData);
            this.clearForm();
            this.showNotification('Record saved successfully!', 'success');
        } catch (error) {
            console.error('Form submission error:', error);
            this.showNotification('Error saving record. Please try again.', 'error');
        }
    }

    clearForm() {
        document.getElementById('dailyEntryForm').reset();
        document.getElementById('totalClients').value = '0';
        this.setDefaultDate();
        
        // Clear validation styling and error messages
        const yesInput = document.getElementById('yesCount');
        const noInput = document.getElementById('noCount');
        if (yesInput) yesInput.style.borderColor = '';
        if (noInput) noInput.style.borderColor = '';
        
        const existingError = document.getElementById('satisfaction-error');
        if (existingError) {
            existingError.remove();
        }
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateField = document.getElementById('date');
        if (dateField) dateField.value = today;
    }

    listenRecords() {
        const q = query(collection(db, 'pacd_records'), orderBy('date', 'desc'));
        onSnapshot(q, (snapshot) => {
            this.records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            this.displayRecords(this.records);
            this.updateStats(this.records);
            this.updateCharts(this.records);
            this.updateLastUpdated();
        }, (error) => {
            console.error('Firestore listen error:', error);
            this.showNotification('Error loading records.', 'error');
        });
    }

    loadRecords() {
        this.displayRecords(this.records);
    }

    displayRecords(records) {
        const tbody = document.getElementById('recordsTableBody');
        
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="empty-state">No records found. Start by adding a new record!</td></tr>';
            return;
        }

        tbody.innerHTML = records.map(record => `
            <tr>
                <td>${record.id}</td>
                <td>${record.date}</td>
                <td>${record.officer_name}</td>
                <td>${record.new_member}</td>
                <td>${record.amendment}</td>
                <td>${record.yakap_assignment}</td>
                <td>${record.er2}</td>
                <td><strong>${record.total_clients}</strong></td>
                <td>${record.yes_count}</td>
                <td>${record.no_count}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" onclick="app.editRecord('${record.id}')" title="Edit">&#9998;</button>
                        <button class="btn-action btn-delete" onclick="app.deleteRecord('${record.id}')" title="Delete">&#128465;</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    editRecord(firestoreId) {
        const record = this.records.find(r => r.id === firestoreId);
        if (!record) return;
        document.getElementById('editId').value = firestoreId;
        document.getElementById('editDate').value = record.date;
        document.getElementById('editOfficerName').value = record.officer_name;
        document.getElementById('editNewMember').value = record.new_member;
        document.getElementById('editAmendment').value = record.amendment;
        document.getElementById('editYakapAssignment').value = record.yakap_assignment;
        document.getElementById('editEr2').value = record.er2;
        document.getElementById('editYesCount').value = record.yes_count;
        document.getElementById('editNoCount').value = record.no_count;
        document.getElementById('editModal').classList.add('active');
    }

    async handleEditSubmit(e) {
        e.preventDefault();
        
        const firestoreId = document.getElementById('editId').value;
        const total = (parseInt(document.getElementById('editNewMember').value) || 0) +
                     (parseInt(document.getElementById('editAmendment').value) || 0) +
                     (parseInt(document.getElementById('editYakapAssignment').value) || 0) +
                     (parseInt(document.getElementById('editEr2').value) || 0);
        
        const yesCount = parseInt(document.getElementById('editYesCount').value) || 0;
        const noCount  = parseInt(document.getElementById('editNoCount').value) || 0;
        
        if ((yesCount + noCount) > total && total > 0) {
            this.showNotification(`Satisfaction responses cannot exceed total clients served (${total})`, 'error');
            return;
        }
        
        try {
            await updateDoc(doc(db, 'pacd_records', firestoreId), {
                date:             document.getElementById('editDate').value,
                officer_name:     document.getElementById('editOfficerName').value,
                new_member:       parseInt(document.getElementById('editNewMember').value) || 0,
                amendment:        parseInt(document.getElementById('editAmendment').value) || 0,
                yakap_assignment: parseInt(document.getElementById('editYakapAssignment').value) || 0,
                er2:              parseInt(document.getElementById('editEr2').value) || 0,
                total_clients:    total,
                yes_count:        yesCount,
                no_count:         noCount
            });
            this.closeEditModal();
            this.showNotification('Record updated successfully!', 'success');
        } catch (error) {
            console.error('Edit submission error:', error);
            this.showNotification('Error updating record. Please try again.', 'error');
        }
    }

    async deleteRecord(firestoreId) {
        if (confirm('Are you sure you want to delete this record?')) {
            try {
                await deleteDoc(doc(db, 'pacd_records', firestoreId));
                this.showNotification('Record deleted successfully!', 'success');
            } catch (error) {
                console.error('Delete record error:', error);
                this.showNotification('Error deleting record. Please try again.', 'error');
            }
        }
    }

    closeEditModal() {
        document.getElementById('editModal').classList.remove('active');
    }

    filterRecords() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const filterDate = document.getElementById('filterDate').value;
        
        let filtered = this.records;
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.officer_name.toLowerCase().includes(searchTerm) ||
                r.date.includes(searchTerm)
            );
        }
        if (filterDate) {
            filtered = filtered.filter(r => r.date === filterDate);
        }
        this.displayRecords(filtered);
    }

    updateDashboard() {
        this.updateStats(this.records);
        this.updateCharts(this.records);
    }

    updateStats(records) {
        const totalRecords = records.length;
        const totalClients = records.reduce((sum, record) => sum + record.total_clients, 0);
        const totalYes = records.reduce((sum, record) => sum + record.yes_count, 0);
        const totalNo = records.reduce((sum, record) => sum + record.no_count, 0);
        const totalResponses = totalYes + totalNo;
        const satisfactionRate = totalResponses > 0 ? ((totalYes / totalResponses) * 100).toFixed(1) : 0;
        const avgDailyClients = totalRecords > 0 ? Math.round(totalClients / totalRecords) : 0;
        
        document.getElementById('totalRecords').textContent = totalRecords;
        document.getElementById('totalClientsServed').textContent = totalClients.toLocaleString();
        document.getElementById('satisfactionRate').textContent = `${satisfactionRate}%`;
        document.getElementById('avgDailyClients').textContent = avgDailyClients;
    }

    updateCharts(records) {
        if (records.length === 0) return;
        
        // Sort records by date for charts
        const sortedRecords = records.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const labels = sortedRecords.map(record => record.date);
        const clientsData = sortedRecords.map(record => record.total_clients);
        
        const totalYes = records.reduce((sum, r) => sum + r.yes_count, 0);
        const totalNo = records.reduce((sum, r) => sum + r.no_count, 0);

        const commonTooltip = {
            backgroundColor: '#1F2937',
            titleColor: '#F9FAFB',
            bodyColor: '#D1FAE5',
            borderColor: '#00875A',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            titleFont: { size: 13, weight: '600' },
            bodyFont: { size: 12 }
        };

        // ── Clients Trend Chart (smooth gradient area) ──
        const clientsCtx = document.getElementById('clientsChart').getContext('2d');
        if (clientsChart) clientsChart.destroy();

        const gradient = clientsCtx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(0, 135, 90, 0.35)');
        gradient.addColorStop(1, 'rgba(0, 135, 90, 0.00)');

        clientsChart = new Chart(clientsCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Clients Served',
                    data: clientsData,
                    borderColor: '#00875A',
                    backgroundColor: gradient,
                    tension: 0.45,
                    fill: true,
                    borderWidth: 3,
                    pointBackgroundColor: '#00875A',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#006B48',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: commonTooltip
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                        ticks: {
                            color: '#6B7280',
                            font: { size: 11 },
                            padding: 8,
                            stepSize: 1
                        },
                        border: { display: false }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#6B7280', font: { size: 11 }, maxRotation: 0 },
                        border: { display: false }
                    }
                }
            }
        });

        // ── Customer Satisfaction Chart (doughnut) ──
        const satisfactionCtx = document.getElementById('satisfactionChart').getContext('2d');
        if (satisfactionChart) satisfactionChart.destroy();

        satisfactionChart = new Chart(satisfactionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Satisfied (Yes)', 'Unsatisfied (No)'],
                datasets: [{
                    data: [totalYes, totalNo],
                    backgroundColor: ['#00875A', '#EF4444'],
                    hoverBackgroundColor: ['#006B48', '#DC2626'],
                    borderColor: '#fff',
                    borderWidth: 3,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: '#374151',
                            font: { size: 12, weight: '500' },
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        ...commonTooltip,
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                                return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    exportToExcel() {
        try {
            const records = this.records;

            if (records.length === 0) {
                this.showNotification('No records to export.', 'warning');
                return;
            }

            // Build rows with friendly headers
            const rows = records.map(r => ({
                'ID':                 r.id,
                'Date':               r.date,
                'Officer Name':       r.officer_name,
                'New Member':         r.new_member,
                'Amendment':          r.amendment,
                'Yakap Assignment':   r.yakap_assignment,
                'ER2':                r.er2,
                'Total Clients':      r.total_clients,
                'Yes Count':          r.yes_count,
                'No Count':           r.no_count
            }));

            const worksheet = XLSX.utils.json_to_sheet(rows);

            // Set column widths
            worksheet['!cols'] = [
                { wch: 6  },   // ID
                { wch: 12 },   // Date
                { wch: 30 },   // Officer Name
                { wch: 12 },   // New Member
                { wch: 12 },   // Amendment
                { wch: 18 },   // Yakap Assignment
                { wch: 8  },   // ER2
                { wch: 14 },   // Total Clients
                { wch: 10 },   // Yes Count
                { wch: 10 }    // No Count
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'PACD Records');

            const filename = `pacd_records_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, filename);

            this.showNotification('Data exported to Excel successfully!', 'success');
        } catch (error) {
            console.error('Excel export error:', error);
            this.showNotification('Error exporting data to Excel.', 'error');
        }
    }

    backupData() {
        try {
            const records = this.records;
            const backupData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                records: records
            };
            
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pacd_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            this.showNotification('Data backup created successfully!', 'success');
        } catch (error) {
            console.error('Backup error:', error);
            this.showNotification('Error creating backup.', 'error');
        }
    }

    restoreData() {
        document.getElementById('fileInput').click();
    }

    handleFileRestore(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const backupData = JSON.parse(event.target.result);
                
                if (!backupData.records || !Array.isArray(backupData.records)) {
                    throw new Error('Invalid backup file format');
                }
                
                if (confirm('This will ADD all backup records to the database. Continue?')) {
                    for (const record of backupData.records) {
                        await addDoc(collection(db, 'pacd_records'), {
                            date:             record.date,
                            officer_name:     record.officer_name,
                            new_member:       record.new_member || 0,
                            amendment:        record.amendment || 0,
                            yakap_assignment: record.yakap_assignment || 0,
                            er2:              record.er2 || 0,
                            total_clients:    record.total_clients || 0,
                            yes_count:        record.yes_count || 0,
                            no_count:         record.no_count || 0,
                            created_at:       record.created_at || new Date().toISOString()
                        });
                    }
                    this.showNotification('Data restored successfully!', 'success');
                }
            } catch (error) {
                console.error('Restore error:', error);
                this.showNotification('Error restoring data. Please check the file format.', 'error');
            }
        };
        
        reader.readAsText(file);
        e.target.value = '';
    }

    updateLastUpdated() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        const dateString = now.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = `Last updated: ${dateString} at ${timeString}`;
        }
    }

    startClock() {
        // Update every second
        setInterval(() => {
            this.updateLastUpdated();
        }, 1000);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '600',
            zIndex: '10000',
            maxWidth: '300px',
            wordWrap: 'break-word',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            transform: 'translateX(400px)',
            transition: 'transform 0.3s ease'
        });
        
        // Set background color based on type
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the application when the page loads
// Must be on window so inline onclick handlers can access it from module scope
const app = new PACDMonitoringSystem();
window.app = app;
