/**
 * Dashboard Logic for Citizen Complaint Management System
 */

// Mock Data
const departments = ["All Departments", "Roads", "Water Supply", "Electricity", "Sanitation", "Public Safety"];

const complaintsData = [
    { id: "CMP-1001", title: "Pothole on Main St", dept: "Roads", priority: "High", status: "Pending", officer: "John Doe", date: "2026-03-01" },
    { id: "CMP-1002", title: "Water Leakage in Sector 4", dept: "Water Supply", priority: "Medium", status: "Resolved", officer: "Jane Smith", date: "2026-03-02" },
    { id: "CMP-1003", title: "Street Light Not Working", dept: "Electricity", priority: "Low", status: "In Progress", officer: "Mike Ross", date: "2026-03-03" },
    { id: "CMP-1004", title: "Garbage Collection Delayed", dept: "Sanitation", priority: "Medium", status: "Pending", officer: "Sarah Connor", date: "2026-03-04" },
    { id: "CMP-1005", title: "Traffic Signal Malfunction", dept: "Public Safety", priority: "High", status: "In Progress", officer: "James Bond", date: "2026-03-05" },
    { id: "CMP-1006", title: "Broken Pavement near Park", dept: "Roads", priority: "Low", status: "Resolved", officer: "John Doe", date: "2026-03-06" },
    { id: "CMP-1007", title: "No Water Supply in Block B", dept: "Water Supply", priority: "High", status: "Pending", officer: "Jane Smith", date: "2026-03-07" },
    { id: "CMP-1008", title: "Frequent Power Cuts", dept: "Electricity", priority: "Medium", status: "Pending", officer: "Mike Ross", date: "2026-03-08" },
    { id: "CMP-1009", title: "Illegal Dumping Site", dept: "Sanitation", priority: "High", status: "In Progress", officer: "Sarah Connor", date: "2026-03-09" },
    { id: "CMP-1010", title: "Noise Complaint - Night Club", dept: "Public Safety", priority: "Low", status: "Resolved", officer: "James Bond", date: "2026-03-10" }
];

const officersData = [
    { id: "OFF-201", name: "John Doe", dept: "Roads", active: 2, resolved: 15, score: 88, status: "Active" },
    { id: "OFF-202", name: "Jane Smith", dept: "Water Supply", active: 3, resolved: 12, score: 92, status: "Active" },
    { id: "OFF-203", name: "Mike Ross", dept: "Electricity", active: 2, resolved: 10, score: 85, status: "Active" },
    { id: "OFF-204", name: "Sarah Connor", dept: "Sanitation", active: 4, resolved: 8, score: 78, status: "Active" },
    { id: "OFF-205", name: "James Bond", dept: "Public Safety", active: 1, resolved: 20, score: 95, status: "Active" }
];

const activityLog = [
    { text: "Officer John Doe assigned to CMP-1001", time: "5 mins ago" },
    { text: "Officer Jane Smith resolved CMP-1002", time: "1 hour ago" },
    { text: "Admin reassigned CMP-1005 to James Bond", time: "3 hours ago" }
];

const notifications = [
    { id: 1, text: "Officer John Doe assigned to CMP-1001", time: "5 mins ago", icon: "user-plus", color: "primary" },
    { id: 2, text: "Complaint CMP-1002 status updated to Resolved", time: "1 hour ago", icon: "check-circle", color: "success" },
    { id: 3, text: "New complaint submitted: CMP-1010", time: "2 hours ago", icon: "plus-circle", color: "info" }
];

// State
let currentDepartment = "All Departments";
let searchTerm = "";
let statusFilter = "All";
let priorityFilter = "All";
let officerFilter = "All";
let charts = {};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initDepartmentSelector();
    initNotifications();
    initCharts();
    initOfficerFilter();
    renderTable();
    renderOfficersTable();
    renderWorkload();
    renderActivityLog();
    updateStats();
    initModalHandlers();

    // Event Listeners for Filters
    document.getElementById('search-box').addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderTable();
    });

    document.getElementById('status-filter').addEventListener('change', (e) => {
        statusFilter = e.target.value;
        renderTable();
    });

    document.getElementById('priority-filter').addEventListener('change', (e) => {
        priorityFilter = e.target.value;
        renderTable();
    });

    document.getElementById('officer-filter').addEventListener('change', (e) => {
        officerFilter = e.target.value;
        renderTable();
    });
});

