import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, limit } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

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
        document.getElementById('exportWeeklySummary').addEventListener('click', () => this.openExportModal('week'));
        document.getElementById('exportMonthlySummary').addEventListener('click', () => this.openExportModal('month'));
        document.getElementById('backupData').addEventListener('click', () => this.backupData());
        document.getElementById('restoreData').addEventListener('click', () => this.restoreData());

        // Dashboard PDF export
        document.getElementById('exportDashboardPDF').addEventListener('click', () => this.exportDashboardPDF());

        // History modal
        document.getElementById('viewHistory').addEventListener('click', () => this.openHistoryModal());
        document.getElementById('closeHistoryModal').addEventListener('click', () => this.closeHistoryModal());
        document.getElementById('historyModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('historyModal')) this.closeHistoryModal();
        });

        // Export summary modal
        document.getElementById('closeExportModal').addEventListener('click', () => this.closeExportModal());
        document.getElementById('closeExportModal2').addEventListener('click', () => this.closeExportModal());
        document.getElementById('confirmExportSummary').addEventListener('click', () => this.confirmExportSummary());
        document.getElementById('exportSummaryModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('exportSummaryModal')) this.closeExportModal();
        });

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
            yesInput.style.borderColor = '#EF4444';
            noInput.style.borderColor = '#EF4444';
            this.showNotification(`Survey responses (${satisfactionTotal}) cannot exceed total clients served (${totalClients})`, 'error');
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
            const docRef = await addDoc(collection(db, 'pacd_records'), formData);
            await this.logActivity('added', docRef.id, formData.officer_name, formData.date);
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
            this.showNotification(`Survey responses cannot exceed total clients served (${total})`, 'error');
            return;
        }
        
        const editedDate = document.getElementById('editDate').value;
        const editedOfficer = document.getElementById('editOfficerName').value;
        try {
            await updateDoc(doc(db, 'pacd_records', firestoreId), {
                date:             editedDate,
                officer_name:     editedOfficer,
                new_member:       parseInt(document.getElementById('editNewMember').value) || 0,
                amendment:        parseInt(document.getElementById('editAmendment').value) || 0,
                yakap_assignment: parseInt(document.getElementById('editYakapAssignment').value) || 0,
                er2:              parseInt(document.getElementById('editEr2').value) || 0,
                total_clients:    total,
                yes_count:        yesCount,
                no_count:         noCount
            });
            await this.logActivity('edited', firestoreId, editedOfficer, editedDate);
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
                const record = this.records.find(r => r.id === firestoreId);
                await deleteDoc(doc(db, 'pacd_records', firestoreId));
                await this.logActivity('deleted', firestoreId, record?.officer_name || 'Unknown', record?.date || '');
                this.showNotification('Record deleted successfully!', 'success');
            } catch (error) {
                console.error('Delete record error:', error);
                this.showNotification('Error deleting record. Please try again.', 'error');
            }
        }
    }

    async logActivity(action, recordId, officerName, date) {
        try {
            await addDoc(collection(db, 'pacd_activity_log'), {
                action,
                record_id:    recordId,
                officer_name: officerName,
                record_date:  date,
                timestamp:    serverTimestamp()
            });
        } catch (e) {
            console.error('Log activity error:', e);
        }
    }

    async openHistoryModal() {
        document.getElementById('historyModal').classList.add('active');
        const listEl = document.getElementById('historyList');
        listEl.innerHTML = '<p style="color:var(--gray-400);text-align:center;padding:24px 0;">Loading...</p>';

        try {
            const q = query(collection(db, 'pacd_activity_log'), orderBy('timestamp', 'desc'), limit(100));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                listEl.innerHTML = '<p style="color:var(--gray-400);text-align:center;padding:24px 0;">No activity recorded yet.</p>';
                return;
            }

            const actionMeta = {
                added:   { label: 'Added',   color: '#10B981', bg: '#D1FAE5' },
                edited:  { label: 'Edited',  color: '#3B82F6', bg: '#DBEAFE' },
                deleted: { label: 'Deleted', color: '#EF4444', bg: '#FEE2E2' }
            };

            listEl.innerHTML = snapshot.docs.map(d => {
                const log = d.data();
                const m = actionMeta[log.action] || actionMeta.edited;
                const ts = log.timestamp?.toDate();
                const timeStr = ts ? ts.toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'Just now';
                return `
                    <div class="history-item">
                        <div class="history-badge" style="background:${m.bg};color:${m.color};">${m.label}</div>
                        <div class="history-details">
                            <span class="history-officer">${log.officer_name}</span>
                            <span class="history-meta">Record date: ${log.record_date}</span>
                        </div>
                        <div class="history-time">${timeStr}</div>
                    </div>`;
            }).join('');
        } catch (error) {
            console.error('Load history error:', error);
            listEl.innerHTML = '<p style="color:var(--error);text-align:center;padding:24px 0;">Error loading history.</p>';
        }
    }

    closeHistoryModal() {
        document.getElementById('historyModal').classList.remove('active');
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
        const satisfactionRate = totalClients > 0 ? ((totalYes / totalClients) * 100).toFixed(1) : 0;
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
                labels: ['Answered Survey', 'Did Not Answer'],
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
                'Answered Survey':    r.yes_count,
                'Did Not Answer':     r.no_count
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

    async exportDashboardPDF() {
        const btn = document.getElementById('exportDashboardPDF');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Generating...';
        btn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 12;

            // ── Header ──
            pdf.setFillColor(0, 135, 90);
            pdf.rect(0, 0, pageW, 22, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('PACD Monitoring System — Dashboard Report', margin, 14);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 14, { align: 'right' });

            // ── Stats summary ──
            pdf.setTextColor(30, 41, 59);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Summary Statistics', margin, 32);

            const stats = [
                ['Total Records',        document.getElementById('totalRecords').textContent],
                ['Total Clients Served', document.getElementById('totalClientsServed').textContent],
                ['Satisfaction Rate',    document.getElementById('satisfactionRate').textContent],
                ['Avg Daily Clients',    document.getElementById('avgDailyClients').textContent]
            ];

            const cellW = (pageW - margin * 2) / 4;
            stats.forEach(([label, value], i) => {
                const x = margin + i * cellW;
                pdf.setFillColor(241, 248, 241);
                pdf.roundedRect(x, 35, cellW - 2, 18, 2, 2, 'F');
                pdf.setFontSize(7);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(100, 116, 139);
                pdf.text(label, x + (cellW - 2) / 2, 41, { align: 'center' });
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(0, 135, 90);
                pdf.text(value, x + (cellW - 2) / 2, 49, { align: 'center' });
            });

            // ── Charts ──
            pdf.setTextColor(30, 41, 59);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Charts', margin, 63);

            const chartIds = ['clientsChart', 'satisfactionChart'];
            const chartTitles = ['Clients Served Trend', 'Customer Satisfaction'];
            const chartW = (pageW - margin * 2 - 6) / 2;
            const chartH = chartW * 0.65;

            for (let i = 0; i < chartIds.length; i++) {
                const canvas = document.getElementById(chartIds[i]);
                const imgData = canvas.toDataURL('image/png', 1.0);
                const x = margin + i * (chartW + 6);
                const y = 66;
                pdf.setFillColor(255, 255, 255);
                pdf.setDrawColor(226, 232, 240);
                pdf.roundedRect(x, y, chartW, chartH + 8, 2, 2, 'FD');
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(51, 65, 85);
                pdf.text(chartTitles[i], x + chartW / 2, y + 6, { align: 'center' });
                pdf.addImage(imgData, 'PNG', x + 2, y + 8, chartW - 4, chartH - 2);
            }

            const filename = `pacd_dashboard_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            this.showNotification('Dashboard exported as PDF!', 'success');
        } catch (error) {
            console.error('PDF export error:', error);
            this.showNotification('Error exporting dashboard.', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    openExportModal(type) {
        this._exportModalType = type;
        const now = new Date();

        if (type === 'week') {
            document.getElementById('exportSummaryTitle').textContent = 'Export Weekly Summary';
            document.getElementById('weekPickerGroup').style.display = 'block';
            document.getElementById('monthPickerGroup').style.display = 'none';
            // Default to current week (YYYY-Www format)
            const year = now.getFullYear();
            const startOfYear = new Date(year, 0, 1);
            const weekNum = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
            document.getElementById('weekPicker').value = `${year}-W${String(weekNum).padStart(2, '0')}`;
        } else {
            document.getElementById('exportSummaryTitle').textContent = 'Export Monthly Summary';
            document.getElementById('monthPickerGroup').style.display = 'block';
            document.getElementById('weekPickerGroup').style.display = 'none';
            const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            document.getElementById('monthPicker').value = ym;
        }

        document.getElementById('exportSummaryModal').classList.add('active');
    }

    closeExportModal() {
        document.getElementById('exportSummaryModal').classList.remove('active');
    }

    confirmExportSummary() {
        if (this._exportModalType === 'week') {
            const val = document.getElementById('weekPicker').value; // e.g. "2026-W19"
            if (!val) { this.showNotification('Please select a week.', 'error'); return; }

            // Parse YYYY-Www → Monday date
            const [yearStr, weekStr] = val.split('-W');
            const year = parseInt(yearStr);
            const week = parseInt(weekStr);
            const jan4 = new Date(year, 0, 4); // Jan 4 is always in week 1
            const monday = new Date(jan4);
            monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);

            const fmt = d => d.toISOString().split('T')[0];
            const weekStart = fmt(monday);
            const weekEnd   = fmt(sunday);

            const filtered = this.records.filter(r => r.date >= weekStart && r.date <= weekEnd);
            if (filtered.length === 0) {
                this.showNotification(`No records found for ${weekStart} to ${weekEnd}.`, 'warning');
                return;
            }
            this.closeExportModal();
            this._exportSummarySheet(filtered, `Weekly Summary: ${weekStart} to ${weekEnd}`, `pacd_weekly_${weekStart}_${weekEnd}.xlsx`);

        } else {
            const val = document.getElementById('monthPicker').value; // e.g. "2026-05"
            if (!val) { this.showNotification('Please select a month.', 'error'); return; }

            const [year, month] = val.split('-');
            const monthStart = `${year}-${month}-01`;
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const monthEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

            const filtered = this.records.filter(r => r.date >= monthStart && r.date <= monthEnd);
            if (filtered.length === 0) {
                this.showNotification(`No records found for ${val}.`, 'warning');
                return;
            }
            const monthLabel = new Date(`${year}-${month}-01`).toLocaleString('default', { month: 'long', year: 'numeric' });
            this.closeExportModal();
            this._exportSummarySheet(filtered, `Monthly Summary: ${monthLabel}`, `pacd_monthly_${val}.xlsx`);
        }
    }

    _exportSummarySheet(records, title, filename) {
        try {
            // Sort by date
            const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

            // ── Detail rows ──
            const detailRows = sorted.map(r => ({
                'Date':               r.date,
                'Officer Name':       r.officer_name,
                'New Member':         r.new_member,
                'Amendment':          r.amendment,
                'Yakap Assignment':   r.yakap_assignment,
                'ER2':                r.er2,
                'Total Clients':      r.total_clients,
                'Answered Survey':    r.yes_count,
                'Did Not Answer':     r.no_count
            }));

            // ── Totals row ──
            const tot = (key) => sorted.reduce((s, r) => s + (r[key] || 0), 0);
            const totalYes = tot('yes_count');
            const totalClients = tot('total_clients');
            const satRate = totalClients > 0 ? ((totalYes / totalClients) * 100).toFixed(1) + '%' : 'N/A';

            detailRows.push({
                'Date':               'TOTAL',
                'Officer Name':       '',
                'New Member':         tot('new_member'),
                'Amendment':          tot('amendment'),
                'Yakap Assignment':   tot('yakap_assignment'),
                'ER2':                tot('er2'),
                'Total Clients':      totalClients,
                'Answered Survey':    totalYes,
                'Did Not Answer':     tot('no_count')
            });

            // ── Per-officer summary ──
            const byOfficer = {};
            sorted.forEach(r => {
                if (!byOfficer[r.officer_name]) {
                    byOfficer[r.officer_name] = { days: 0, new_member: 0, amendment: 0, yakap_assignment: 0, er2: 0, total_clients: 0, yes_count: 0, no_count: 0 };
                }
                const o = byOfficer[r.officer_name];
                o.days++;
                o.new_member       += r.new_member || 0;
                o.amendment        += r.amendment || 0;
                o.yakap_assignment += r.yakap_assignment || 0;
                o.er2              += r.er2 || 0;
                o.total_clients    += r.total_clients || 0;
                o.yes_count        += r.yes_count || 0;
                o.no_count         += r.no_count || 0;
            });

            const officerRows = Object.entries(byOfficer).map(([name, o]) => ({
                'Officer Name':       name,
                'Days':               o.days,
                'New Member':         o.new_member,
                'Amendment':          o.amendment,
                'Yakap Assignment':   o.yakap_assignment,
                'ER2':                o.er2,
                'Total Clients':      o.total_clients,
                'Answered Survey':    o.yes_count,
                'Did Not Answer':     o.no_count,
                'Survey Response Rate': o.total_clients > 0 ? ((o.yes_count / o.total_clients) * 100).toFixed(1) + '%' : 'N/A'
            }));

            const workbook = XLSX.utils.book_new();

            // Sheet 1 — Daily Detail
            const ws1 = XLSX.utils.json_to_sheet(detailRows);
            ws1['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 16 }];
            XLSX.utils.book_append_sheet(workbook, ws1, 'Daily Detail');

            // Sheet 2 — Officer Summary
            const ws2 = XLSX.utils.json_to_sheet(officerRows);
            ws2['!cols'] = [{ wch: 28 }, { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
            XLSX.utils.book_append_sheet(workbook, ws2, 'Officer Summary');

            XLSX.writeFile(workbook, filename);
            this.showNotification(`"${title}" exported successfully!`, 'success');
        } catch (error) {
            console.error('Summary export error:', error);
            this.showNotification('Error exporting summary.', 'error');
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
