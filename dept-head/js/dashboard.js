/**
 * Department Head Dashboard JavaScript
 * Premium UI with Department-Specific Scoping
 */

const API = (window.API_BASE_URL || "http://localhost:7000") + "/api";
const token = sessionStorage.getItem("jwt");
const role = sessionStorage.getItem("role");
const myDept = sessionStorage.getItem("department");

if (!token || role !== "dept-head") {
    alert("Access denied. Please login as a Department Head.");
    window.location.href = "../index.html";
}

// Global data store
let complaintsData = [];
let officersData = [];
let concernsData = [];
let feedbacksData = [];

/* =========================
   INITIALIZATION
========================= */

document.addEventListener("DOMContentLoaded", () => {
    updateProfileInfo();
    setupNavigation();
    loadDashboardData();
    setupFilters();
    setupForms();
});

function updateProfileInfo() {
    const storedName = sessionStorage.getItem("userName") || "Dept Head";
    const deptName = myDept || "Police";

    // Header & Greeting
    document.getElementById("header-user-name").textContent = storedName;
    document.getElementById("user-greeting").textContent = `Hello, ${storedName}`;
    document.getElementById("dept-name-header").textContent = `${deptName} Head Portal`;
    document.getElementById("current-dept-display").textContent = deptName;
    document.getElementById("mobile-dept-title").textContent = `${deptName} Portal`;
    
    // Add Officer Modal Read-only Dept
    const offDeptDisplay = document.getElementById("off-dept-display");
    if (offDeptDisplay) offDeptDisplay.value = deptName;

    // Settings Profile Info
    if (document.getElementById("prof-name")) document.getElementById("prof-name").value = storedName;
    if (document.getElementById("prof-email")) document.getElementById("prof-email").value = sessionStorage.getItem("userEmail") || "";
    if (document.getElementById("prof-dept")) document.getElementById("prof-dept").value = deptName;

    let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(storedName)}&background=0d6efd&color=fff`;
    document.getElementById("header-profile-img").src = avatarUrl;
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
            
            navLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
            
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('show');
            }
        });
    });

    document.getElementById("sidebar-toggle")?.addEventListener("click", () => {
        document.getElementById("sidebar").classList.toggle("collapsed");
        document.getElementById("main-content").classList.toggle("expanded");
    });
    
    document.getElementById("mobile-sidebar-toggle")?.addEventListener("click", () => {
        document.getElementById("sidebar").classList.toggle("show");
    });
}

function switchSection(sectionId) {
    const sections = [
        "dashboard-section",
        "complaints-section",
        "officers-section",
        "concerns-section",
        "feedbacks-section",
        "reports-section",
        "settings-section"
    ];

    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("d-none");
    });

    const target = document.getElementById(sectionId + "-section");
    if (target) {
        target.classList.remove("d-none");
        if (sectionId === "dashboard") {
            renderDashboardCharts();
            renderRecentActivity();
        }
        if (sectionId === "complaints") renderComplaintsTable();
        if (sectionId === "officers") renderOfficersTable();
        if (sectionId === "concerns") renderConcernsTable();
        if (sectionId === "feedbacks") renderFeedbacksTable();
    }

    // Update Sidebar active state
    const navLinks = document.querySelectorAll(".nav-link[data-section]");
    navLinks.forEach(link => {
        if (link.getAttribute("data-section") === sectionId) link.classList.add("active");
        else link.classList.remove("active");
    });
}

/* =========================
   DATA FETCHING
========================= */

async function loadDashboardData() {
    try {
        const [compRes, offRes, conRes, feedRes] = await Promise.all([
            fetch(`${API}/complaints`, { headers: { Authorization: "Bearer " + token } }),
            fetch(`${API}/admin/officers`, { headers: { Authorization: "Bearer " + token } }),
            fetch(`${API}/concerns/dept`, { headers: { Authorization: "Bearer " + token } }),
            fetch(`${API}/feedback/all`, { headers: { Authorization: "Bearer " + token } })
        ]);

        const compJson = await compRes.json();
        const offJson = await offRes.json();
        const conJson = await conRes.json();
        const feedJson = await feedRes.json();

        // Fuzzy match helper for category vs department (e.g. "Road Problems" vs "Road Damage")
        const fuzzyMatch = (cat, dept) => {
            if (!cat || !dept) return false;
            return cat.split(' ')[0].toLowerCase() === dept.split(' ')[0].toLowerCase();
        };

        // FILTER EVERYTHING BY DEPARTMENT
        const allComplaints = Array.isArray(compJson) ? compJson : (compJson.complaints || []);
        complaintsData = allComplaints.filter(c => fuzzyMatch(c.category, myDept));

        const allOfficers = Array.isArray(offJson) ? offJson : (offJson.officers || []);
        officersData = allOfficers.filter(o => fuzzyMatch(o.department, myDept));

        // Concerns are already server-side filtered by dept
        concernsData = Array.isArray(conJson) ? conJson : [];

        const allFeedback = Array.isArray(feedJson) ? feedJson : [];
        feedbacksData = allFeedback.filter(f => f.type === 'General' || (f.complaint && complaintsData.some(c => c._id === f.complaint || c._id === f.complaint._id)));

        updateStats();
        renderRecentActivity();
        renderDashboardCharts();
        populateAssignOfficers();
    } catch (err) {
        console.error("Dashboard Load Error:", err);
    }
}


function updateStats() {
    const total = complaintsData.length;
    const pending = complaintsData.filter(c => c.status === "Submitted").length;
    const assigned = complaintsData.filter(c => c.status === "Assigned" || c.status === "In Progress").length;
    const resolved = complaintsData.filter(c => c.status === "Resolved").length;

    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-pending").textContent = pending;
    document.getElementById("stat-assigned").textContent = assigned;
    document.getElementById("stat-resolved").textContent = resolved;
}

/* =========================
   RENDERING FUNCTIONS
========================= */

function renderRecentActivity() {
    const tbody = document.getElementById("recent-complaints-table");
    if (!tbody) return;
    
    const recent = [...complaintsData].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    
    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3">No recent activity</td></tr>';
        return;
    }

    tbody.innerHTML = recent.map(c => `
        <tr>
            <td><small class="fw-bold text-muted">${c.complaintId || c._id.substring(0,8).toUpperCase()}</small></td>
            <td><div class="text-truncate" style="max-width: 200px;">${c.title}</div></td>
            <td><span class="badge bg-${getStatusColor(c.status)}">${c.status}</span></td>
            <td><small>${new Date(c.createdAt).toLocaleDateString()}</small></td>
        </tr>
    `).join('');
}

function renderComplaintsTable(data = complaintsData) {
    const tbody = document.getElementById("complaints-table-body");
    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4">No complaints found.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(c => `
        <tr>
            <td><small class="fw-bold text-muted">${c.complaintId || c._id.substring(0,8).toUpperCase()}</small></td>
            <td><strong>${c.citizenName || c.user?.name || 'Citizen'}</strong></td>
            <td>
                <div class="fw-medium">${c.title}</div>
                <div class="small text-muted text-truncate" style="max-width: 200px;">${c.description}</div>
            </td>
            <td><span class="badge bg-light text-dark border">${c.priority || 'Medium'}</span></td>
            <td><span class="badge bg-${getStatusColor(c.status)}">${c.status}</span></td>
            <td>${c.assignedOfficer?.name || '<span class="text-danger small italic">Unassigned</span>'}</td>
            <td><small>${new Date(c.createdAt).toLocaleDateString()}</small></td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewComplaintDetails('${c._id}')" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    ${c.assignedOfficer 
                        ? `<button class="btn btn-sm btn-outline-warning" onclick="openReassignModal('${c._id}')" title="Reassign Officer">
                            <i class="bi bi-person-gear"></i>
                           </button>`
                        : `<button class="btn btn-sm btn-primary" onclick="openAssignModal('${c._id}')" title="Assign Officer">
                            <i class="bi bi-person-plus"></i>
                           </button>`
                    }
                </div>
            </td>
        </tr>
    `).join('');
}

function renderOfficersTable() {
    const tbody = document.getElementById("officers-table-body");
    if (!tbody) return;

    if (officersData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3">No officers found in this department.</td></tr>';
        return;
    }

    tbody.innerHTML = officersData.map(o => {
        const activeCount = complaintsData.filter(c => c.assignedOfficer?._id === o._id && c.status !== "Resolved").length;
        return `
            <tr>
                <td><span class="badge bg-light text-dark border">${o.staffId || 'N/A'}</span></td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(o.name)}&background=random" class="rounded-circle me-2" width="24" height="24">
                        <span>${o.name}</span>
                    </div>
                </td>
                <td><span class="badge bg-secondary">${o.officerLevel || 'Ground'}</span></td>
                <td><span class="badge bg-primary">${activeCount}</span></td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-warning" onclick="openLegalNoticeModal('${o._id}', '${o.name}')" title="Send Legal Notice">
                            <i class="bi bi-envelope-exclamation"></i> Notice
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="terminateOfficer('${o._id}', '${o.name}')" title="Terminate Officer">
                            <i class="bi bi-person-x-fill"></i> Terminate
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.terminateOfficer = function(id, name) {
    const termModalEl = document.getElementById("terminationModal");
    const offNameEl = document.getElementById("terminate-off-name");
    const targetNameEl = document.getElementById("res-target-name");
    const confirmCheck = document.getElementById("confirm-termination");
    const confirmBtn = document.getElementById("confirm-terminate-btn");

    if (!termModalEl || !confirmBtn) return;

    offNameEl.textContent = name;
    targetNameEl.textContent = name;
    confirmCheck.checked = false;
    confirmBtn.classList.add("disabled");
    
    const modal = new bootstrap.Modal(termModalEl);
    modal.show();

    confirmCheck.onchange = function() {
        if(this.checked) {
            confirmBtn.classList.remove("disabled");
        } else {
            confirmBtn.classList.add("disabled");
        }
    };

    confirmBtn.onclick = async function() {
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

function renderConcernsTable() {
    const tbody = document.getElementById("concerns-table");
    if (!tbody) return;

    if (concernsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3">No escalated concerns.</td></tr>';
        return;
    }

    tbody.innerHTML = concernsData.map(con => `
        <tr>
            <td><span class="badge bg-${con.escalationLevel === 'Critical' ? 'danger' : (con.escalationLevel === 'Warning' ? 'warning' : 'info')}">${con.escalationLevel}</span></td>
            <td>${con.complaint?.complaintId || 'N/A'}</td>
            <td>${con.description}</td>
            <td>
                ${con.status === 'Open' || !con.adminResponse ? 
                `<button class="btn btn-sm btn-warning" onclick="openConcernResponseModal('${con._id}')"><i class="bi bi-reply-fill"></i> Respond</button>` : 
                `<span class="badge bg-light text-dark border">${con.status || 'Pending'}</span>`
                }
            </td>
            <td><small>${new Date(con.createdAt).toLocaleDateString()}</small></td>
        </tr>
    `).join('');
}

function renderFeedbacksTable() {
    const tbody = document.getElementById("feedbacks-table");
    if (!tbody) return;

    if (feedbacksData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3">No feedback received.</td></tr>';
        return;
    }

    tbody.innerHTML = feedbacksData.map(f => `
        <tr>
            <td><strong>${f.name}</strong></td>
            <td><span class="badge bg-light text-dark border">${f.type}</span></td>
            <td><div class="small">${f.feedbackText}</div></td>
            <td><small>${new Date(f.createdAt).toLocaleDateString()}</small></td>
        </tr>
    `).join('');
}

/* =========================
   CHARTS
========================= */

function renderDashboardCharts() {
    const ctxStatus = document.getElementById('detailedStatusChart');
    if (ctxStatus) {
        if (window.statusChart) window.statusChart.destroy();
        
        const counts = { Submitted: 0, Assigned: 0, "In Progress": 0, Resolved: 0 };
        complaintsData.forEach(c => { if(counts.hasOwnProperty(c.status)) counts[c.status]++; });

        window.statusChart = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: ['#ffc107', '#0dcaf0', '#0d6efd', '#198754'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    const ctxTrend = document.getElementById('detailedTrendChart');
    if (ctxTrend) {
        if (window.trendChart) window.trendChart.destroy();
        
        const trendData = {};
        complaintsData.forEach(c => {
            const m = new Date(c.createdAt).toLocaleString('default', { month: 'short' });
            trendData[m] = (trendData[m] || 0) + 1;
        });

        window.trendChart = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: Object.keys(trendData),
                datasets: [{
                    label: 'Complaints',
                    data: Object.values(trendData),
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

/* =========================
   ACTIONS & MODALS
========================= */

window.viewComplaintDetails = function(id) {
    const c = complaintsData.find(comp => comp._id === id);
    if (!c) return;

    const content = document.getElementById("complaint-details-content");
    content.innerHTML = `
        <div class="row g-4">
            <div class="col-md-6">
                <h6 class="text-uppercase small fw-bold text-muted mb-2">Basic Info</h6>
                <p class="mb-1"><strong>ID:</strong> ${c.complaintId || c._id}</p>
                <p class="mb-1"><strong>Status:</strong> <span class="badge bg-${getStatusColor(c.status)}">${c.status}</span></p>
                <p class="mb-1"><strong>Priority:</strong> <span class="badge bg-light text-dark border">${c.priority || 'Medium'}</span></p>
                <p class="mb-1"><strong>Date:</strong> ${new Date(c.createdAt).toLocaleString()}</p>
            </div>
            <div class="col-md-6">
                <h6 class="text-uppercase small fw-bold text-muted mb-2">Citizen Details</h6>
                <p class="mb-1"><strong>Name:</strong> ${c.citizenName || c.user?.name || 'Citizen'}</p>
                <p class="mb-1"><strong>Location:</strong> ${c.location || 'N/A'}</p>
            </div>
            <div class="col-12 mt-3 text-center">
                <h5 class="fw-bold">${c.title}</h5>
                <p class="p-3 bg-light rounded">${c.description}</p>
            </div>
            ${c.complaintPhoto ? `
            <div class="col-12 text-center">
                <img src="${API.replace('/api', '')}/uploads/${c.complaintPhoto}" class="img-fluid rounded border" style="max-height: 300px;">
            </div>` : ''}
        </div>
    `;
    new bootstrap.Modal(document.getElementById("viewDetailsModal")).show();
};

window.openAssignModal = function(complaintId) {
    document.getElementById("assign-complaint-id").value = complaintId;
    new bootstrap.Modal(document.getElementById("assignModal")).show();
};

window.openReassignModal = function(complaintId) {
    const c = complaintsData.find(comp => comp._id === complaintId);
    document.getElementById("reassign-complaint-id").value = complaintId;
    document.getElementById("reassign-current-off").textContent = c?.assignedOfficer?.name || "None";
    
    const select = document.getElementById("reassign-officer");
    select.innerHTML = '<option value="">Select New Officer...</option>' + 
        officersData.map(o => `<option value="${o._id}">${o.name} (${o.staffId || 'No ID'})</option>`).join('');
        
    new bootstrap.Modal(document.getElementById("reassignModal")).show();
};

function populateAssignOfficers() {
    const select = document.getElementById("assign-officer");
    if (!select) return;
    
    select.innerHTML = '<option value="">Select an Officer...</option>' + 
        officersData.map(o => `<option value="${o._id}">${o.name} (${o.staffId || 'No ID'})</option>`).join('');
}

function setupForms() {
    // Assign Form
    document.getElementById("assign-form")?.addEventListener("submit", async e => {
        e.preventDefault();
        const complaintId = document.getElementById("assign-complaint-id").value;
        const officerId = document.getElementById("assign-officer").value;

        try {
            const res = await fetch(`${API}/admin/assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify({ complaintId, officerId })
            });
            if (res.ok) {
                alert("Officer assigned successfully!");
                bootstrap.Modal.getInstance(document.getElementById("assignModal")).hide();
                loadDashboardData();
            } else { alert("Assignment failed."); }
        } catch (err) { console.error(err); }
    });

    // Reassign Form
    document.getElementById("reassign-form")?.addEventListener("submit", async e => {
        e.preventDefault();
        const complaintId = document.getElementById("reassign-complaint-id").value;
        const officerId = document.getElementById("reassign-officer").value;

        try {
            const res = await fetch(`${API}/admin/assign`, {
                method: "POST", // Backend uses same endpoint for both
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify({ complaintId, officerId })
            });
            if (res.ok) {
                alert("Officer reassigned successfully!");
                bootstrap.Modal.getInstance(document.getElementById("reassignModal")).hide();
                loadDashboardData();
            } else { alert("Reassignment failed."); }
        } catch (err) { console.error(err); }
    });

    // Add Officer Form
    document.getElementById("add-officer-form")?.addEventListener("submit", async e => {
        e.preventDefault();
        const officerData = {
            name: document.getElementById("off-name").value,
            email: document.getElementById("off-email").value,
            staffId: "off-" + document.getElementById("off-staffId").value,
            department: myDept,
            officerLevel: document.getElementById("off-level").value,
            password: document.getElementById("off-password").value,
            role: "officer"
        };

        try {
            const res = await fetch(`${API}/admin/officers`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token
                },
                body: JSON.stringify(officerData)
            });
            if (res.ok) {
                alert("Officer account created successfully!");
                const modalEl = document.getElementById("addOfficerModal");
                const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                modal.hide();
                loadDashboardData();
                document.getElementById("add-officer-form").reset();
            } else {
                const err = await res.json();
                alert(err.message || "Failed to create account.");
            }
        } catch (err) { console.error(err); }
    });

    // Concern Response Form
    document.getElementById("concern-response-form")?.addEventListener("submit", async e => {
        e.preventDefault();
        const concernId = document.getElementById("respond-concern-id").value;
        const response = document.getElementById("respond-concern-message").value;
        const status = document.getElementById("respond-concern-status").value;

        try {
            const res = await fetch(`${API}/concerns/${concernId}/respond`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify({ response, status })
            });

            if (res.ok) {
                alert("Response submitted successfully! It has been sent to the user.");
                bootstrap.Modal.getInstance(document.getElementById("concernResponseModal")).hide();
                loadDashboardData(); // Refresh UI
            } else {
                alert("Failed to submit response.");
            }
        } catch (err) { console.error(err); }
    });

    // Legal Notice Form
    document.getElementById("legal-notice-form")?.addEventListener("submit", async e => {
        e.preventDefault();
        const officerId = document.getElementById("notice-officer-id").value;
        const title = document.getElementById("notice-title").value;
        const content = document.getElementById("notice-content").value;

        try {
            const res = await fetch(`${API}/legal-notices`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify({ officerId, title, content })
            });
            if (res.ok) {
                alert("Notice dispatched successfully!");
                bootstrap.Modal.getInstance(document.getElementById("legalNoticeModal")).hide();
            } else { alert("Failed to send notice."); }
        } catch (err) { console.error(err); }
    });
}

window.openConcernResponseModal = function(id) {
    const con = concernsData.find(c => c._id === id);
    if (!con) return;

    document.getElementById("respond-concern-id").value = id;
    document.getElementById("respond-concern-text").textContent = con.description;
    document.getElementById("respond-concern-message").value = con.adminResponse || con.officerResponse || "";
    document.getElementById("respond-concern-status").value = con.status || "Open";
    
    new bootstrap.Modal(document.getElementById("concernResponseModal")).show();
};

window.openLegalNoticeModal = function(id, name) {
    document.getElementById("notice-officer-id").value = id;
    document.getElementById("notice-officer-name").textContent = name;
    document.getElementById("notice-title").value = "Official Inquiry regarding Performance";
    document.getElementById("notice-content").value = `Dear ${name},\n\nThis is an official notice from the ${myDept} Department Head regarding your recent activities. Please provide an explanation regarding the pending cases assigned to you.\n\nRegards,\n${myDept} Dept Head`;
    new bootstrap.Modal(document.getElementById("legalNoticeModal")).show();
};

/* =========================
   FILTERS
========================= */

function setupFilters() {
    const searchBox = document.getElementById("search-box");
    const statusFilter = document.getElementById("status-filter");

    const applyFilters = () => {
        const q = searchBox.value.toLowerCase();
        const s = statusFilter.value;

        const filtered = complaintsData.filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(q) || (c.complaintId && c.complaintId.toLowerCase().includes(q));
            const matchesStatus = s === "All" || c.status === s;
            return matchesSearch && matchesStatus;
        });

        renderComplaintsTable(filtered);
    };

    searchBox?.addEventListener("input", applyFilters);
    statusFilter?.addEventListener("change", applyFilters);
}

/* =========================
   HELPERS
========================= */

function getStatusColor(status) {
    if (status === "Submitted") return "warning";
    if (status === "Assigned") return "info";
    if (status === "In Progress") return "primary";
    if (status === "Resolved") return "success";
    return "secondary";
}

window.logout = function() {
    sessionStorage.clear();
    window.location.href = "../index.html";
};
