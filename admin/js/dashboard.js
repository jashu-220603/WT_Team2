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
    loadSettings();
    setupAnnouncementForm();
    
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

    list.innerHTML = notifications.slice(0, 5).map(n => {
        const complaintId = n.relatedComplaint || (n.message.match(/ID: ([A-Z0-9]+)/) ? n.message.match(/ID: ([A-Z0-9]+)/)[1] : null);
        
        return `
        <div class="notification-item p-3 border-bottom ${n.isRead ? '' : 'bg-light'}" 
             onclick="handleNotificationClick('${n._id}', '${n.type}', '${complaintId}')" style="cursor: pointer;">
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
    `;}).join('');
}

async function handleNotificationClick(notifId, type, complaintId) {
    try {
        await markAsRead(notifId);
        
        if (complaintId) {
            // Find the full MongoDB ID if we only have the short readable ID
            let targetId = complaintId;
            const fullComplaint = complaintsData.find(c => (c.complaintId === complaintId || c._id === complaintId));
            if (fullComplaint) targetId = fullComplaint._id;
            
            switchSection('complaints');
            setTimeout(() => {
                openViewDetailsModal(targetId);
            }, 300);
        } else {
            // Default behavior or specific sections
            if (type === 'concern_raised') switchSection('complaints');
            else if (type === 'assignment') switchSection('officers');
        }
    } catch (err) {
        console.error("Error handling notification click:", err);
    }
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

    // Header & Profile Dropdown
    const headerName = document.getElementById("header-admin-name");
    if (headerName) headerName.textContent = storedName;
    
    const adminNameEls = document.querySelectorAll(".admin-name-display");
    adminNameEls.forEach(el => el.textContent = storedName);

    // Profile Image
    const headerImg = document.getElementById("header-profile-img");
    const adminProfImg = document.getElementById("admin-prof-img");
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
    
    if (headerImg) headerImg.src = avatarUrl;
    if (adminProfImg) adminProfImg.src = avatarUrl;
    
    document.querySelectorAll("img[alt='Profile']").forEach(img => img.src = avatarUrl);
}

function setupNavigation() {
    const navLinks = document.querySelectorAll(".nav-link[data-section]");
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const section = link.getAttribute("data-section");
            if (section === "settings") {
                switchSection('settings');
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
        "feedbacks-section",
        "concerns-section",
        "legal-notices-section",
        "announcements-section"
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
        if (sectionId === "announcements") loadAnnouncements();
        if (sectionId === "concerns") loadConcerns();
        if (sectionId === "legal-notices") loadLegalNotices();
    }
    
    // Refresh data if needed when switching to specific sections
    if (sectionId === 'analytics') renderAnalytics();
    if (sectionId === 'departments') renderDepartments();
    
    // Update Sidebar active state
    const navLinks = document.querySelectorAll(".nav-link[data-section]");
    navLinks.forEach(link => {
        if (link.getAttribute("data-section") === sectionId) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
};

/* =========================
   LOAD DATA FROM BACKEND
========================= */
let concernsData = [];
let legalNoticesData = [];

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
            
            // Check if default departments exist, if not, create them (client-side initialization for first run)
            const defaults = ["Police", "Water Supply", "Electricity", "Sanitation", "Roads & Transport"];
            const existingNames = departmentsData.map(d => d.name || d);
            
            for (const name of defaults) {
                if (!existingNames.includes(name)) {
                    // Just add to local list for now, user can persist them by using the 'Add Department' flow or we can auto-POST
                    departmentsData.push({ name, description: `Official ${name} Department` });
                }
            }
        } else {
            // Fallback: extract from officers
            const uniqueDepts = [...new Set(officersData.map(o => o.department).filter(Boolean))];
            departmentsData = uniqueDepts.map(name => ({ name }));
        }

        renderDepartments();
        populateTasksOfficers();
        populateTaskDepartments();

        // Load new sections
        loadConcerns();
        loadLegalNotices();
        populateLNOfficers(); // For the manual notice modal

        // Final UI Initialization
        initializeUI();

    } catch (err) {
        console.error("Dashboard load error:", err);
    }
}