// Sidebar Toggle
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const navLinks = document.querySelectorAll('#sidebar .nav-link[data-section]');
    const deptLinks = document.querySelectorAll('#sidebar .submenu-list .nav-link[data-dept]');

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            switchSection(section);
            
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    deptLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const dept = link.getAttribute('data-dept');
            
            // Update state and UI
            currentDepartment = dept;
            document.getElementById('current-dept-display').innerText = dept;
            
            // Ensure we are on dashboard to see the changes
            switchSection('dashboard');
            
            updateStats();
            renderTable();
            updateCharts();
            
            // Close sidebar on mobile if open
            if (window.innerWidth < 768) {
                sidebar.classList.remove('show');
            }
        });
    });
}

function switchSection(sectionId) {
    const sections = [
        'dashboard-section', 
        'complaints-section', 
        'officers-section', 
        'tasks-section', 
        'analytics-section', 
        'reports-section', 
        'settings-section'
    ];
    
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('d-none');
    });

    const targetId = `${sectionId}-section`;
    const target = document.getElementById(targetId);
    
    if (target) {
        target.classList.remove('d-none');
        
        // Specific rendering based on section
        if (sectionId === 'dashboard') {
            renderRecentComplaintsMini();
            updateStats();
            updateCharts();
        } else if (sectionId === 'complaints') {
            renderTable();
        } else if (sectionId === 'officers') {
            renderOfficersTable();
            renderWorkload();
        } else if (sectionId === 'tasks') {
            renderTasks();
        } else if (sectionId === 'analytics') {
            renderDetailedAnalytics();
        }
    }

    // Scroll to top
    window.scrollTo(0, 0);
}

// Render Recent Complaints for Mini Dashboard
function renderRecentComplaintsMini() {
    const tbody = document.getElementById('recent-complaints-mini');
    if (!tbody) return;
    
    const filtered = complaintsData
        .filter(c => currentDepartment === 'All Departments' || c.dept === currentDepartment)
        .slice(0, 5);
        
    tbody.innerHTML = filtered.map(c => `
        <tr>
            <td><span class="fw-bold">#${c.id}</span></td>
            <td>${c.title}</td>
            <td><span class="badge bg-${getStatusColor(c.status)}">${c.status}</span></td>
            <td class="small text-muted">${c.date}</td>
        </tr>
    `).join('');
}

// Render Tasks
function renderTasks() {
    const select = document.getElementById('task-assignee-select');
    if (select) {
        select.innerHTML = officersData.map(o => `<option value="${o.id}">${o.name}</option>`).join('');
    }
}

// Detailed Analytics Charts
let detailedPriorityChart = null;
let deptResolutionChart = null;

