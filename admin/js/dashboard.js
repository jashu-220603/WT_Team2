/**
 * Admin Dashboard JavaScript
 * Connected to Node.js Backend
 */

const API = (window.API_BASE_URL || "http://localhost:7000") + "/api";
const token = sessionStorage.getItem("jwt");
const role = sessionStorage.getItem("role");

if (!token || role !== "admin") {
    alert("Access denied. Please login as an admin.");
    window.location.href = "../index.html";
}

// Global data store
let complaintsData = [];
let officersData = [];
let departmentsData = [];

/* =========================
   INITIALIZATION
========================= */

document.addEventListener("DOMContentLoaded", () => {
    updateProfileInfo();
    setupNavigation();
    loadDashboardData();
    setupFilters();
    loadSettings();
    
    // Notifications Initialization
    fetchNotifications();
    setInterval(fetchNotifications, 30000); // Polling every 30s
});

/* =========================
   NOTIFICATIONS SYSTEM
========================= */

async function fetchNotifications() {
    try {
        const res = await fetch(`${API}/notifications`, {
            headers: { Authorization: "Bearer " + token }
        });
        if (!res.ok) return;
        
        const notifications = await res.json();
        const unreadCount = notifications.filter(n => !n.isRead).length;
        
        const badge = document.getElementById("notification-badge");
        if (badge) {
            badge.textContent = unreadCount;
            badge.classList.toggle("d-none", unreadCount === 0);
        }
        
        loadNotifications(notifications);
        
        // Check for new persistent alerts (Toast)
        const lastNotifId = localStorage.getItem("lastAdminNotifId");
        if (notifications.length > 0 && notifications[0]._id !== lastNotifId && !notifications[0].isRead) {
            showToast(notifications[0].title, notifications[0].message);
            localStorage.setItem("lastAdminNotifId", notifications[0]._id);
        }
    } catch (err) {
        console.error("Notif Error:", err);
    }
}

