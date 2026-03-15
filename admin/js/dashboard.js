/**
 * Admin Dashboard JavaScript
 * Connected to Node.js Backend
 */

const API = "http://localhost:7000/api";
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
});

function updateProfileInfo() {
    const storedName = sessionStorage.getItem("userName") || "Admin";
    
    // Greeting
    const adminGreeting = document.getElementById("admin-greeting");
    if (adminGreeting) adminGreeting.textContent = `Hello, ${storedName}`;

    // Sidebar & Profile Dropdown
    const adminNameEls = document.querySelectorAll(".text-dark.fw-medium");
    adminNameEls.forEach(el => el.textContent = storedName);

    // Profile Image
    const profileImgs = document.querySelectorAll("img[alt='Profile']");
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(storedName)}&background=0d6efd&color=fff`;
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
                document.getElementById("admin-prof-img").src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0d6efd&color=fff&size=100`;

                new bootstrap.Modal(document.getElementById("adminProfileModal")).show();
            } catch (err) {
                console.error(err);
                alert("Failed to load profile");
            }
        });
    }

    const adminProfileForm = document.getElementById("admin-profile-form");
    if (adminProfileForm) {
        adminProfileForm.addEventListener("submit", async e => {
            e.preventDefault();
            const payload = {
                name: document.getElementById("admin-name-input").value,
                email: document.getElementById("admin-email-input").value,
                bio: document.getElementById("admin-bio-input").value
            };
            const pass = document.getElementById("admin-password-input").value;
            if (pass) payload.password = pass;

            try {
                const res = await fetch(`${API}/auth/profile`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + token
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const data = await res.json();
                    alert("Profile updated successfully");
                    sessionStorage.setItem("userName", data.user.name);
                    sessionStorage.setItem("userEmail", data.user.email);
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
        "settings-section"
    ];

    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("d-none");
    });

    const target = document.getElementById(sectionId + "-section");
    if (target) target.classList.remove("d-none");
    
    // Refresh data if needed when switching to specific sections
    if (sectionId === 'analytics') renderAnalytics();
    if (sectionId === 'departments') renderDepartments();
};

/* =========================
   LOAD DATA FROM BACKEND
========================= */

async function loadDashboardData() {
    try {
        const [complaintsRes, officersRes] = await Promise.all([
            fetch(`${API}/complaints`, { headers: { Authorization: "Bearer " + token } }),
            fetch(`${API}/admin/officers`, { headers: { Authorization: "Bearer " + token } })
        ]);

        if (!complaintsRes.ok || !officersRes.ok) throw new Error("Failed to fetch data");

        const complaintsJson = await complaintsRes.json();
        const officersJson = await officersRes.json();

        complaintsData = complaintsJson.complaints || complaintsJson;
        officersData = officersJson.officers || officersJson;
        
        // Extract unique departments
        departmentsData = [...new Set(officersData.map(o => o.department).filter(Boolean))];

        renderComplaints();
        renderOfficers();
        updateStats();
        renderRecentActivity();
        populateDepartmentFilters();
        renderDepartments();

    } catch (err) {
        console.error("Dashboard load error:", err);
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
                <button class="btn btn-sm btn-outline-danger" onclick="terminateOfficer('${o._id}', '${o.name}')" title="Terminate Officer">
                    <i class="bi bi-person-x-fill me-1"></i> Terminate
                </button>
            </td>
        </tr>
        `;
    });

    tbody.innerHTML = html;
}

/* =========================
   STATS & ANALYTICS
========================= */

function updateStats() {
    const total = complaintsData.length;
    const pending = complaintsData.filter(c => c.status === "Submitted" || c.status === "In Progress").length;
    const assigned = complaintsData.filter(c => c.status === "Assigned" || c.status === "In Progress" || c.status === "Resolved").length;
    const unassigned = complaintsData.filter(c => !c.assignedOfficer).length;

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
    // Basic Chart.js initialization for analytics
    const ctxDept = document.getElementById('detailedDeptChart');
    if (ctxDept) {
        const deptCounts = {};
        complaintsData.forEach(c => {
            deptCounts[c.category] = (deptCounts[c.category] || 0) + 1;
        });

        new Chart(ctxDept, {
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

        new Chart(ctxStatus, {
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
        const trendData = {};
        complaintsData.forEach(c => {
            const month = new Date(c.createdAt).toLocaleString('default', { month: 'short' });
            trendData[month] = (trendData[month] || 0) + 1;
        });

        new Chart(ctxTrend, {
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
        const deptResData = {};
        complaintsData.forEach(c => {
            if (!deptResData[c.category]) deptResData[c.category] = { total: 0, resolved: 0 };
            deptResData[c.category].total++;
            if (c.status === 'Resolved') deptResData[c.category].resolved++;
        });

        new Chart(ctxRes, {
            type: 'bar',
            data: {
                labels: Object.keys(deptResData),
                datasets: [{
                    label: 'Resolution Rate (%)',
                    data: Object.keys(deptResData).map(k => (deptResData[k].resolved / deptResData[k].total * 100).toFixed(1)),
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

    const depts = [
        { name: "Roads & Infrastructure", icon: "bi-hammer", desc: "Handles road repairs, potholes, and infrastructure complaints." },
        { name: "Water Supply", icon: "bi-droplet-fill", desc: "Manages water supply issues and drainage." },
        { name: "Electricity Issue", icon: "bi-lightning-charge-fill", desc: "Handles power outages and electrical issues." },
        { name: "Garbage Issue", icon: "bi-trash3-fill", desc: "Manages garbage collection and sanitation." },
        { name: "Cyber Crime", icon: "bi-shield-lock-fill", desc: "Handles online fraud and cyber complaints." },
        { name: "Law & Order", icon: "bi-shield-shaded", desc: "General law enforcement complaints." },
        { name: "Public Safety", icon: "bi-people-fill", desc: "Handles harassment and public safety issues." },
        { name: "Land & Revenue", icon: "bi-map-fill", desc: "Handles land disputes and revenue matters." },
        { name: "General Administration", icon: "bi-gear-wide-connected", desc: "Handles miscellaneous complaints." }
    ];

    let html = "";
    depts.forEach((d, index) => {
        const count = officersData.filter(o => o.department === d.name).length;
        html += `
        <div class="col-md-4 mb-4">
            <div class="card h-100 department-card shadow-sm border-0" onclick="viewOfficers('${d.name}')" style="cursor: pointer;">
                <div class="card-body">
                    <div class="dept-icon-circle">
                        <i class="bi ${d.icon}"></i>
                    </div>
                    <h5 class="fw-bold mb-2">${d.name}</h5>
                    <p class="text-muted small mb-3">${d.desc}</p>
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
    const imageUrl = complaint.image ? `http://localhost:7000/uploads/${complaint.image}` : null;

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
                        `<img src="http://localhost:7000/uploads/${complaint.resolutionImage}" class="img-fluid rounded border w-100 shadow-sm" style="max-height: 250px; object-fit: contain;">` : 
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
        deptSelector.innerHTML += `<li><a class="dropdown-item" href="#" onclick="filterByDept('${dept}')">${dept}</a></li>`;
    });
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

    const modal = new bootstrap.Modal(document.getElementById("terminationModal"));
    modal.show();

    document.getElementById("confirm-termination").onchange = function() {
        if(this.checked) document.getElementById("confirm-terminate-btn").classList.remove("disabled");
        else document.getElementById("confirm-terminate-btn").classList.add("disabled");
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
    sessionStorage.clear();
    window.location.href = "../index.html";
};