function renderDetailedAnalytics() {
    const ctxPriority = document.getElementById('priorityChart-detailed');
    const ctxDept = document.getElementById('deptResolutionChart');
    
    if (!ctxPriority || !ctxDept) return;

    // Destroy existing if they exist
    if (detailedPriorityChart) detailedPriorityChart.destroy();
    if (deptResolutionChart) deptResolutionChart.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#e0e0e0' : '#666';

    // Priority Chart (Detailed)
    detailedPriorityChart = new Chart(ctxPriority, {
        type: 'doughnut',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                data: [
                    complaintsData.filter(c => c.priority === 'High').length,
                    complaintsData.filter(c => c.priority === 'Medium').length,
                    complaintsData.filter(c => c.priority === 'Low').length
                ],
                backgroundColor: ['#dc3545', '#ffc107', '#198754'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor } }
            }
        }
    });

    // Dept Resolution Chart
    const depts = [...new Set(complaintsData.map(c => c.department))];
    const resolutionRates = depts.map(d => {
        const deptComplaints = complaintsData.filter(c => c.department === d);
        const resolved = deptComplaints.filter(c => c.status === 'Resolved').length;
        return (resolved / deptComplaints.length) * 100;
    });

    deptResolutionChart = new Chart(ctxDept, {
        type: 'bar',
        data: {
            labels: depts,
            datasets: [{
                label: 'Resolution Rate (%)',
                data: resolutionRates,
                backgroundColor: '#0d6efd',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: isDark ? '#333' : '#eee' }, ticks: { color: textColor } },
                x: { grid: { display: false }, ticks: { color: textColor } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

window.switchSection = switchSection;

// Department Selector
function initDepartmentSelector() {
    const selector = document.getElementById('dept-selector');
    departments.forEach(dept => {
        const option = document.createElement('li');
        option.innerHTML = `<a class="dropdown-item" href="#" data-dept="${dept}">${dept}</a>`;
        option.addEventListener('click', (e) => {
            e.preventDefault();
            currentDepartment = dept;
            document.getElementById('current-dept-display').innerText = dept;
            updateStats();
            renderTable();
            updateCharts();
        });
        selector.appendChild(option);
    });
}

// Notifications
function initNotifications() {
    const container = document.getElementById('notification-list');
    const badge = document.getElementById('notification-badge');
    badge.innerText = notifications.length;

    notifications.forEach(note => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="bg-${note.color} text-white rounded-circle p-2 me-3">
                    <i class="bi bi-${note.icon}"></i>
                </div>
                <div>
                    <p class="mb-0 small fw-bold">${note.text}</p>
                    <span class="text-muted smaller">${note.time}</span>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

// Officer Management Logic
function renderOfficersTable() {
    const tbody = document.getElementById('officers-table-body');
    tbody.innerHTML = '';

    officersData.forEach(o => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="fw-bold">${o.id}</span></td>
            <td>${o.name}</td>
            <td>${o.dept}</td>
            <td>${o.active}</td>
            <td>${o.resolved}</td>
            <td>
                <div class="d-flex align-items-center">
                    <span class="me-2">${o.score}%</span>
                    <div class="progress flex-grow-1" style="height: 5px;">
                        <div class="progress-bar bg-success" style="width: ${o.score}%"></div>
                    </div>
                </div>
            </td>
            <td><span class="badge bg-${o.status === 'Active' ? 'success' : 'danger'}">${o.status}</span></td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="openOfficerProfile('${o.id}')">View</button>
                    <button class="btn btn-sm btn-outline-success" onclick="openAssignModal('${o.id}')">Assign</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="toggleOfficerStatus('${o.id}')">${o.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function initOfficerFilter() {
    const filter = document.getElementById('officer-filter');
    filter.innerHTML = '<option value="All">All Officers</option>';
    officersData.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.name;
        opt.innerText = o.name;
        filter.appendChild(opt);
    });
}

function renderWorkload() {
    const container = document.getElementById('workload-container');
    container.innerHTML = '';
    
    officersData.forEach(o => {
        const maxWorkload = 5;
        const percentage = (o.active / maxWorkload) * 100;
        const color = percentage > 80 ? 'danger' : percentage > 50 ? 'warning' : 'primary';
        
        container.innerHTML += `
            <div class="mb-3">
                <div class="d-flex justify-content-between mb-1">
                    <span class="small fw-bold">${o.name}</span>
                    <span class="small text-muted">${o.active} active complaints</span>
                </div>
                <div class="progress" style="height: 8px;">
                    <div class="progress-bar bg-${color}" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    });
}

function renderActivityLog() {
    const container = document.getElementById('activity-log-container');
    container.innerHTML = '';
    
    activityLog.forEach(log => {
        container.innerHTML += `
            <div class="d-flex mb-3 border-bottom pb-2">
                <div class="me-3">
                    <div class="bg-light rounded p-2"><i class="bi bi-info-circle text-primary"></i></div>
                </div>
                <div>
                    <p class="mb-0 small">${log.text}</p>
                    <span class="smaller text-muted">${log.time}</span>
                </div>
            </div>
        `;
    });
}

// Modal Handlers
function openOfficerProfile(id) {
    const officer = officersData.find(o => o.id === id);
    const officerComplaints = complaintsData.filter(c => c.officer === officer.name);
    
    const content = document.getElementById('officer-profile-content');
    content.innerHTML = `
        <div class="row g-4">
            <div class="col-md-4 text-center border-end">
                <img src="https://ui-avatars.com/api/?name=${officer.name}&background=0d6efd&color=fff&size=128" class="rounded-circle mb-3 shadow-sm">
                <h5 class="fw-bold">${officer.name}</h5>
                <p class="text-muted">${officer.dept}</p>
                <div class="badge bg-success mb-3">${officer.status}</div>
                <div class="h4 fw-bold text-primary">${officer.score}%</div>
                <div class="small text-muted">Performance Score</div>
            </div>
            <div class="col-md-8">
                <div class="row text-center mb-4">
                    <div class="col-4">
                        <div class="h3 fw-bold mb-0">${officer.active + officer.resolved}</div>
                        <div class="small text-muted">Total Handled</div>
                    </div>
                    <div class="col-4">
                        <div class="h3 fw-bold mb-0 text-success">${officer.resolved}</div>
                        <div class="small text-muted">Resolved</div>
                    </div>
                    <div class="col-4">
                        <div class="h3 fw-bold mb-0 text-warning">${officer.active}</div>
                        <div class="small text-muted">Pending</div>
                    </div>
                </div>
                <h6 class="fw-bold mb-3">Currently Assigned Complaints</h6>
                <div class="list-group list-group-flush">
                    ${officerComplaints.map(c => `
                        <div class="list-group-item px-0 d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-bold small">${c.id} - ${c.title}</div>
                                <div class="smaller text-muted">${c.date}</div>
                            </div>
                            <span class="badge bg-${getStatusColor(c.status)}">${c.status}</span>
                        </div>
                    `).join('') || '<p class="text-muted small">No active complaints.</p>'}
                </div>
            </div>
        </div>
    `;
    
    new bootstrap.Modal(document.getElementById('officerProfileModal')).show();
}

function openAssignModal(officerId) {
    const officer = officersData.find(o => o.id === officerId);
    document.getElementById('assign-officer-id').value = officer.id;
    document.getElementById('assign-officer-name').value = officer.name;
    
    // Populate unassigned complaints (mock: just any pending ones)
    const select = document.getElementById('assign-complaint-id');
    select.innerHTML = '';
    complaintsData.filter(c => c.status === 'Pending').forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.innerText = `${c.id} - ${c.title}`;
        select.appendChild(opt);
    });
    
    new bootstrap.Modal(document.getElementById('assignComplaintModal')).show();
}

function openReassignModal(complaintId) {
    const complaint = complaintsData.find(c => c.id === complaintId);
    document.getElementById('reassign-complaint-id').value = complaint.id;
    document.getElementById('reassign-complaint-title').value = complaint.title;
    document.getElementById('reassign-current-officer').value = complaint.officer;
    
    const select = document.getElementById('reassign-new-officer');
    select.innerHTML = '';
    officersData.filter(o => o.name !== complaint.officer).forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.name;
        opt.innerText = o.name;
        select.appendChild(opt);
    });
    
    new bootstrap.Modal(document.getElementById('reassignModal')).show();
}

function initModalHandlers() {
    document.getElementById('assign-complaint-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const complaintId = document.getElementById('assign-complaint-id').value;
        const officerName = document.getElementById('assign-officer-name').value;
        
        const complaint = complaintsData.find(c => c.id === complaintId);
        if (complaint) {
            complaint.officer = officerName;
            complaint.status = 'In Progress';
            
            // Log activity
            activityLog.unshift({ text: `Officer ${officerName} assigned to ${complaintId}`, time: "Just now" });
            
            // Update UI
            bootstrap.Modal.getInstance(document.getElementById('assignComplaintModal')).hide();
            renderTable();
            renderWorkload();
            renderActivityLog();
            updateStats();
        }
    });

    document.getElementById('reassign-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const complaintId = document.getElementById('reassign-complaint-id').value;
        const newOfficer = document.getElementById('reassign-new-officer').value;
        
        const complaint = complaintsData.find(c => c.id === complaintId);
        if (complaint) {
            const oldOfficer = complaint.officer;
            complaint.officer = newOfficer;
            
            // Log activity
            activityLog.unshift({ text: `Admin reassigned ${complaintId} from ${oldOfficer} to ${newOfficer}`, time: "Just now" });
            
            // Update UI
            bootstrap.Modal.getInstance(document.getElementById('reassignModal')).hide();
            renderTable();
            renderWorkload();
            renderActivityLog();
        }
    });
}

function toggleOfficerStatus(id) {
    const officer = officersData.find(o => o.id === id);
    if (officer) {
        officer.status = officer.status === 'Active' ? 'Inactive' : 'Active';
        renderOfficersTable();
    }
}

// Table Rendering
function renderTable() {
    const tbody = document.getElementById('complaints-table-body');
    tbody.innerHTML = '';

    const filtered = complaintsData.filter(c => {
        const matchesDept = currentDepartment === "All Departments" || c.dept === currentDepartment;
        const matchesSearch = c.title.toLowerCase().includes(searchTerm) || c.id.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === "All" || c.status === statusFilter;
        const matchesPriority = priorityFilter === "All" || c.priority === priorityFilter;
        const matchesOfficer = officerFilter === "All" || c.officer === officerFilter;
        return matchesDept && matchesSearch && matchesStatus && matchesPriority && matchesOfficer;
    });

    filtered.forEach(c => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="fw-bold text-primary">${c.id}</span></td>
            <td>${c.title}</td>
            <td>${c.dept}</td>
            <td><span class="badge bg-${getPriorityColor(c.priority)}">${c.priority}</span></td>
            <td><span class="badge bg-${getStatusColor(c.status)}">${c.status}</span></td>
            <td>${c.officer}</td>
            <td>${c.date}</td>
            <td>
                <button class="btn btn-sm btn-outline-warning" onclick="openReassignModal('${c.id}')">
                    <i class="bi bi-person-gear"></i> Reassign
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No complaints found matching the criteria.</td></tr>';
    }
}

function getPriorityColor(p) {
    switch(p) {
        case 'High': return 'danger';
        case 'Medium': return 'warning';
        case 'Low': return 'info';
        default: return 'secondary';
    }
}

function getStatusColor(s) {
    switch(s) {
        case 'Pending': return 'secondary';
        case 'In Progress': return 'primary';
        case 'Resolved': return 'success';
        default: return 'dark';
    }
}

// Charts Initialization
function initCharts() {
    const ctxStatus = document.getElementById('statusChart');
    const ctxPriority = document.getElementById('priorityChart');
    const ctxTrend = document.getElementById('trendChart');
    const ctxPerf = document.getElementById('officerPerformanceChart');

    if (ctxStatus) {
        charts.status = new Chart(ctxStatus.getContext('2d'), {
            type: 'bar',
            data: getStatusChartData(),
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    if (ctxPriority) {
        charts.priority = new Chart(ctxPriority.getContext('2d'), {
            type: 'pie',
            data: getPriorityChartData(),
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    if (ctxTrend) {
        charts.trend = new Chart(ctxTrend.getContext('2d'), {
            type: 'line',
            data: getTrendChartData(),
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    if (ctxPerf) {
        charts.performance = new Chart(ctxPerf.getContext('2d'), {
            type: 'bar',
            data: getPerformanceChartData(),
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

function updateCharts() {
    if (charts.status) {
        charts.status.data = getStatusChartData();
        charts.status.update();
    }
    if (charts.priority) {
        charts.priority.data = getPriorityChartData();
        charts.priority.update();
    }
    if (charts.trend) {
        charts.trend.data = getTrendChartData();
        charts.trend.update();
    }
    if (charts.performance) {
        charts.performance.data = getPerformanceChartData();
        charts.performance.update();
    }
}

function getPerformanceChartData() {
    return {
        labels: officersData.map(o => o.name),
        datasets: [{
            label: 'Resolved Complaints',
            data: officersData.map(o => o.resolved),
            backgroundColor: '#198754'
        }]
    };
}

function getStatusChartData() {
    const filtered = complaintsData.filter(c => currentDepartment === "All Departments" || c.dept === currentDepartment);
    const counts = { Pending: 0, "In Progress": 0, Resolved: 0 };
    filtered.forEach(c => counts[c.status]++);

    return {
        labels: Object.keys(counts),
        datasets: [{
            label: 'Complaints by Status',
            data: Object.values(counts),
            backgroundColor: ['#6c757d', '#0d6efd', '#198754']
        }]
    };
}

function getPriorityChartData() {
    const filtered = complaintsData.filter(c => currentDepartment === "All Departments" || c.dept === currentDepartment);
    const counts = { High: 0, Medium: 0, Low: 0 };
    filtered.forEach(c => counts[c.priority]++);

    return {
        labels: Object.keys(counts),
        datasets: [{
            data: Object.values(counts),
            backgroundColor: ['#dc3545', '#ffc107', '#0dcaf0']
        }]
    };
}

function getTrendChartData() {
    // Mock monthly trend
    return {
        labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
        datasets: [{
            label: 'New Complaints',
            data: [12, 19, 15, 25, 22, 30],
            borderColor: '#0d6efd',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(13, 110, 253, 0.1)'
        }]
    };
}

// Global function for theme.js to call
window.updateChartsTheme = (theme) => {
    const color = theme === 'dark' ? '#e0e0e0' : '#666';
    const gridColor = theme === 'dark' ? '#333' : '#eee';

    Object.values(charts).forEach(chart => {
        if (chart.options.scales) {
            if (chart.options.scales.x) {
                chart.options.scales.x.ticks.color = color;
                chart.options.scales.x.grid.color = gridColor;
            }
            if (chart.options.scales.y) {
                chart.options.scales.y.ticks.color = color;
                chart.options.scales.y.grid.color = gridColor;
            }
        }
        if (chart.options.plugins && chart.options.plugins.legend) {
            chart.options.plugins.legend.labels.color = color;
        }
        chart.update();
    });
};

function updateStats() {
    const filtered = complaintsData.filter(c => currentDepartment === "All Departments" || c.dept === currentDepartment);
    
    const total = filtered.length;
    const pending = filtered.filter(c => c.status === 'Pending').length;
    const resolved = filtered.filter(c => c.status === 'Resolved').length;
    const highPriority = filtered.filter(c => c.priority === 'High').length;

    document.getElementById('total-complaints').innerText = total;
    document.getElementById('pending-complaints').innerText = pending;
    document.getElementById('resolved-complaints').innerText = resolved;
    document.getElementById('high-priority-complaints').innerText = highPriority;
}