function loadNotifications(notifications) {
    const list = document.getElementById("notification-list");
    if (!list) return;

    if (notifications.length === 0) {
        list.innerHTML = `<div class="p-4 text-center text-muted small">No notifications yet</div>`;
        return;
    }

    list.innerHTML = notifications.slice(0, 5).map(n => `
        <div class="notification-item p-3 border-bottom ${n.isRead ? '' : 'bg-light'}" onclick="markAsRead('${n._id}')">
            <div class="d-flex gap-3">
                <div class="notif-icon bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style="width: 35px; height: 35px;">
                    <i class="bi ${getNotifIcon(n.type)}"></i>
                </div>
                <div class="flex-1">
                    <h6 class="mb-1 small fw-bold">${n.title}</h6>
                    <p class="mb-1 text-muted tiny">${n.message}</p>
                    <span class="text-primary tiny">${new Date(n.createdAt).toLocaleString()}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function getNotifIcon(type) {
    switch (type) {
        case 'concern_raised': return 'bi-exclamation-circle';
        case 'complaint_received': return 'bi-file-earmark-plus';
        case 'assignment': return 'bi-person-check';
        default: return 'bi-bell';
    }
}

async function markAsRead(id) {
    try {
        await fetch(`${API}/notifications/${id}/read`, {
            method: "PUT",
            headers: { Authorization: "Bearer " + token }
        });
        fetchNotifications();
    } catch (err) { console.error(err); }
}

function showToast(title, message) {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
        const container = document.createElement("div");
        container.id = "toast-container";
        container.className = "position-fixed bottom-0 end-0 p-3";
        container.style.zIndex = "1100";
        document.body.appendChild(container);
    }
    
    const toastId = "toast-" + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast show border-0 shadow-lg" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-primary text-white border-0">
                <i class="bi bi-bell-fill me-2"></i>
                <strong class="me-auto">${title}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    document.getElementById("toast-container").insertAdjacentHTML('beforeend', toastHtml);
    setTimeout(() => {
        const el = document.getElementById(toastId);
        if (el) el.remove();
    }, 5000);
}

function updateProfileInfo() {
    const storedName = sessionStorage.getItem("userName") || "Admin";
    
    // Greeting
    const adminGreeting = document.getElementById("admin-greeting");
    if (adminGreeting) adminGreeting.textContent = `Hello, ${storedName}`;

    // Sidebar & Profile Dropdown
    const adminNameEls = document.querySelectorAll(".text-dark.fw-medium");
    adminNameEls.forEach(el => el.textContent = storedName);

    const profileImgs = document.querySelectorAll("img[alt='Profile'], #admin-prof-img");
    let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(storedName)}&background=0d6efd&color=fff`;
    
    // Use role-specific storage to avoid collision with other portals
    let storedPhoto = sessionStorage.getItem("adminPhoto");
    
    // If adminPhoto doesn't exist, try to sync from common profilePhoto if it was just set
    if (!storedPhoto) {
        const commonPhoto = sessionStorage.getItem("profilePhoto");
        const storedRole = sessionStorage.getItem("role");
        if (commonPhoto && storedRole === "admin") {
            storedPhoto = commonPhoto;
            sessionStorage.setItem("adminPhoto", commonPhoto);
        }
    }

    if (storedPhoto && storedPhoto !== "undefined" && storedPhoto !== "") {
        if (storedPhoto.startsWith('http')) {
            avatarUrl = storedPhoto;
        } else {
            avatarUrl = `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${storedPhoto}`;
        }
    }
    
    profileImgs.forEach(img => img.src = avatarUrl);
}

function setupNavigation() {
    const navLinks = document.querySelectorAll(".nav-link[data-section]");
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const section = link.getAttribute("data-section");
            if (section === "settings") {
                document.getElementById("adminSettingsBtn").click();
                return;
            }
            switchSection(section);
            
            // Update active link
            navLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
            
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('show');
            }
        });
    });

    // Profile Button
    const profBtn = document.getElementById("adminProfileBtn");
    if (profBtn) {
        profBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                const res = await fetch(`${API}/auth/me`, {
                    headers: { Authorization: "Bearer " + token }
                });
                const user = await res.json();

                document.getElementById("admin-prof-id").textContent = user._id;
                document.getElementById("admin-name-input").value = user.name;
                document.getElementById("admin-email-input").value = user.email;
                document.getElementById("admin-bio-input").value = user.bio || "";
                document.getElementById("admin-password-input").value = "";
                
                let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0d6efd&color=fff&size=100`;
                if (user.profilePhoto) {
                    avatarUrl = user.profilePhoto.startsWith('http') ? user.profilePhoto : `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${user.profilePhoto}`;
                }
                document.getElementById("admin-prof-img").src = avatarUrl;

                new bootstrap.Modal(document.getElementById("adminProfileModal")).show();
            } catch (err) {
                console.error(err);
                alert("Failed to load profile");
            }
        });
    }

    const adminProfileForm = document.getElementById("admin-profile-form");
    if (adminProfileForm) {
        // Image preview
        const photoInput = document.getElementById("admin-photo-input");
        const profileDisplayImg = document.getElementById("admin-prof-img");
        if (photoInput && profileDisplayImg) {
            photoInput.addEventListener("change", function() {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        profileDisplayImg.src = e.target.result;
                    };
                    reader.readAsDataURL(this.files[0]);
                }
            });
        }

        adminProfileForm.addEventListener("submit", async e => {
            e.preventDefault();
            const formData = new FormData();
            formData.append("name", document.getElementById("admin-name-input").value);
            formData.append("email", document.getElementById("admin-email-input").value);
            formData.append("bio", document.getElementById("admin-bio-input").value);
            
            if (photoInput && photoInput.files[0]) {
                formData.append("profilePhoto", photoInput.files[0]);
            }

            const pass = document.getElementById("admin-password-input").value;
            if (pass) formData.append("password", pass);

            try {
                const res = await fetch(`${API}/auth/profile`, {
                    method: "PUT",
                    headers: {
                        Authorization: "Bearer " + token
                    },
                    body: formData
                });

                if (res.ok) {
                    const data = await res.json();
                    alert("Profile updated successfully");
                    sessionStorage.setItem("userName", data.user.name);
                    if (data.user.profilePhoto) {
                        sessionStorage.setItem("adminPhoto", data.user.profilePhoto);
                        sessionStorage.setItem("profilePhoto", data.user.profilePhoto);
                    }
                    updateProfileInfo();
                    bootstrap.Modal.getInstance(document.getElementById("adminProfileModal")).hide();
                } else {
                    const error = await res.json();
                    alert(error.message || "Update failed");
                }
            } catch (err) {
                console.error(err);
                alert("Update failed");
            }
        });
    }

    // Settings Button
    const settBtn = document.getElementById("adminSettingsBtn");
    if (settBtn) {
        settBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const modal = new bootstrap.Modal(document.getElementById("adminSettingsModal"));
            modal.show();
        });
    }
}

window.switchSection = function(sectionId) {
    const sections = [
        "dashboard-section",
        "complaints-section",
        "officers-section",
        "tasks-section",
        "analytics-section",
        "departments-section",
        "reports-section",
        "settings-section",
        "feedbacks-section"
    ];

    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("d-none");
    });

    const target = document.getElementById(sectionId + "-section");
    if (target) {
        target.classList.remove("d-none");
        if (sectionId === "feedbacks") loadFeedbacks();
        if (sectionId === "tasks") loadTasks();
        if (sectionId === "settings") loadSettings();
    }
    
    // Refresh data if needed when switching to specific sections
    if (sectionId === 'analytics') renderAnalytics();
    if (sectionId === 'departments') renderDepartments();
};

/* =========================
   LOAD DATA FROM BACKEND
========================= */

async function loadDashboardData() {
    try {
        const [complaintsRes, officersRes, deptsRes] = await Promise.all([
            fetch(`${API}/complaints`, { headers: { Authorization: "Bearer " + token } }),
            fetch(`${API}/admin/officers`, { headers: { Authorization: "Bearer " + token } }),
            fetch(`${API}/departments`, { headers: { Authorization: "Bearer " + token } })
        ]);

        if (!complaintsRes.ok || !officersRes.ok) throw new Error("Failed to fetch data");

        const complaintsJson = await complaintsRes.json();
        const officersJson = await officersRes.json();
        
        complaintsData = complaintsJson.complaints || complaintsJson;
        officersData = officersJson.officers || officersJson;
        
        if (deptsRes.ok) {
            departmentsData = await deptsRes.json();
        } else {
            // Fallback: extract from officers
            const uniqueDepts = [...new Set(officersData.map(o => o.department).filter(Boolean))];
            departmentsData = uniqueDepts.map(name => ({ name }));
        }

        renderComplaints();
        renderOfficers();
        updateStatsFromServer(); // Use backend stats for accuracy
        renderRecentActivity();
        populateDepartmentFilters();
        renderDepartments();
        populateTasksOfficers();
        populateTaskDepartments();

    } catch (err) {
        console.error("Dashboard load error:", err);
    }
}

async function updateStatsFromServer() {
    try {
        const res = await fetch(`${API}/admin/stats`, {
            headers: { Authorization: "Bearer " + token }
        });
        if (!res.ok) return updateStats(); // Fallback to local
        
        const stats = await res.json();
        
        const totalEl = document.getElementById("total-complaints");
        const pendingEl = document.getElementById("pending-complaints");
        const assignedEl = document.getElementById("assigned-complaints");
        const unassignedEl = document.getElementById("unassigned-complaints");

        if (totalEl) totalEl.textContent = stats.totalComplaints;
        if (pendingEl) pendingEl.textContent = stats.submitted;
        if (assignedEl) assignedEl.textContent = stats.assigned + stats.inProgress + stats.resolved;
        if (unassignedEl) unassignedEl.textContent = stats.submitted; // Or more specific if needed
        
        // Update greeting subtitle with count
        const subtitle = document.getElementById("greeting-subtitle");
        if (subtitle) subtitle.textContent = `There are ${stats.submitted} pending complaints that need your attention.`;

    } catch (err) {
        console.error("Stats fetch error:", err);
        updateStats();
    }
}

/* =========================
   RENDER TABLES
========================= */

function renderComplaints(filteredData = null) {
    const data = filteredData || complaintsData;
    const tbody = document.getElementById("complaints-table-body");
    if (!tbody) return;

    let html = "";
    if (data.length === 0) {
        html = '<tr><td colspan="9" class="text-center py-4">No complaints found.</td></tr>';
    } else {
        data.forEach(c => {
            let badge = "bg-secondary";
            if (c.status === "Submitted") badge = "bg-warning text-dark";
            if (c.status === "Assigned") badge = "bg-info";
            if (c.status === "In Progress") badge = "bg-primary";
            if (c.status === "Resolved") badge = "bg-success";

            const reporterName = c.citizenName || c.user?.name || "Citizen";
            const officerName = c.assignedOfficer?.name || '<span class="text-danger small">Unassigned</span>';

            html += `
            <tr>
                <td><small class="text-muted fw-bold">${c.complaintId || c._id.substring(0,8).toUpperCase()}</small></td>
                <td><strong>${reporterName}</strong></td>
                <td>
                    <div class="fw-medium">${c.title}</div>
                    <div class="small text-muted text-truncate" style="max-width: 200px;">${c.description}</div>
                </td>
                <td><span class="badge bg-light text-dark border">${c.category || "-"}</span></td>
                <td><span class="badge bg-light text-dark border">${c.priority || "Medium"}</span></td>
                <td><span class="badge ${badge}">${c.status}</span></td>
                <td>${officerName}</td>
                <td><small>${new Date(c.createdAt).toLocaleDateString()}</small></td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary view-details-btn" data-id="${c._id}" title="View Details">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary assign-btn" 
                                data-id="${c._id}" 
                                data-dept="${c.category}" title="Assign Officer">
                            <i class="bi bi-person-plus"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        });
    }

    tbody.innerHTML = html;
    attachComplaintEvents();
}