function initializeUI() {
    updateStatsFromServer(); 
    renderComplaints();
    renderOfficers();
    renderRecentActivity();
    populateDepartmentFilters();
    populateOfficersFilter();
    setupFilters();
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
        const resolvedEl = document.getElementById("resolved-complaints");

        if (totalEl) totalEl.textContent = stats.totalComplaints;
        if (pendingEl) pendingEl.textContent = stats.submitted;
        if (assignedEl) assignedEl.textContent = stats.assigned + stats.inProgress;
        if (resolvedEl) resolvedEl.textContent = stats.resolved;
        
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
                    <div class="fw-medium">${c.title || c.category}</div>
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
                        <button class="btn btn-sm btn-outline-info" onclick="viewConcerns('${c._id}')" title="View Concerns">
                            <i class="bi bi-exclamation-octagon"></i>
                        </button>
                        ${c.assignedOfficer 
                            ? `<button class="btn btn-sm btn-outline-warning" onclick="openReassignModal('${c._id}')" title="Reassign Officer">
                                <i class="bi bi-person-gear"></i>
                               </button>`
                            : `<button class="btn btn-sm btn-primary assign-btn" 
                                data-id="${c._id}" 
                                data-dept="${c.category}" title="Assign Officer">
                                <i class="bi bi-person-plus"></i>
                               </button>`
                        }
                    </div>
                </td>
            </tr>
            `;
        });
    }

    tbody.innerHTML = html;
    attachComplaintEvents();
}

function renderRecentActivity(data = complaintsData) {
    const tbody = document.getElementById("recent-complaints-mini");
    if (!tbody) return;

    const recent = data.slice(0, 4);
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

function renderOfficers(data = officersData) {
    const tbody = document.getElementById("officers-table-body");
    if (!tbody) return;

    let html = "";
    data.forEach(o => {
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
            <td><span class="badge bg-secondary">${o.officerLevel || "Senior"}</span></td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-warning" onclick="openLegalNoticeModal('${o._id}', '${o.name}')" title="Send Legal Notice">
                        <i class="bi bi-envelope-paper"></i> Notice
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="promoteOfficer('${o._id}', '${o.name}')" title="Promote to Dept Head">
                        <i class="bi bi-arrow-up-circle"></i> Promote to Head
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

function updateStats(data = complaintsData) {
    const total = data.length;
    const pending = data.filter(c => c.status === "Submitted" || c.status === "Pending").length;
    const assigned = data.filter(c => c.status === "Assigned" || c.status === "In Progress").length;
    const resolved = data.filter(c => c.status === "Resolved" || c.status === "Closed").length;

    // Correct IDs based on Admin HTML
    const totalEl = document.getElementById("total-complaints");
    const pendingEl = document.getElementById("pending-complaints");
    const assignedEl = document.getElementById("assigned-complaints");
    const resolvedEl = document.getElementById("resolved-complaints");

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (assignedEl) assignedEl.textContent = assigned;
    if (resolvedEl) resolvedEl.textContent = resolved;
}

window.filterAndSwitch = function(status) {
    switchSection('complaints');
    setTimeout(() => {
        const statusFilter = document.getElementById("status-filter");
        if (statusFilter) {
            statusFilter.value = status === 'All' ? 'All' : status;
            statusFilter.dispatchEvent(new Event('change'));
        }
    }, 100);
};

function renderAnalytics(filterDept = 'All') {
    const dataSource = filterDept === 'All' ? complaintsData : complaintsData.filter(c => c.category === filterDept);
    
    const ctxDept = document.getElementById('detailedDeptChart');
    if (ctxDept) {
        // Remove existing chart instance if we are re-rendering
        if (window.detailedDeptChartInstance) {
            window.detailedDeptChartInstance.destroy();
        }
        
        const deptCounts = {};
        if (filterDept === 'All') {
            departmentsData.forEach(d => { deptCounts[d.name || d] = 0; });
            complaintsData.forEach(c => {
                if(deptCounts[c.category] !== undefined) {
                    deptCounts[c.category]++;
                } else {
                    deptCounts[c.category] = (deptCounts[c.category] || 0) + 1;
                }
            });
        } else {
            deptCounts[filterDept] = dataSource.length;
        }

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
        dataSource.forEach(c => {
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
        dataSource.forEach(c => {
            const month = new Date(c.createdAt).toLocaleString('default', { month: 'short' });
            trendData[month] = (trendData[month] || 0) + 1;
        });

        window.detailedTrendChartInstance = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: Object.keys(trendData),
                datasets: [{
                    label: filterDept === 'All' ? 'Overall Complaints Trend' : `${filterDept} Trend`,
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
            // Simple approach: create a printable report window
            const reportWindow = window.open('', '_blank');
            const summaryData = {
                total: complaintsData.length,
                pending: complaintsData.filter(c => c.status === 'Submitted' || c.status === 'Pending').length,
                resolved: complaintsData.filter(c => c.status === 'Resolved').length,
                date: new Date().toLocaleDateString()
            };

            let tableHtml = complaintsData.map(c => `
                <tr>
                    <td>${c.complaintId || c._id.substring(0,8)}</td>
                    <td>${c.title}</td>
                    <td>${c.category}</td>
                    <td>${c.status}</td>
                    <td>${new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
            `).join('');

            reportWindow.document.write(`
                <html>
                    <head>
                        <title>Complaints Summary Report</title>
                        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                        <style>
                            @media print { .no-print { display: none; } }
                            body { padding: 40px; }
                        </style>
                    </head>
                    <body>
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h2>Complaints Summary Report</h2>
                            <button onclick="window.print()" class="btn btn-primary no-print">Print / Save as PDF</button>
                        </div>
                        <p class="text-muted">Generated on: ${summaryData.date}</p>
                        <div class="row mb-4">
                            <div class="col-4"><div class="card p-3"><h5>Total</h5><h3>${summaryData.total}</h3></div></div>
                            <div class="col-4"><div class="card p-3"><h5>Pending</h5><h3>${summaryData.pending}</h3></div></div>
                            <div class="col-4"><div class="card p-3"><h5>Resolved</h5><h3>${summaryData.resolved}</h3></div></div>
                        </div>
                        <table class="table table-striped border">
                            <thead>
                                <tr><th>ID</th><th>Title</th><th>Category</th><th>Status</th><th>Date</th></tr>
                            </thead>
                            <tbody>${tableHtml}</tbody>
                        </table>
                    </body>
                </html>
            `);
            reportWindow.document.close();
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

window.openReassignModal = function(id) {
    const complaint = complaintsData.find(c => c._id === id);
    if (!complaint) return;

    document.getElementById("reassign-complaint-id").value = id;
    document.getElementById("reassign-complaint-title").value = complaint.title;
    document.getElementById("reassign-current-officer").value = complaint.assignedOfficer?.name || "None";
    
    // Populate new officer select
    const select = document.getElementById("reassign-new-officer");
    if (select) {
        select.innerHTML = '<option value="">Select New Officer...</option>';
        
        // Sort officers by department
        const dept = complaint.category;
        const sortedOfficers = [...officersData]
            .filter(o => o._id !== complaint.assignedOfficer?._id)
            .sort((a, b) => {
                if (a.department === dept && b.department !== dept) return -1;
                if (a.department !== dept && b.department === dept) return 1;
                return 0;
            });

        sortedOfficers.forEach(o => {
            select.innerHTML += `<option value="${o._id}">${o.name} (${o.department || 'No Dept'})</option>`;
        });
    }

    const modalEl = document.getElementById("reassignModal");
    const modal = new bootstrap.Modal(modalEl);
    
    // Ensure it shows in front of other modals if open
    modalEl.style.zIndex = "1060"; 
    
    modal.show();
    
    // Adjust backdrop z-index if needed (for nested modals)
    setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        if (backdrops.length > 1) {
            backdrops[backdrops.length - 1].style.zIndex = "1055";
        }
    }, 100);
};

const reassignForm = document.getElementById("reassign-form");
if (reassignForm) {
    reassignForm.addEventListener("submit", async e => {
        e.preventDefault();
        const complaintId = document.getElementById("reassign-complaint-id").value;
        const officerId = document.getElementById("reassign-new-officer").value;
        const reason = document.getElementById("reassign-reason").value;

        try {
            const response = await fetch(`${API}/complaints/${complaintId}/assign`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token
                },
                body: JSON.stringify({ officerId, remarks: reason, status: "Reassigned" })
            });

            if (!response.ok) throw new Error("Reassignment failed");

            bootstrap.Modal.getInstance(document.getElementById("reassignModal")).hide();
            
            // Try to hide detail modal if open
            const detailModalEl = document.getElementById("viewDetailsAdminModal");
            if (detailModalEl) {
                const detailModal = bootstrap.Modal.getInstance(detailModalEl);
                if (detailModal) detailModal.hide();
            }
            
            alert("Officer reassigned successfully");
            loadDashboardData();
        } catch (err) {
            console.error(err);
            alert("Reassignment failed");
        }
    });
}

async function openViewDetailsModal(id) {
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
    const imgVal = complaint.image || complaint.evidence;
    const imageUrl = imgVal ? (imgVal.startsWith('http') ? imgVal : `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${imgVal}`) : null;

    // Fetch concerns for this complaint to show in-modal
    let concernsHtml = '';
    try {
        const res = await fetch(`${API}/concerns/complaint/${complaint._id}`, {
            headers: { Authorization: "Bearer " + token }
        });
        if (res.ok) {
            const concerns = await res.json();
            if (concerns.length > 0) {
                concernsHtml = `
                    <div class="mt-4 border-top pt-4">
                        <h6 class="fw-bold mb-3 text-danger"><i class="bi bi-exclamation-octagon-fill me-2"></i>Escalated Concerns (${concerns.length})</h6>
                        <div class="concerns-mini-list">
                            ${concerns.map(c => `
                                <div class="p-3 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded mb-2">
                                    <div class="d-flex justify-content-between mb-1">
                                        <span class="badge bg-danger">Concern #${c.concernNumber || '1'}</span>
                                        <small class="text-muted">${new Date(c.createdAt).toLocaleDateString()}</small>
                                    </div>
                                    <p class="mb-0 small">${c.description}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        }
    } catch (err) { console.error("Error fetching modal concerns:", err); }

    content.innerHTML = `
        <div class="row g-4">
            <div class="col-md-6">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="fw-bold text-muted small text-uppercase mb-0">Reporter Details (Citizen)</h6>
                    ${complaint.hasConcern ? '<span class="badge bg-danger rounded-pill"><i class="bi bi-exclamation-triangle me-1"></i>Has Concerns</span>' : ''}
                </div>
                <div class="p-3 bg-light rounded mb-4">
                    <p class="mb-1"><strong>Full Name:</strong> ${complaint.user?.name || 'Anonymous'}</p>
                    <p class="mb-1"><strong>Email:</strong> ${complaint.user?.email || 'N/A'}</p>
                    <p class="mb-0"><strong>Role:</strong> Citizen</p>
                </div>

                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="fw-bold text-muted small text-uppercase mb-0">Case Information</h6>
                    ${complaint.assignedOfficer ? `
                        <button class="btn btn-sm btn-outline-warning py-0" onclick="openReassignModal('${complaint._id}')">
                            <i class="bi bi-arrow-repeat me-1"></i>Reassign
                        </button>
                    ` : ''}
                </div>
                <div class="p-3 bg-light rounded">
                    <p class="mb-1"><strong>Complaint ID:</strong> ${complaint.complaintId || id}</p>
                    <p class="mb-1"><strong>Department:</strong> ${complaint.category}</p>
                    <p class="mb-1"><strong>Status:</strong> <span class="badge bg-primary">${complaint.status}</span></p>
                    <p class="mb-1"><strong>Assigned Officer:</strong> ${complaint.assignedOfficer?.name || 'Not yet assigned'}</p>
                    <hr>
                    <p class="mb-1"><strong>Title:</strong> ${complaint.title || complaint.category}</p>
                    <p class="mb-0"><strong>Full Description:</strong> ${complaint.description}</p>
                </div>
                
                ${concernsHtml}
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
    const officerFilter = document.getElementById("officer-filter");

    const runFilters = () => {
        const search = searchBox ? searchBox.value.toLowerCase().trim() : "";
        const status = statusFilter ? statusFilter.value : "All";
        const priority = priorityFilter ? priorityFilter.value : "All";
        const officerName = officerFilter ? officerFilter.value : "All";

        const filtered = complaintsData.filter(c => {
            const readableId = (c.complaintId || c._id.substring(0,8)).toLowerCase();
            const matchesSearch = !search || 
                                 (c.title && c.title.toLowerCase().includes(search)) || 
                                 (c.description && c.description.toLowerCase().includes(search)) ||
                                 readableId.includes(search);
                                 
            const matchesStatus = status === "All" || c.status === status;
            
            // Handle case sensitivity or missing priority
            const cPriority = c.priority || "Medium";
            const matchesPriority = priority === "All" || cPriority.toLowerCase() === priority.toLowerCase();
            
            let matchesOfficer = true;
            if (officerName !== "All") {
                matchesOfficer = c.assignedOfficer && (c.assignedOfficer.name === officerName || c.assignedOfficer._id === officerName);
            }
            
            return matchesSearch && matchesStatus && matchesPriority && matchesOfficer;
        });

        renderComplaints(filtered);
    };

    if (searchBox) searchBox.addEventListener("input", runFilters);
    if (statusFilter) statusFilter.addEventListener("change", runFilters);
    if (priorityFilter) priorityFilter.addEventListener("change", runFilters);
    if (officerFilter) officerFilter.addEventListener("change", runFilters);
}

function populateOfficersFilter() {
    const officerFilter = document.getElementById("officer-filter");
    if (!officerFilter) return;

    officerFilter.innerHTML = '<option value="All">All Officers</option>';
    
    // Get unique officer names from complaintsData to ensure we only filter by officers who actually have complaints
    // OR get them from officersData. Let's use both to be safe and ensure the filter is useful.
    const namesFromOfficers = officersData.map(o => o.name || o.email || o.staffId).filter(Boolean);
    const namesFromComplaints = complaintsData.map(c => c.assignedOfficer?.name).filter(Boolean);
    
    const uniqueNames = [...new Set([...namesFromOfficers, ...namesFromComplaints])].sort();
    
    uniqueNames.forEach(name => {
        officerFilter.innerHTML += `<option value="${name}">${name}</option>`;
    });
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

    // Detect current active section to act accordingly
    const activeLink = document.querySelector(".nav-link.active[data-section]");
    const currentSection = activeLink ? activeLink.getAttribute("data-section") : "dashboard";

    if (currentSection === 'complaints') {
        const filtered = dept === 'All' ? complaintsData : complaintsData.filter(c => c.category === dept);
        renderComplaints(filtered);
    } else if (currentSection === 'officers') {
        const filtered = dept === 'All' ? officersData : officersData.filter(o => o.department === dept);
        renderOfficers(filtered);
    } else if (currentSection === 'analytics') {
        renderAnalytics(dept);
    } else if (currentSection === 'dashboard') {
        const filtered = dept === 'All' ? complaintsData : complaintsData.filter(c => c.category === dept);
        updateStats(filtered);
        renderRecentActivity(filtered);
    } else {
        // Fallback for sections that don't have their own filtering yet
        console.log(`Filtering not implemented for section: ${currentSection}`);
    }
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
            officerLevel: document.getElementById("off-level") ? document.getElementById("off-level").value : "Ground",
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

window.promoteOfficer = async function(id, name) {
    if (!confirm(`Are you sure you want to promote ${name} to Department Head? This will demote any existing head for their department.`)) return;

    try {
        const res = await fetch(`${API}/admin/users/${id}/promote`, {
            method: "PUT",
            headers: { Authorization: "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Promotion failed");
        
        alert(`${name} is now the Department Head!`);
        loadDashboardData();
    } catch (err) {
        alert(err.message || "Promotion failed");
    }
};

window.logout = function() {
    sessionStorage.clear();
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
    try {
        const response = await fetch(API + '/feedback/all', {
            headers: { Authorization: 'Bearer ' + token }
        });

        if (!response.ok) throw new Error('Failed to load feedbacks');

        const feedbacks = await response.json();
        window.feedbacksData = feedbacks; // Store for details view

        const container = document.getElementById('feedbacks-section');
        const contentArea = container.querySelector('.table-container');
        
        if (feedbacks.length === 0) {
            contentArea.innerHTML = '<div class="text-center py-5 text-muted"><i class="bi bi-chat-left-dots fs-1 d-block mb-3"></i>No feedbacks found yet.</div>';
        } else {
            let cardsHtml = '<div class="row g-4">';
            feedbacks.forEach(f => {
                let typeBadge = 'bg-secondary';
                if (f.type === 'General') typeBadge = 'bg-info';
                else if (f.type === 'Complaint') typeBadge = 'bg-primary';
                else if (f.type === 'Concern') typeBadge = 'bg-danger';

                const dateStr = new Date(f.createdAt).toLocaleDateString();
                
                cardsHtml += `
                <div class="col-md-6 col-lg-4">
                    <div class="card feedback-card h-100 border-0 shadow-sm" style="cursor: pointer;" onclick="viewFeedback('${f._id}')">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h6 class="fw-bold mb-0">${f.name}</h6>
                                    <small class="text-muted">${f.email}</small>
                                </div>
                                <div class="text-end">
                                    <span class="badge ${typeBadge} d-block mb-1">${f.type || 'General'}</span>
                                    ${f.rating ? `<div class="text-warning small">${'★'.repeat(f.rating)}${'☆'.repeat(5-f.rating)}</div>` : ''}
                                </div>
                            </div>
                            <p class="card-text text-secondary mb-3 text-truncate-2">${f.feedbackText || f.feedback}</p>
                            <div class="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                                <small class="text-muted"><i class="bi bi-calendar3 me-1"></i>${dateStr}</small>
                                ${f.complaint ? `<span class="badge bg-light text-dark border">ID: ${f.complaint.complaintId || 'REF'}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                `;
            });
            cardsHtml += '</div>';
            contentArea.innerHTML = cardsHtml;
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Failed to load feedbacks.</td></tr>';
    }
}

window.viewFeedback = function(id) {
    const f = (window.feedbacksData || []).find(fb => fb._id === id);
    if (!f) return;

    const content = document.getElementById('feedback-details-content');
    if (!content) return;

    const ratingHtml = f.rating ? `
        <div class="text-center mb-4">
            <h1 class="text-warning mb-0">${'★'.repeat(f.rating)}${'☆'.repeat(5-f.rating)}</h1>
            <small class="text-muted">${f.rating} out of 5 stars</small>
        </div>` : '';

    const officerHtml = f.officer ? `
        <div class="p-3 bg-light rounded mt-3">
            <h6 class="fw-bold small text-muted text-uppercase mb-2">Related Officer</h6>
            <div class="d-flex align-items-center">
                <i class="bi bi-person-badge fs-3 me-3 text-primary"></i>
                <div>
                    <p class="mb-0 fw-bold">${f.officer.name}</p>
                    <small class="text-muted">${f.officer.department || 'Officer'}</small>
                </div>
            </div>
        </div>` : '';

    const complaintHtml = f.complaint ? `
        <div class="p-3 bg-light rounded mt-3">
            <h6 class="fw-bold small text-muted text-uppercase mb-2">Related Complaint</h6>
            <p class="mb-1"><strong>ID:</strong> ${f.complaint.complaintId || 'N/A'}</p>
            <p class="mb-0"><strong>Title:</strong> ${f.complaint.title || f.complaint.category || 'N/A'}</p>
        </div>` : '';

    content.innerHTML = `
        ${ratingHtml}
        
        <div class="p-4 bg-primary bg-opacity-10 border border-primary border-opacity-10 rounded mb-4">
            <p class="card-text fs-5 mb-0" style="white-space: pre-wrap;">"${f.feedbackText || f.feedback}"</p>
        </div>

        <div class="row g-3">
            <div class="col-6">
                <h6 class="fw-bold small text-muted text-uppercase mb-1">Submitted By</h6>
                <p class="mb-0 fw-bold">${f.name}</p>
                <small class="text-muted">${f.email}</small>
            </div>
            <div class="col-6">
                <h6 class="fw-bold small text-muted text-uppercase mb-1">Type & Date</h6>
                <span class="badge bg-info">${f.type || 'General'}</span>
                <p class="mb-0 small text-muted mt-1">${new Date(f.createdAt).toLocaleString()}</p>
            </div>
        </div>

        ${officerHtml}
        ${complaintHtml}
    `;

    new bootstrap.Modal(document.getElementById('feedbackDetailsModal')).show();
}

/* =========================
   ANNOUNCEMENTS
========================= */

async function loadAnnouncements() {
    const tbody = document.getElementById('announcements-table-body');
    if (!tbody) return;

    try {
        const response = await fetch(API + '/announcements/admin', {
            headers: { Authorization: 'Bearer ' + token }
        });
        const announcements = await response.json();
        let html = '';

        if (announcements.length === 0) {
            html = '<tr><td colspan="4" class="text-center py-4">No announcements found.</td></tr>';
        } else {
            announcements.forEach(a => {
                html += `
                <tr>
                    <td><strong>${a.title}</strong></td>
                    <td><div class="text-wrap" style="max-width: 400px;">${a.content}</div></td>
                    <td><small>${new Date(a.createdAt).toLocaleDateString()}</small></td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAnnouncement('${a._id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
                `;
            });
        }
        tbody.innerHTML = html;
    } catch (err) {
        console.error(err);
    }
}

function setupAnnouncementForm() {
    const form = document.getElementById('announcement-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            title: document.getElementById('ann-title').value,
            content: document.getElementById('ann-content').value
        };

        try {
            const res = await fetch(API + '/announcements', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token 
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Announcement published!');
                form.reset();
                bootstrap.Modal.getInstance(document.getElementById('addAnnouncementModal')).hide();
                loadAnnouncements();
            }
        } catch (err) {
            console.error(err);
        }
    });
}

window.deleteAnnouncement = async function(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
        const res = await fetch(API + '/announcements/' + id, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + token }
        });
        if (res.ok) {
            loadAnnouncements();
        }
    } catch (err) {
        console.error(err);
    }
};

/* =========================
   CONCERNS
========================= */

window.viewConcerns = async function(complaintId) {
    const container = document.getElementById('concerns-list-container');
    container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></div>';
    
    new bootstrap.Modal(document.getElementById('viewConcernsModal')).show();

    try {
        const res = await fetch(`${API}/concerns/complaint/${complaintId}`, {
            headers: { Authorization: "Bearer " + token }
        });
        const concerns = await res.json();
        
        if (concerns.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-muted">No concerns raised for this complaint.</div>';
            return;
        }

        let html = '';
        concerns.forEach(c => {
            const imageUrl = c.image ? `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${c.image}` : null;
            html += `
            <div class="card mb-3 border-0 shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between mb-2">
                        <h6 class="fw-bold mb-0">${c.user?.name || 'Citizen'}</h6>
                        <small class="text-muted">${new Date(c.createdAt).toLocaleString()}</small>
                    </div>
                    <p class="mb-3">${c.description}</p>
                    ${imageUrl ? `<img src="${imageUrl}" class="img-fluid rounded mb-3" style="max-height: 200px;">` : ''}
                    <div class="p-2 bg-light rounded small mb-3">
                        <strong>Status:</strong> ${c.status}
                    </div>
                    
                    <div class="mt-2 border-top pt-2">
                        <label class="form-label small fw-bold text-success"><i class="bi bi-shield-check"></i> Admin Response</label>
                        ${c.adminResponse ? 
                            `<div class="p-2 border border-success rounded bg-white text-success small mb-2">${c.adminResponse}</div>` : 
                            `<textarea class="form-control form-control-sm mb-2" id="admin-resp-${c._id}" rows="2" placeholder="Write an official response to the citizen..."></textarea>
                             <button class="btn btn-sm btn-success" onclick="submitAdminResponse('${c._id}', '${complaintId}')">Submit Response</button>`
                        }
                    </div>
                    
                    ${c.officerResponse ? `
                    <div class="mt-3 border-top pt-2">
                        <label class="form-label small fw-bold text-primary"><i class="bi bi-person-badge"></i> Officer Response</label>
                        <div class="p-2 border border-primary rounded bg-white text-primary small">${c.officerResponse}</div>
                    </div>` : ''}
                </div>
            </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="text-center py-4 text-danger">Failed to load concerns.</div>';
    }
};

window.submitAdminResponse = async function(concernId, complaintId) {
    const resp = document.getElementById(`admin-resp-${concernId}`).value.trim();
    if (!resp) return alert('Response cannot be empty');
    
    try {
        const res = await fetch(`${API}/concerns/${concernId}/respond`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ adminResponse: resp, status: 'Addressed' })
        });
        if (res.ok) {
            alert('Response submitted successfully');
            viewConcerns(complaintId); // Refresh modal
        } else {
            const data = await res.json();
            alert(data.message || 'Failed to submit response');
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred');
    }
};

/* =========================
   CONCERNS TRACKING TABLE
========================= */

function populateLNOfficers() {
    const lnSel = document.getElementById("ln-officer-select");
    if (!lnSel) return;
    lnSel.innerHTML = '<option value="" disabled selected>Select Officer...</option>';
    officersData.forEach(o => {
        const option = document.createElement('option');
        option.value = o._id;
        option.textContent = `${o.name} - ${o.department}`;
        lnSel.appendChild(option);
    });
}

async function loadConcerns() {
    try {
        const res = await fetch(`${API}/concerns/all`, {
            headers: { Authorization: "Bearer " + token }
        });
        if (res.ok) {
            concernsData = await res.json();
            renderConcerns(concernsData);
        }
    } catch (err) {
        console.error("Failed to load concerns", err);
    }
}

window.filterConcerns = function(level) {
    if (level === 'All') {
        renderConcerns(concernsData);
    } else {
        const filtered = concernsData.filter(c => c.escalationLevel === level);
        renderConcerns(filtered);
    }
};

function renderConcerns(data) {
    const tbody = document.getElementById("concerns-table-body");
    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No concerns found.</td></tr>';
        return;
    }

    let html = "";
    data.forEach(c => {
        let escBadge = "bg-secondary";
        if (c.escalationLevel === "Warning") escBadge = "bg-warning text-dark";
        if (c.escalationLevel === "Critical") escBadge = "bg-danger";

        const complaintId = c.complaint?.complaintId || 'Unknown';
        const date = new Date(c.createdAt).toLocaleDateString();

        html += `
        <tr>
            <td><span class="badge ${escBadge}">${c.escalationLevel} (${c.concernNumber || 1})</span></td>
            <td><strong>${complaintId}</strong></td>
            <td><span class="d-inline-block text-truncate" style="max-width: 200px;">${c.description}</span></td>
            <td><span class="badge bg-light text-dark border">${c.status}</span></td>
            <td>${date}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewConcerns('${c.complaint?._id}')">View History</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

/* =========================
   LEGAL NOTICES
========================= */

async function loadLegalNotices() {
    try {
        const res = await fetch(`${API}/legal-notices/all`, {
            headers: { Authorization: "Bearer " + token }
        });
        if (res.ok) {
            const data = await res.json();
            legalNoticesData = data.notices;
            renderLegalNotices();
        }
    } catch (err) {
        console.error("Failed to load legal notices", err);
    }
}

function renderLegalNotices() {
    const tbody = document.getElementById("legal-notices-table-body");
    if (!tbody) return;

    if (legalNoticesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No legal notices sent yet.</td></tr>';
        return;
    }

    let html = "";
    legalNoticesData.forEach(ln => {
        const officerName = ln.officerId?.name || 'Unknown Officer';
        const typeBadge = ln.isAutoGenerated ? `<span class="badge bg-danger">Auto-Generated</span>` : `<span class="badge bg-secondary">Manual</span>`;
        let statusBadge = "bg-warning text-dark";
        if (ln.status === "Read") statusBadge = "bg-info text-dark";
        if (ln.status === "Responded") statusBadge = "bg-success";

        const responseText = ln.officerResponse 
            ? `<span class="d-inline-block text-truncate" style="max-width: 150px;" title="${ln.officerResponse}">${ln.officerResponse}</span>` 
            : '<span class="text-muted small">Pending...</span>';

        const date = new Date(ln.createdAt).toLocaleDateString();
        const displayComplaint = ln.complaint ? ln.complaint.complaintId : `<span class="text-muted small">N/A</span>`;

        html += `
        <tr>
            <td>
                <div class="fw-bold text-truncate" style="max-width: 150px;" title="${ln.title}">${ln.title}</div>
                <small class="text-muted">${displayComplaint}</small>
            </td>
            <td>${officerName}</td>
            <td>${typeBadge}</td>
            <td><span class="badge ${statusBadge}">${ln.status}</span></td>
            <td>${responseText}</td>
            <td>${date}</td>
            <td>
                <button class="btn btn-sm btn-outline-dark" onclick="viewLegalNotice('${ln._id}')">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

window.viewLegalNotice = async function(id) {
    try {
        const res = await fetch(`${API}/legal-notices/${id}`, {
            headers: { Authorization: "Bearer " + token }
        });
        const ln = await res.json();
        
        const content = document.getElementById("ln-details-content");
        if (!content) return;
        
        const officerName = ln.officerId?.name || "Unknown Officer";
        const complaintId = ln.complaint?.complaintId || ln.complaintId || "N/A";
        const statusBadge = ln.status === 'Responded' ? 'bg-success' : 'bg-warning text-dark';
        
        content.innerHTML = `
            <div class="mb-4">
                <h5 class="fw-bold text-primary mb-1">${ln.title}</h5>
                <div class="d-flex justify-content-between">
                    <span class="badge ${statusBadge}">${ln.status}</span>
                    <small class="text-muted">${new Date(ln.createdAt).toLocaleString()}</small>
                </div>
            </div>
            
            <div class="p-3 bg-light rounded mb-4">
                <p class="fw-bold small text-muted text-uppercase mb-2">Notice Content</p>
                <p class="mb-0" style="white-space: pre-wrap;">${ln.content}</p>
            </div>
            
            <div class="row g-3">
                <div class="col-6">
                    <p class="fw-bold small text-muted text-uppercase mb-1">Target Officer</p>
                    <p class="mb-0 fw-bold">${officerName}</p>
                    <small class="text-muted">${ln.officerId?.email || ''}</small>
                </div>
                <div class="col-6">
                    <p class="fw-bold small text-muted text-uppercase mb-1">Related Case</p>
                    <p class="mb-0 fw-bold">${complaintId}</p>
                </div>
            </div>
            
            ${ln.status === 'Responded' ? `
            <div class="mt-4 pt-4 border-top">
                <div class="p-3 bg-success bg-opacity-10 border border-success border-opacity-25 rounded shadow-sm">
                    <div class="d-flex justify-content-between mb-2">
                        <h6 class="fw-bold text-success mb-0"><i class="bi bi-reply-fill me-1"></i>Officer's Response</h6>
                        <small class="text-muted">${new Date(ln.updatedAt || ln.createdAt).toLocaleString()}</small>
                    </div>
                    <p class="mb-0" style="white-space: pre-wrap;">${ln.officerResponse || "Detailed response provided."}</p>
                </div>
            </div>` : ''}
        `;
        
        new bootstrap.Modal(document.getElementById("viewLegalNoticeModal")).show();
    } catch (err) {
        console.error("View legal notice error:", err);
        alert("Failed to load notice details.");
    }
};

function populateLNOfficers() {
    const select = document.getElementById("ln-officer-id");
    if (!select) return;
    
    select.innerHTML = '<option value="" disabled selected>Select an Officer</option>';
    officersData.forEach(o => {
        select.innerHTML += `<option value="${o._id}">${o.name} (${o.department})</option>`;
    });
}

// Handle manual legal notice form submission
const lnForm = document.getElementById("send-legal-notice-form");
if (lnForm) {
    lnForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const officerId = document.getElementById("ln-officer-id").value;
        const complaintId = document.getElementById("ln-complaint-id").value.trim() || undefined; // Note: For a robust system this should map to the ObjectId of complaint if provided
        const title = document.getElementById("ln-title").value.trim();
        const content = document.getElementById("ln-content").value.trim();

        try {
            const res = await fetch(`${API}/legal-notices`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token 
                },
                body: JSON.stringify({ officerId, title, content }) // Passing string complaintId for now as reference
            });

            if (res.ok) {
                alert("Legal notice sent successfully.");
                bootstrap.Modal.getInstance(document.getElementById("sendLegalNoticeModal")).hide();
                lnForm.reset();
                loadLegalNotices();
            } else {
                const data = await res.json();
                alert(data.message || "Failed to send notice.");
            }
        } catch (err) {
            console.error("Notice error:", err);
            alert("Error sending notice.");
        }
    });
}