function renderRecentActivity() {
    const tbody = document.getElementById("recent-complaints-mini");
    if (!tbody) return;

    const recent = complaintsData.slice(0, 5);
    let html = "";

    recent.forEach(c => {
        let badge = "bg-secondary";
        if (c.status === "Submitted") badge = "bg-warning text-dark";
        if (c.status === "Assigned") badge = "bg-info";
        if (c.status === "In Progress") badge = "bg-primary";
        if (c.status === "Resolved") badge = "bg-success";

        html += `
        <tr>
            <td><small class="fw-bold">${c.complaintId || c._id.substring(0,6).toUpperCase()}</small></td>
            <td><div class="text-truncate" style="max-width: 150px;">${c.title}</div></td>
            <td><span class="badge ${badge} smaller">${c.status}</span></td>
            <td><small>${new Date(c.createdAt).toLocaleDateString()}</small></td>
        </tr>
        `;
    });

    tbody.innerHTML = html;
}

function renderOfficers() {
    const tbody = document.getElementById("officers-table-body");
    if (!tbody) return;

    let html = "";
    officersData.forEach(o => {
        html += `
        <tr>
            <td><span class="badge bg-light text-dark border">${o.staffId || "-"}</span></td>
            <td>
                <div class="d-flex align-items-center">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(o.name)}&background=random" class="rounded-circle me-2" width="24" height="24">
                    <span>${o.name}</span>
                </div>
            </td>
            <td><span class="badge bg-success">Active</span></td>
            <td>${o.department || "-"}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-warning" onclick="openLegalNoticeModal('${o._id}', '${o.name}')" title="Send Legal Notice">
                        <i class="bi bi-envelope-paper"></i> Notice
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="terminateOfficer('${o._id}', '${o.name}')" title="Terminate Officer">
                        <i class="bi bi-person-x-fill"></i> Terminate
                    </button>
                </div>
            </td>
        </tr>
        `;
    });

    tbody.innerHTML = html;
}

window.openLegalNoticeModal = function(id, name) {
    document.getElementById("notice-officer-id").value = id;
    document.getElementById("notice-officer-name").textContent = name;
    document.getElementById("notice-title").value = "Official Legal Notice regarding Inquiry";
    document.getElementById("notice-content").value = `Dear ${name},\n\nThis serves as an official notice regarding administrative review of your service. Please respond to the undersigned regarding the pending inquiries.\n\nRegards,\nAdmin Office`;
    
    new bootstrap.Modal(document.getElementById("legalNoticeModal")).show();
};

const legalNoticeForm = document.getElementById("legal-notice-form");
if (legalNoticeForm) {
    legalNoticeForm.addEventListener("submit", async e => {
        e.preventDefault();
        const officerId = document.getElementById("notice-officer-id").value;
        const title = document.getElementById("notice-title").value;
        const content = document.getElementById("notice-content").value;

        try {
            const res = await fetch(`${API}/legal-notices`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token 
                },
                body: JSON.stringify({ officerId, title, content })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message || "Failed to send notice");

            alert(`Official Notice successfully dispatched to officer.`);
            bootstrap.Modal.getInstance(document.getElementById("legalNoticeModal")).hide();
        } catch(err) {
            alert(err.message || "Failed to send notice.");
        }
    });
}

/* =========================
   STATS & ANALYTICS
========================= */

function updateStats() {
    const total = complaintsData.length;
    const pending = complaintsData.filter(c => c.status === "Pending" || c.status === "Submitted").length;
    const assigned = complaintsData.filter(c => c.status === "Assigned" || c.status === "In Progress" || c.status === "Resolved").length;
    let unassigned = 0;
    complaintsData.forEach(c => {
        if (!c.assignedOfficer || c.assignedOfficer === null || c.assignedOfficer === undefined || c.status === "Submitted" || c.status === "Pending") {
            unassigned++;
        }
    });

    // Correct IDs based on Admin HTML
    const totalEl = document.getElementById("total-complaints");
    const pendingEl = document.getElementById("pending-complaints");
    const assignedEl = document.getElementById("assigned-complaints");
    const unassignedEl = document.getElementById("unassigned-complaints");

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (assignedEl) assignedEl.textContent = assigned;
    if (unassignedEl) unassignedEl.textContent = unassigned;
}

function renderAnalytics() {
    const ctxDept = document.getElementById('detailedDeptChart');
    if (ctxDept) {
        
        // Remove existing chart instance if we are re-rendering
        if (window.detailedDeptChartInstance) {
            window.detailedDeptChartInstance.destroy();
        }
        
        const deptCounts = {};
        // Initialize dynamic departments with 0
        departmentsData.forEach(d => { deptCounts[d.name || d] = 0; });
        
        complaintsData.forEach(c => {
            if(deptCounts[c.category] !== undefined) {
                deptCounts[c.category]++;
            } else {
                deptCounts[c.category] = 1;
            }
        });

        window.detailedDeptChartInstance = new Chart(ctxDept, {
            type: 'bar',
            data: {
                labels: Object.keys(deptCounts),
                datasets: [{
                    label: '# of Complaints',
                    data: Object.values(deptCounts),
                    backgroundColor: 'rgba(13, 110, 253, 0.5)',
                    borderColor: '#0d6efd',
                    borderWidth: 1
                }]
            }
        });
    }

    const ctxStatus = document.getElementById('detailedStatusChart');
    if (ctxStatus) {
        if (window.detailedStatusChartInstance) {
            window.detailedStatusChartInstance.destroy();
        }
        const statusCounts = {
            'Submitted': 0,
            'Assigned': 0,
            'In Progress': 0,
            'Resolved': 0
        };
        complaintsData.forEach(c => {
            if (statusCounts.hasOwnProperty(c.status)) {
                statusCounts[c.status]++;
            }
        });

        window.detailedStatusChartInstance = new Chart(ctxStatus, {
            type: 'pie',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#ffc107', '#0dcaf0', '#0d6efd', '#198754']
                }]
            }
        });
    }

    const ctxTrend = document.getElementById('detailedTrendChart');
    if (ctxTrend) {
        if (window.detailedTrendChartInstance) window.detailedTrendChartInstance.destroy();
        
        const trendData = {};
        complaintsData.forEach(c => {
            const month = new Date(c.createdAt).toLocaleString('default', { month: 'short' });
            trendData[month] = (trendData[month] || 0) + 1;
        });

        window.detailedTrendChartInstance = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: Object.keys(trendData),
                datasets: [{
                    label: 'Complaints Trend',
                    data: Object.values(trendData),
                    borderColor: '#0d6efd',
                    tension: 0.3,
                    fill: true,
                    backgroundColor: 'rgba(13, 110, 253, 0.1)'
                }]
            }
        });
    }

    const ctxRes = document.getElementById('deptResolutionChart');
    if (ctxRes) {
        if (window.deptResolutionChartInstance) window.deptResolutionChartInstance.destroy();
        
        const deptResData = {};
        // Ensure all dynamic departments are initialized
        departmentsData.forEach(d => { deptResData[d.name || d] = { total: 0, resolved: 0 }; });
        complaintsData.forEach(c => {
            const cat = c.category;
            if (!deptResData[cat]) deptResData[cat] = { total: 0, resolved: 0 };
            deptResData[cat].total++;
            if (c.status === 'Resolved' || c.status === 'Closed') deptResData[cat].resolved++;
        });

        window.deptResolutionChartInstance = new Chart(ctxRes, {
            type: 'bar',
            data: {
                labels: Object.keys(deptResData),
                datasets: [{
                    label: 'Resolution Rate (%)',
                    data: Object.keys(deptResData).map(k => deptResData[k].total > 0 ? (deptResData[k].resolved / deptResData[k].total * 100).toFixed(1) : 0),
                    backgroundColor: '#198754'
                }]
            },
            options: {
                scales: { y: { beginAtZero: true, max: 100 } }
            }
        });
    }
}

function renderDepartments() {
    const grid = document.getElementById("departments-grid");
    if (!grid) return;

    // Fixed default icons for common departments
    const iconMap = {
        "Roads & Infrastructure": "bi-hammer",
        "Water Supply": "bi-droplet-fill",
        "Electricity Issue": "bi-lightning-charge-fill",
        "Garbage Issue": "bi-trash3-fill",
        "Cyber Crime": "bi-shield-lock-fill",
        "Law & Order": "bi-shield-shaded",
        "Public Safety": "bi-people-fill",
        "Land & Revenue": "bi-map-fill",
        "General Administration": "bi-gear-wide-connected"
    };

    let html = `
        <div class="col-md-4 mb-4">
            <div class="card h-100 department-card shadow-sm border-0 border-primary border-2 border-dashed d-flex align-items-center justify-content-center py-5" onclick="openAddDeptPrompt()" style="cursor: pointer; background: rgba(13, 110, 253, 0.05);">
                <div class="text-center">
                    <i class="bi bi-plus-circle fs-1 text-primary"></i>
                    <h5 class="fw-bold mt-2 text-primary">Add Department</h5>
                </div>
            </div>
        </div>
    `;
    
    departmentsData.forEach((d) => {
        const name = d.name || d;
        const count = officersData.filter(o => o.department === name).length;
        const icon = d.icon || iconMap[name] || "bi-building";
        const desc = d.description || "Manage settings and officers for this category.";

        html += `
        <div class="col-md-4 mb-4">
            <div class="card h-100 department-card shadow-sm border-0" onclick="viewOfficers('${name}')" style="cursor: pointer;">
                <div class="card-body">
                    <div class="dept-icon-circle">
                        <i class="bi ${icon}"></i>
                    </div>
                    <h5 class="fw-bold mb-2">${name}</h5>
                    <p class="text-muted small mb-3">${desc}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-primary bg-opacity-10 text-primary border-0">
                            <i class="bi bi-people me-1"></i> ${count} Officers
                        </span>
                        <i class="bi bi-chevron-right text-muted"></i>
                    </div>
                </div>
            </div>
        </div>
        `;
    });
    grid.innerHTML = html;
}

window.openAddDeptPrompt = async function() {
    const name = prompt("Enter Department Name:");
    if (!name) return;
    
    try {
        const res = await fetch(`${API}/departments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify({ name })
        });
        if (res.ok) {
            alert("Department added successfully");
            loadDashboardData();
        }
    } catch (err) {
        console.error(err);
    }
};

window.viewOfficers = function(deptName) {
    const officers = officersData.filter(o => o.department === deptName);
    const tbody = document.getElementById("dept-officers-body");
    const tit = document.getElementById("dept-officers-title");
    if(tit) tit.textContent = `${deptName} - Officers List`;
    
    let html = "";
    if (officers.length === 0) {
        html = '<tr><td colspan="4" class="text-center py-5"><i class="bi bi-people fs-1 d-block text-muted mb-2"></i>No officers assigned to this department.</td></tr>';
    } else {
        officers.forEach(o => {
            html += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(o.name)}&background=random" class="rounded-circle me-3" width="32" height="32">
                        <div>
                            <div class="fw-bold">${o.name}</div>
                            <div class="text-muted small">${o.email}</div>
                        </div>
                    </div>
                </td>
                <td><span class="badge bg-light text-dark border fw-bold">${o.staffId || 'N/A'}</span></td>
                <td>
                    <div class="small fw-medium"><i class="bi bi-telephone-outbound me-1"></i> ${o.contactNumber || 'No Contact'}</div>
                </td>
                <td><span class="badge bg-success-subtle text-success border-success border-opacity-25">Operational</span></td>
            </tr>
            `;
        });
    }
    if(tbody) tbody.innerHTML = html;
    const modalEl = document.getElementById("deptOfficersModal");
    if(modalEl) new bootstrap.Modal(modalEl).show();
}

/* =========================
   TASKS MODULE
========================= */
/* =========================
   TASKS MODULE
========================= */
function populateTaskDepartments() {
    const taskDeptSelect = document.getElementById("task-dept");
    if (taskDeptSelect) {
        taskDeptSelect.innerHTML = '<option value="">Select Department...</option>';
        departmentsData.forEach(d => {
            const name = d.name || d;
            taskDeptSelect.innerHTML += `<option value="${name}">${name}</option>`;
        });
    }
}

function populateTasksOfficers() {
    const taskAssigneeSelect = document.getElementById("task-assignee-select");
    if(taskAssigneeSelect) {
        taskAssigneeSelect.innerHTML = '<option value="">Select Officer...</option>';
        officersData.forEach(o => {
            taskAssigneeSelect.innerHTML += `<option value="${o._id}">${o.name} (${o.department})</option>`;
        });
    }
}

async function loadTasks() {
    const list = document.getElementById("tasks-list");
    if(!list) return;

    try {
        const res = await fetch(`${API}/tasks`, { headers: { Authorization: "Bearer " + token } });
        const tasks = await res.json();
        
        if (tasks.length === 0) {
            list.innerHTML = '<div class="text-center py-4 text-muted">No pending tasks.</div>';
            return;
        }

        let html = "";
        tasks.forEach(t => {
            const badgeClass = t.priority === 'High' || t.priority === 'Urgent' ? 'bg-danger' : 'bg-primary';
            const statusBadge = t.status === 'Completed' ? 'bg-success' : 'bg-warning text-dark';
            html += `
            <div class="p-3 border rounded mb-2 d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1 fw-bold">${t.title}</h6>
                    <div class="small text-muted mb-1">${t.description || ''}</div>
                    <span class="badge ${badgeClass} smaller me-1">${t.priority}</span>
                    <span class="badge bg-light text-dark border smaller font-monospace">${t.officer?.name || 'Unknown'}</span>
                    <span class="badge ${statusBadge} smaller ms-1">${t.status}</span>
                </div>
                <div>
                    ${t.status === 'Pending' ? `<button class="btn btn-sm btn-outline-success" onclick="updateTaskStatus('${t._id}', 'Completed')">Complete</button>` : ''}
                </div>
            </div>`;
        });
        list.innerHTML = html;
    } catch (err) {
        console.error(err);
    }
}

window.updateTaskStatus = async function(id, status) {
    try {
        await fetch(`${API}/tasks/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
            body: JSON.stringify({ status })
        });
        loadTasks();
    } catch (err) {
        console.error(err);
    }
};

const taskForm = document.getElementById("task-form");
if (taskForm) {
    taskForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
            title: document.getElementById("task-title").value,
            description: document.getElementById("task-desc").value,
            department: document.getElementById("task-dept").value,
            officer: document.getElementById("task-assignee-select").value,
            priority: document.getElementById("task-priority").value,
            dueDate: document.getElementById("task-due").value
        };

        try {
            const res = await fetch(`${API}/tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Task created successfully!");
                taskForm.reset();
                loadTasks();
            } else {
                const data = await res.json();
                alert(data.message || "Failed to create task");
            }
        } catch (err) {
            console.error(err);
            alert("Error creating task");
        }
    });
}

// Reports buttons action
document.querySelectorAll('#reports-section .btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const text = btn.textContent.trim();
        if (text.includes("Export CSV") || text.includes("Download CSV")) {
            // Use fetch + blob so auth header is sent properly
            try {
                btn.disabled = true;
                btn.textContent = "Downloading...";
                const res = await fetch(`${API}/reports/export-csv`, {
                    headers: { Authorization: "Bearer " + token }
                });
                if (!res.ok) throw new Error("Failed to generate report");
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'complaints_report.csv';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            } catch(err) {
                alert("Failed to download report: " + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = text;
            }
        } else if (text.includes("Download PDF") || text.includes("View Online") || text.includes("Summary")) {
            alert("PDF reports are not yet implemented. Use CSV Export instead.");
        }
    });
});

/* =========================
   SETTINGS MODULE
========================= */

async function loadSettings() {
    try {
        const res = await fetch(`${API}/settings`, { headers: { Authorization: "Bearer " + token } });
        if (!res.ok) return;
        const settings = await res.json();
        
        // Populate settings form if open
        const sysName = document.querySelector('#settings-section input[type="text"]');
        const sysEmail = document.querySelector('#settings-section input[type="email"]');
        if (sysName && settings.systemName) sysName.value = settings.systemName;
        if (sysEmail && settings.adminEmail) sysEmail.value = settings.adminEmail;
        
    } catch (err) {
        console.error(err);
    }
}

const settingsSaveBtn = document.querySelector('#settings-section .btn-primary');
if (settingsSaveBtn) {
    settingsSaveBtn.onclick = async () => {
        const systemName = document.querySelector('#settings-section input[type="text"]').value;
        const adminEmail = document.querySelector('#settings-section input[type="email"]').value;
        const highPriorityEmail = document.querySelectorAll('#settings-section .form-switch input')[0].checked;
        const weeklyReports = document.querySelectorAll('#settings-section .form-switch input')[1].checked;

        try {
            const res = await fetch(`${API}/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify({ systemName, adminEmail, highPriorityEmail, weeklyReports })
            });

            if (res.ok) {
                alert("Settings saved successfully!");
            }
        } catch (err) {
            console.error(err);
        }
    };
}

/* =========================
   EVENTS & ACTIONS
========================= */

function attachComplaintEvents() {
    document.querySelectorAll(".assign-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openAssignModal(btn.dataset.id, btn.dataset.dept);
        });
    });

    document.querySelectorAll(".view-details-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openViewDetailsModal(btn.dataset.id);
        });
    });
}

function openAssignModal(id, dept) {
    const select = document.getElementById("assign-officer");
    if (!select) return;

    select.innerHTML = '<option value="">Select Officer...</option>';
    
    // Show officers from matching department first
    const sortedOfficers = [...officersData].sort((a, b) => {
        if (a.department === dept && b.department !== dept) return -1;
        if (a.department !== dept && b.department === dept) return 1;
        return 0;
    });

    sortedOfficers.forEach(o => {
        select.innerHTML += `<option value="${o._id}">${o.name} (${o.department || 'No Dept'})</option>`;
    });

    document.getElementById("assign-complaint-id").value = id;
    const modal = new bootstrap.Modal(document.getElementById("assignModal"));
    modal.show();
}

function openViewDetailsModal(id) {
    const complaint = complaintsData.find(c => c._id === id);
    if (!complaint) return;

    // Create or get view details modal
    let modalEl = document.getElementById("viewDetailsAdminModal");
    if (!modalEl) {
        modalEl = document.createElement("div");
        modalEl.id = "viewDetailsAdminModal";
        modalEl.className = "modal fade";
        modalEl.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">Complaint & Reporter Details</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="admin-view-details-content"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modalEl);
    }

    const content = document.getElementById("admin-view-details-content");
    const imgVal = complaint.image;
    const imageUrl = imgVal ? (imgVal.startsWith('http') ? imgVal : `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${imgVal}`) : null;

    content.innerHTML = `
        <div class="row g-4">
            <div class="col-md-6">
                <h6 class="fw-bold text-muted small text-uppercase">Reporter Details (Citizen)</h6>
                <div class="p-3 bg-light rounded mb-4">
                    <p class="mb-1"><strong>Full Name:</strong> ${complaint.user?.name || 'Anonymous'}</p>
                    <p class="mb-1"><strong>Email:</strong> ${complaint.user?.email || 'N/A'}</p>
                    <p class="mb-0"><strong>Role:</strong> Citizen</p>
                </div>

                <h6 class="fw-bold text-muted small text-uppercase">Case Information</h6>
                <div class="p-3 bg-light rounded">
                    <p class="mb-1"><strong>Complaint ID:</strong> ${complaint.complaintId || id}</p>
                    <p class="mb-1"><strong>Department:</strong> ${complaint.category}</p>
                    <p class="mb-1"><strong>Status:</strong> <span class="badge bg-primary">${complaint.status}</span></p>
                    <p class="mb-1"><strong>Assigned Officer:</strong> ${complaint.assignedOfficer?.name || 'Not yet assigned'}</p>
                    <hr>
                    <p class="mb-1"><strong>Title:</strong> ${complaint.title}</p>
                    <p class="mb-0"><strong>Full Description:</strong> ${complaint.description}</p>
                </div>
            </div>
            <div class="col-md-6">
                <h6 class="fw-bold text-muted small text-uppercase">Evidence Image</h6>
                ${imageUrl ? 
                    `<img src="${imageUrl}" class="img-fluid rounded border w-100 shadow-sm" style="max-height: 400px; object-fit: contain;" onerror="this.src='https://placehold.co/600x400?text=Image+Not+Found'">` : 
                    `<div class="border rounded d-flex align-items-center justify-content-center bg-light text-muted" style="height: 200px;">
                        <div><i class="bi bi-image fs-1 d-block text-center"></i> No Evidence Provided</div>
                     </div>`
                }
                
                <h6 class="fw-bold text-muted small text-uppercase mt-4">Reported Location</h6>
                <p class="p-3 bg-light rounded"><i class="bi bi-geo-alt me-2"></i>${complaint.location || 'Not provided'}</p>
            </div>
        </div>

        ${complaint.status === 'Resolved' || complaint.status === 'Closed' ? `
        <div class="mt-4 border-top pt-4">
            <h5 class="fw-bold mb-3"><i class="bi bi-check-circle-fill text-success me-2"></i>Resolution & Feedback</h5>
            <div class="row g-4">
                <div class="col-md-6">
                    <h6 class="fw-bold text-muted small text-uppercase">Proof of Resolution</h6>
                    ${complaint.resolutionImage ? 
                        (() => {
                            const resImg = complaint.resolutionImage;
                            const resUrl = resImg.startsWith('http') ? resImg : `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${resImg}`;
                            return `<img src="${resUrl}" class="img-fluid rounded border w-100 shadow-sm" style="max-height: 250px; object-fit: contain;">`;
                        })() : 
                        `<div class="p-3 bg-light text-muted rounded text-center">No image uploaded for resolution.</div>`
                    }
                </div>
                <div class="col-md-6">
                    <h6 class="fw-bold text-muted small text-uppercase">Citizen Feedback & Rating</h6>
                    <div class="p-3 border rounded">
                        <div class="mb-2">
                            <span class="fw-bold me-2">Rating:</span>
                            ${complaint.rating ? 
                                `<span class="text-warning">
                                    ${Array(5).fill(0).map((_, i) => `<i class="bi bi-star${i < complaint.rating ? '-fill' : ''}"></i>`).join('')}
                                </span>` : 
                                '<span class="text-muted">Not yet rated</span>'
                            }
                        </div>
                        <p class="mb-0 italic text-muted">${complaint.feedback || "No feedback provided by the citizen."}</p>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}
    `;

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

/* =========================
   FILTERS
========================= */

function setupFilters() {
    const searchBox = document.getElementById("search-box");
    const statusFilter = document.getElementById("status-filter");
    const priorityFilter = document.getElementById("priority-filter");

    const runFilters = () => {
        const search = searchBox.value.toLowerCase();
        const status = statusFilter.value;
        const priority = priorityFilter.value;

        const filtered = complaintsData.filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(search) || 
                                 c.description.toLowerCase().includes(search) ||
                                 (c.complaintId && c.complaintId.toLowerCase().includes(search));
            const matchesStatus = status === "All" || c.status === status;
            const matchesPriority = priority === "All" || c.priority === priority;
            
            return matchesSearch && matchesStatus && matchesPriority;
        });

        renderComplaints(filtered);
    };

    if (searchBox) searchBox.addEventListener("input", runFilters);
    if (statusFilter) statusFilter.addEventListener("change", runFilters);
    if (priorityFilter) priorityFilter.addEventListener("change", runFilters);
}

function populateDepartmentFilters() {
    const deptSelector = document.getElementById("dept-selector");
    if (!deptSelector) return;

    deptSelector.innerHTML = '<li><a class="dropdown-item" href="#" onclick="filterByDept(\'All\')">All Departments</a></li>';
    departmentsData.forEach(dept => {
        const name = dept.name || dept;
        deptSelector.innerHTML += `<li><a class="dropdown-item" href="#" onclick="filterByDept('${name}')">${name}</a></li>`;
    });
    
    // Also populate the add-officer department dropdown
    const offDeptSelect = document.getElementById("off-dept");
    if (offDeptSelect) {
        offDeptSelect.innerHTML = '<option value="">Select Department...</option>';
        departmentsData.forEach(dept => {
            const name = dept.name || dept;
            offDeptSelect.innerHTML += `<option value="${name}">${name}</option>`;
        });
    }
}

window.filterByDept = function(dept) {
    const display = document.getElementById("current-dept-display");
    if (display) display.textContent = dept === 'All' ? 'All Departments' : dept;

    if (dept === 'All') {
        renderComplaints(complaintsData);
    } else {
        const filtered = complaintsData.filter(c => c.category === dept);
        renderComplaints(filtered);
    }
    switchSection('complaints');
};

/* =========================
   API HANDLERS
========================= */

const assignForm = document.getElementById("assign-form");
if (assignForm) {
    assignForm.addEventListener("submit", async e => {
        e.preventDefault();
        const complaintId = document.getElementById("assign-complaint-id").value;
        const officerId = document.getElementById("assign-officer").value;

        try {
            const response = await fetch(`${API}/complaints/${complaintId}/assign`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token
                },
                body: JSON.stringify({ officerId })
            });

            if (!response.ok) throw new Error("Assignment failed");

            bootstrap.Modal.getInstance(document.getElementById("assignModal")).hide();
            alert("Officer assigned successfully");
            loadDashboardData();
        } catch (err) {
            console.error(err);
            alert("Assignment failed");
        }
    });
}

const addOfficerForm = document.getElementById("add-officer-form");
if (addOfficerForm) {
    addOfficerForm.addEventListener("submit", async e => {
        e.preventDefault();
        const payload = {
            name: document.getElementById("off-name").value,
            email: document.getElementById("off-email").value,
            staffId: document.getElementById("off-staffId").value,
            department: document.getElementById("off-dept").value,
            password: document.getElementById("off-password").value,
            role: "officer"
        };

        try {
            const response = await fetch(`${API}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Failed to create officer");

            bootstrap.Modal.getInstance(document.getElementById("addOfficerModal")).hide();
            alert("Officer account created successfully");
            addOfficerForm.reset();
            loadDashboardData();
        } catch (err) {
            console.error(err);
            alert("Creation failed");
        }
    });
}

window.terminateOfficer = function(id, name) {
    document.getElementById("terminate-off-name").textContent = name;
    document.getElementById("res-target-name").textContent = name;
    document.getElementById("confirm-termination").checked = false;
    document.getElementById("confirm-terminate-btn").classList.add("disabled");
    
    // Store officer info for the legal notice button inside the modal
    const noticeIdEl = document.getElementById("notice-officer-id");
    if (noticeIdEl) noticeIdEl.value = id;
    const sendNoticeBtn = document.getElementById("send-legal-notice-btn");
    if (sendNoticeBtn) sendNoticeBtn.classList.add("disabled");

    const modal = new bootstrap.Modal(document.getElementById("terminationModal"));
    modal.show();

    document.getElementById("confirm-termination").onchange = function() {
        if(this.checked) {
            document.getElementById("confirm-terminate-btn").classList.remove("disabled");
            document.getElementById("send-legal-notice-btn").classList.remove("disabled");
        } else {
            document.getElementById("confirm-terminate-btn").classList.add("disabled");
            document.getElementById("send-legal-notice-btn").classList.add("disabled");
        }
    };

    document.getElementById("confirm-terminate-btn").onclick = async function() {
        try {
            const res = await fetch(`${API}/admin/users/${id}`, {
                method: "DELETE",
                headers: { Authorization: "Bearer " + token }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Termination failed");
            
            alert(`Notice Sent! Officer ${name} has been terminated.`);
            modal.hide();
            loadDashboardData();
        } catch (err) {
            alert(err.message || "Termination failed");
        }
    };
};

window.logout = function() {
    sessionStorage.removeItem("userName");
    window.location.href = "../index.html";
};

// =====================
// FORGOT PASSWORD FLOW
// =====================
function openForgotPassword() {
    // Hide profile modal if open
    const profileModal = bootstrap.Modal.getInstance(document.getElementById("adminProfileModal"));
    if (profileModal) profileModal.hide();
    
    document.getElementById("forgotPasswordModal").style.display = "flex";
    showForgotStep(1);
}

function closeForgotPassword() {
    document.getElementById("forgotPasswordModal").style.display = "none";
}

function showForgotStep(step) {
    document.getElementById("forgotStep1").style.display = step === 1 ? "block" : "none";
    document.getElementById("forgotStep2").style.display = step === 2 ? "block" : "none";
    document.getElementById("forgotStep3").style.display = step === 3 ? "block" : "none";
    
    if (step === 1) document.getElementById("forgotModalTitle").textContent = "Forgot Password";
    if (step === 2) document.getElementById("forgotModalTitle").textContent = "Verify OTP";
    if (step === 3) document.getElementById("forgotModalTitle").textContent = "Reset Password";
}

function sendOTP() {
    const selector = document.getElementById("forgotIdentifier").value.trim();
    if (!selector) {
        alert("Please enter email or mobile number");
        return;
    }
    alert("OTP sent to " + selector + " (Use 123456)");
    showForgotStep(2);
}

function verifyOTP() {
    const otp = document.getElementById("forgotOTP").value.trim();
    if (otp === "123456") {
        showForgotStep(3);
    } else {
        alert("Invalid OTP. Try 123456");
    }
}

async function resetPassword() {
    const newPwd = document.getElementById("newPassword").value.trim();
    const confirmPwd = document.getElementById("confirmNewPassword").value.trim();
    
    if (!newPwd || newPwd !== confirmPwd) {
        alert("Passwords do not match or are empty");
        return;
    }
    
    alert("Password reset successfully!");
    closeForgotPassword();
}

// Fix Sidebar Menu Toggle
const sidebarToggleBtn = document.getElementById("sidebar-toggle");
const sidebar = document.getElementById("sidebar");
const mainContent = document.getElementById("main-content");
if(sidebarToggleBtn && sidebar) {
    // Override whatever was attached previously to ensure toggling works reliably
    sidebarToggleBtn.onclick = function(e) {
        e.preventDefault();
        sidebar.classList.toggle("collapsed");
        if(mainContent) mainContent.classList.toggle("expanded");
    }
}

/* =========================
   FEEDBACKS
========================= */

async function loadFeedbacks() {
    const tbody = document.getElementById('feedbacks-table-body');
    if (!tbody) return;

    try {
        const response = await fetch(API + '/feedback/all', {
            headers: { Authorization: 'Bearer ' + token }
        });

        if (!response.ok) throw new Error('Failed to load feedbacks');

        const feedbacks = await response.json();
        let html = '';

        if (feedbacks.length === 0) {
            html = '<tr><td colspan="4" class="text-center py-4">No feedbacks found.</td></tr>';
        } else {
            feedbacks.forEach(f => {
                html += `
                <tr>
                    <td><strong>${f.name}</strong></td>
                    <td>${f.email}</td>
                    <td><div class="text-wrap" style="max-width: 400px;">${f.feedback}</div></td>
                    <td><small>${new Date(f.createdAt).toLocaleDateString()}</small></td>
                </tr>
                `;
            });
        }

        tbody.innerHTML = html;
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Failed to load feedbacks.</td></tr>';
    }
}
