/**
 * Officer Dashboard JavaScript (Connected to Backend)
 */

const API = (window.API_BASE_URL || "http://localhost:7000") + "/api";
const token = sessionStorage.getItem("jwt");
const role = sessionStorage.getItem("role");

if (!token || role !== "officer") {
    alert("Access denied. Please login as an officer.");
    window.location.href = "../index.html";
}

// Show officer name and update profile icon
function updateProfileInfo() {
    const storedName = sessionStorage.getItem("userName") || "Officer";
    const storedDept = sessionStorage.getItem("department") || "";
    
    // Update all occurrences of the officer name
    const officerNameEls = document.querySelectorAll(".text-dark.fw-medium, #officer-display-name");
    officerNameEls.forEach(el => {
        if (el.id === "officer-display-name") {
            el.textContent = `Officer Portal: ${storedName} ${storedDept ? '(' + storedDept + ')' : ''}`;
        } else {
            el.textContent = storedName;
        }
    });

    // Update profile image
    const profileImgs = document.querySelectorAll("img[alt='Profile'], #off-prof-img");
    let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(storedName)}&background=198754&color=fff`;
    
    // Check role-specific storage to avoid collision with other portals
    let storedPhoto = sessionStorage.getItem("officerPhoto");
    
    // Sync from common profilePhoto if it was just set for this role
    if (!storedPhoto) {
        const commonPhoto = sessionStorage.getItem("profilePhoto");
        const storedRole = sessionStorage.getItem("role");
        if (commonPhoto && storedRole === "officer") {
            storedPhoto = commonPhoto;
            sessionStorage.setItem("officerPhoto", commonPhoto);
        }
    }

    if (storedPhoto && storedPhoto !== "undefined" && storedPhoto !== "") {
        if (storedPhoto.startsWith('http')) {
            avatarUrl = storedPhoto;
        } else {
            avatarUrl = `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${storedPhoto}`;
        }
    }
    
    profileImgs.forEach(img => {
        img.src = avatarUrl;
    });
}

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
        
        const badge = document.getElementById("noti-badge");
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? "block" : "none";
        }
        
        loadNotifications(notifications);
        
        // Check for new persistent alerts (Toast)
        const lastNotifId = localStorage.getItem("lastOfficerNotifId");
        if (notifications.length > 0 && notifications[0]._id !== lastNotifId && !notifications[0].isRead) {
            showToast(notifications[0].title, notifications[1] ? notifications[0].message : notifications[0].message);
            localStorage.setItem("lastOfficerNotifId", notifications[0]._id);
        }
    } catch (err) {
        console.error("Notif Error:", err);
    }
}

// Map notification type to redirect URL
function getRedirectUrl(n) {
    switch (n.type) {
        case 'concern_raised':    return 'citizen_concerns.html';
        case 'complaint_status':  return 'your_ratings.html';
        case 'assignment':        return 'index.html?section=assigned';
        case 'system_alert':      return 'admins_remarks.html';
        case 'legal_notice':      return 'index.html?section=legal-notices';
        default:                  return 'admins_remarks.html';
    }
}

function loadNotifications(notifications) {
    const citizenList = document.getElementById("citizen-noti-list");
    const adminList   = document.getElementById("admin-noti-list");
    if (!citizenList || !adminList) return;

    // Citizen = concern_raised, assignment, complaint_status (ratings)
    const citizenTypes = ['concern_raised', 'assignment', 'complaint_status'];
    const citizenNotifs = notifications.filter(n => citizenTypes.includes(n.type));
    const adminNotifs   = notifications.filter(n => !citizenTypes.includes(n.type));

    citizenList.innerHTML = citizenNotifs.length
        ? citizenNotifs.slice(0, 15).map(n => renderNotifItem(n)).join('')
        : `<div class="p-3 text-center text-muted small"><i class="bi bi-bell-slash fs-4 d-block mb-1"></i>No citizen alerts</div>`;

    adminList.innerHTML = adminNotifs.length
        ? adminNotifs.slice(0, 15).map(n => renderNotifItem(n)).join('')
        : `<div class="p-3 text-center text-muted small"><i class="bi bi-bell-slash fs-4 d-block mb-1"></i>No admin alerts</div>`;
}

function renderNotifItem(n) {
    const iconMap = {
        concern_raised:   { icon: 'bi-exclamation-circle-fill', color: 'text-warning' },
        complaint_status: { icon: 'bi-star-fill',               color: 'text-warning' },
        assignment:       { icon: 'bi-folder-check',            color: 'text-primary' },
        system_alert:     { icon: 'bi-megaphone-fill',          color: 'text-info'    },
        legal_notice:     { icon: 'bi-file-earmark-text-fill',  color: 'text-danger'  },
    };
    const icon = iconMap[n.type] || { icon: 'bi-bell-fill', color: 'text-secondary' };
    const timeStr = new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    const redirectUrl = getRedirectUrl(n);

    return `
    <div class="d-flex align-items-start p-2 border-bottom hover-bg notif-card ${n.isRead ? 'opacity-75' : ''}"
         style="cursor:pointer; transition: background 0.15s;"
         onclick="handleNotifClick('${n._id}','${redirectUrl}')">
        <div class="me-2 pt-1">
            <span class="badge rounded-pill bg-light border p-2">
                <i class="bi ${icon.icon} ${icon.color}" style="font-size:1rem;"></i>
            </span>
        </div>
        <div class="flex-grow-1 overflow-hidden">
            <div class="d-flex justify-content-between align-items-start">
                <span class="fw-semibold small ${n.isRead ? 'text-muted' : 'text-dark'}" style="font-size:0.82rem; line-height:1.3;">${n.title}</span>
                ${!n.isRead ? '<span class="badge rounded-pill bg-primary ms-1" style="font-size:0.5rem; padding:3px 5px;">NEW</span>' : ''}
            </div>
            <p class="mb-0 text-muted" style="font-size:0.72rem; line-height:1.4; white-space:normal;">${n.message}</p>
            <span class="text-muted" style="font-size:0.62rem;">${timeStr}</span>
        </div>
    </div>`;
}

async function handleNotifClick(id, redirectUrl) {
    try {
        await fetch(`${API}/notifications/${id}/read`, {
            method: "PUT",
            headers: { Authorization: "Bearer " + token }
        });
    } catch(e) { /* silent */ }
    // Navigate to the relevant page
    window.location.href = redirectUrl;
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

async function markAllAsRead() {
    try {
        await fetch(`${API}/notifications/read-all`, {
            method: "PUT",
            headers: { Authorization: "Bearer " + token }
        });
        fetchNotifications();
    } catch (err) { console.error(err); }
}

// Make global
window.markAsRead = markAsRead;
window.markAllAsRead = markAllAsRead;
window.handleNotifClick = handleNotifClick;

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
            <div class="toast-header bg-success text-white border-0">
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

document.addEventListener("DOMContentLoaded", () => {
    updateProfileInfo();

    // Notifications Initialization
    fetchNotifications();
    setInterval(fetchNotifications, 30000); // Polling every 30s

    // ---- Handle ?section= URL param for Legal Notices / sections from other pages ----
    const urlParams = new URLSearchParams(window.location.search);
    const sectionParam = urlParams.get('section');
    if (sectionParam) {
        // Store it for use once DOM and data are ready
        window._pendingSectionParam = sectionParam;
    }

    // ... handle all sidebar links ...

    // Sidebar toggle (desktop/mobile)
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const mobileToggleBtn = document.getElementById('mobile-sidebar-toggle');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        });
    }

    if (mobileToggleBtn) {
        mobileToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }

    // Handle all sidebar links
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            const href = link.getAttribute("href");
            const sectionId = link.getAttribute("data-section");

            if (sectionId) {
                e.preventDefault();
                // Remove active class from all links
                navLinks.forEach(l => l.classList.remove("active"));
                link.classList.add("active");
                
                filterComplaintsBySection(sectionId);
                
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove("show");
                }
            } else if (href === "#" || href === "") {
                e.preventDefault();
            }
        });
    });

    // Profile Button
    const profBtn = document.getElementById("offProfileBtn");
    if (profBtn) {
        profBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                const res = await fetch(`${API}/auth/me`, {
                    headers: { Authorization: "Bearer " + token }
                });
                const user = await res.json();

                document.getElementById("off-prof-id").textContent = user._id;
                document.getElementById("off-prof-staffId-val").textContent = user.staffId || "N/A";
                document.getElementById("off-prof-header-name").textContent = user.name;
                document.getElementById("off-prof-dept-badge").textContent = user.department || "General";
                
                document.getElementById("off-name-input").value = user.name;
                document.getElementById("off-email-input").value = user.email;
                document.getElementById("off-contact-input").value = user.contactNumber || "";
                document.getElementById("off-bio-input").value = user.bio || "";
                document.getElementById("off-password-input").value = "";
                
                // Update profile photo in modal
                let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=198754&color=fff&size=100`;
                if (user.profilePhoto) {
                    avatarUrl = user.profilePhoto.startsWith('http') ? user.profilePhoto : `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${user.profilePhoto}`;
                    sessionStorage.setItem("profilePhoto", user.profilePhoto);
                }
                document.getElementById("off-prof-img").src = avatarUrl;

                new bootstrap.Modal(document.getElementById("offProfileModal")).show();
            } catch (err) {
                console.error(err);
                alert("Failed to load profile");
            }
        });
    }

    // Profile Photo Preview
    const photoInput = document.getElementById("profile-photo-input");
    if (photoInput) {
        photoInput.addEventListener("change", function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById("off-prof-img").src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    const officerProfileForm = document.getElementById("officer-profile-form");
    if (officerProfileForm) {
        officerProfileForm.addEventListener("submit", async e => {
            e.preventDefault();
            try {
                const formData = new FormData();
                formData.append("name", document.getElementById("off-name-input").value);
                formData.append("email", document.getElementById("off-email-input").value);
                formData.append("contactNumber", document.getElementById("off-contact-input").value);
                formData.append("bio", document.getElementById("off-bio-input").value);
                
                const pass = document.getElementById("off-password-input").value;
                if (pass) formData.append("password", pass);
                
                const photoFile = document.getElementById("profile-photo-input").files[0];
                if (photoFile) formData.append("profilePhoto", photoFile);

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
                    sessionStorage.setItem("userEmail", data.user.email);
                    if (data.user.profilePhoto) {
                        sessionStorage.setItem("officerPhoto", data.user.profilePhoto);
                        sessionStorage.setItem("profilePhoto", data.user.profilePhoto);
                    }
                    bootstrap.Modal.getInstance(document.getElementById("offProfileModal")).hide();
                    location.reload(); 
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
    const settBtn = document.getElementById("offSettingsBtn");
    if (settBtn) {
        settBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const modal = new bootstrap.Modal(document.getElementById("offSettingsModal"));
            modal.show();
        });
    }

    /* =========================
       DARK MODE
    ========================= */

    const themeToggleBtn = document.getElementById("theme-toggle");
    const htmlElement = document.documentElement;

    const savedTheme = localStorage.getItem("theme") || "light";
    htmlElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            const currentTheme = htmlElement.getAttribute("data-theme");
            const newTheme = currentTheme === "light" ? "dark" : "light";
            htmlElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("theme", newTheme);
            updateThemeIcon(newTheme);
        });
    }

    function updateThemeIcon(theme) {
        if (!themeToggleBtn) return;
        const icon = themeToggleBtn.querySelector("i");
        if (theme === "dark") {
            icon.classList.remove("bi-moon-fill");
            icon.classList.add("bi-sun-fill");
        } else {
            icon.classList.remove("bi-sun-fill");
            icon.classList.add("bi-moon-fill");
        }
    }

    /* =========================
       COMPLAINTS DATA
    ========================= */

    let allComplaints = [];

    async function loadComplaints() {
        try {
            const res = await fetch(`${API}/complaints`, {
                headers: {
                    Authorization: "Bearer " + token
                }
            });

            if (!res.ok) throw new Error("Failed to fetch complaints");

            allComplaints = await res.json();
            renderComplaints(allComplaints);
            updateStats(allComplaints);
            fetchNotifications(); // Now fetches real notifications
        } catch (err) {
            console.error(err);
        }
    }

    async function loadLegalNotices() {
        const container = document.getElementById("legal-notices-container");
        if (!container) return;

        try {
            const res = await fetch(`${API}/legal-notices/mine`, {
                headers: { Authorization: "Bearer " + token }
            });

            if (!res.ok) throw new Error("Failed to fetch legal notices");

            const data = await res.json();
            const notices = data.notices;

            let html = "";
            if (notices.length === 0) {
                html = '<div class="col-12 text-center py-5 text-muted"><i class="bi bi-inbox fs-1 d-block mb-3"></i>No legal notices found.</div>';
            } else {
                notices.forEach(n => {
                    html += `
                    <div class="col-md-6 mb-3">
                        <div class="card border-warning shadow-sm">
                            <div class="card-header bg-warning text-dark fw-bold">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i> ${n.title}
                            </div>
                            <div class="card-body">
                                <p class="card-text">${n.content}</p>
                                <hr>
                                <div class="d-flex justify-content-between align-items-center">
                                    <small class="text-muted">Status: <span class="badge ${n.status === 'Read' ? 'bg-success' : 'bg-danger'}">${n.status}</span></small>
                                    <small class="text-muted text-end">Received: ${new Date(n.createdAt).toLocaleDateString()}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    `;
                });
            }
            container.innerHTML = html;
        } catch (err) {
            console.error(err);
            container.innerHTML = '<div class="col-12 text-center py-4 text-danger">Failed to load legal notices.</div>';
        }
    }

    /* =========================
       NOTIFICATIONS SYSTEM
    ========================= */
    async function fetchNotifications() {
        const citizenList = document.getElementById("citizen-noti-list");
        const adminList = document.getElementById("admin-noti-list");
        const badge = document.getElementById("noti-badge");

        if (!citizenList || !adminList || !badge) return;

        try {
            const res = await fetch(`${API}/notifications`, {
                headers: { Authorization: "Bearer " + token }
            });
            if (!res.ok) throw new Error("Failed to fetch notifications");

            const notifications = await res.json();
            
            // Separate notifications into Admin and Citizen based on type
            const citizenAlerts = notifications.filter(n => ['concern_raised', 'assignment', 'complaint_status'].includes(n.type));
            const adminAlerts = notifications.filter(n => !['concern_raised', 'assignment', 'complaint_status'].includes(n.type));

            // Set Badge (Unread only)
            const unreadCount = notifications.filter(n => !n.isRead).length;
            if (unreadCount > 0) {
                badge.style.display = 'inline-block';
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            } else {
                badge.style.display = 'none';
            }

            if (citizenAlerts.length > 0) {
                citizenList.innerHTML = citizenAlerts.map(a => {
                    const complaintId = a.message.match(/ID: ([A-Z0-9]+)/) ? a.message.match(/ID: ([A-Z0-9]+)/)[1] : null;
                    return `
                    <div class="border-bottom p-2 text-start ${!a.isRead ? 'bg-light' : ''}" 
                         onclick="handleNotificationClick('${a._id}', '${a.type}', '${complaintId}')" style="cursor: pointer;">
                        <p class="mb-1 fw-bold text-dark" style="font-size: 0.85rem;">${a.message}</p>
                        <small class="text-muted" style="font-size: 0.75rem;">${new Date(a.createdAt).toLocaleString()}</small>
                    </div>
                `;}).join("");
            } else {
                citizenList.innerHTML = '<div class="text-center text-muted small py-3">No new citizen alerts</div>';
            }

            // Render admin alerts
            if (adminAlerts.length > 0) {
                adminList.innerHTML = adminAlerts.map(a => {
                    const complaintId = a.message.match(/ID: ([A-Z0-9]+)/) ? a.message.match(/ID: ([A-Z0-9]+)/)[1] : null;
                    return `
                    <div class="border-bottom p-2 text-start ${!a.isRead ? 'bg-light' : ''}"
                         onclick="handleNotificationClick('${a._id}', '${a.type}', '${complaintId}')" style="cursor: pointer;">
                        <p class="mb-1 fw-bold text-danger" style="font-size: 0.85rem;"><i class="bi bi-exclamation-circle-fill me-1"></i>${a.message}</p>
                        <small class="text-muted" style="font-size: 0.75rem;">${new Date(a.createdAt).toLocaleString()}</small>
                    </div>
                `;}).join("");
            } else {
                adminList.innerHTML = '<div class="text-center text-muted small py-3">No new admin alerts</div>';
            }
        } catch (err) {
            console.error("Notifications fetch error:", err);
        }
    }

    async function handleNotificationClick(notifId, type, complaintId) {
        try {
            await markAsRead(notifId);
            
            if (complaintId) {
                // Find the full MongoDB ID
                const fullComplaint = allComplaints.find(c => (c.complaintId === complaintId || c._id === complaintId));
                if (fullComplaint) {
                    openViewDetailsModal(fullComplaint._id);
                }
            } else if (type === 'legal_notice' || type === 'legal') {
                filterComplaintsBySection('legal-notices');
            }
        } catch (err) {
            console.error("Error handling notification click:", err);
        }
    }

    async function markAsRead(id) {
        try {
            const res = await fetch(`${API}/notifications/${id}/read`, {
                method: "PUT",
                headers: { Authorization: "Bearer " + token }
            });
            if (res.ok) fetchNotifications();
        } catch (err) {
            console.error("Error marking as read:", err);
        }
    }

    function renderComplaints(complaints) {
        const tbody = document.getElementById("dynamic-table-body");
        if (!tbody) return;

        let html = "";
        if (complaints.length === 0) {
            html = '<tr><td colspan="7" class="text-center py-4">No complaints found.</td></tr>';
        } else {
            complaints.slice(0, 4).forEach(c => {
                let badgeClass = "bg-secondary";
                if (c.status === "Assigned") badgeClass = "bg-warning text-dark";
                if (c.status === "Pending") badgeClass = "bg-info text-dark";
                if (c.status === "In Progress") badgeClass = "bg-primary text-white";
                if (c.status === "Resolved" || c.status === "Closed") badgeClass = "bg-success text-white";

                let ratingHtml = '<span class="text-muted small">Not Rated</span>';
                if (c.rating) {
                    ratingHtml = '<div class="text-warning">';
                    for (let i = 1; i <= 5; i++) {
                        ratingHtml += i <= c.rating ? '<i class="bi bi-star-fill"></i>' : '<i class="bi bi-star"></i>';
                    }
                    ratingHtml += '</div>';
                }

                const concernIcon = c.hasConcern ? '<i class="bi bi-exclamation-triangle-fill text-danger ms-2" title="Citizen Concern Raised"></i>' : '';

                html += `
                <tr>
                    <td><strong>${c.complaintId || (c._id ? c._id.substring(0, 8).toUpperCase() : 'N/A')}</strong> ${concernIcon}</td>
                    <td>${c.citizenName || c.user?.name || "Citizen"}</td>
                    <td>
                        <div class="fw-bold">${c.title}</div>
                        <div class="small text-muted">${new Date(c.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td><span class="badge ${badgeClass}">${c.status}</span></td>
                    <td><span class="badge bg-light text-dark border">${c.priority || "Medium"}</span></td>
                    <td>${ratingHtml}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary view-details-btn" data-id="${c._id}" title="View Details">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="viewConcerns('${c._id}')" title="View Concerns">
                                <i class="bi bi-exclamation-octagon"></i>
                            </button>
                            ${(c.status !== 'Resolved' && c.status !== 'Closed') ? `
                            <button class="btn btn-sm btn-success update-btn" data-id="${c._id}">
                                Update
                            </button>` : ''}
                        </div>
                    </td>
                </tr>
                `;
            });
        }

        tbody.innerHTML = html;

        // Attach event listeners
        document.querySelectorAll(".update-btn").forEach(btn => {
            btn.addEventListener("click", () => openUpdateModal(btn.dataset.id));
        });

        document.querySelectorAll(".view-details-btn").forEach(btn => {
            btn.addEventListener("click", () => openViewDetailsModal(btn.dataset.id));
        });
    }

    function filterComplaintsBySection(section) {
        document.getElementById("dashboard-section").classList.remove("d-none");
        document.getElementById("legal-notices-section").classList.add("d-none");

        if (section === "legal-notices") {
            document.getElementById("dashboard-section").classList.add("d-none");
            document.getElementById("legal-notices-section").classList.remove("d-none");
            loadLegalNotices();
            return;
        }

        let filtered = allComplaints;
        let title = "Total Assigned Complaints";

        if (section === "assigned") {
            filtered = allComplaints; // Show everything assigned to them
            title = "All Assigned Complaints";
        } else if (section === "pending") {
            filtered = allComplaints.filter(c => c.status === "Pending" || c.status === "In Progress" || c.status === "Assigned");
            title = "Pending / Active Complaints";
        }

        document.getElementById("dynamic-table-title").textContent = title;
        renderComplaints(filtered);
    }

    window.showTable = function(type) {
        let filtered = allComplaints;
        let title = type;

        if (type === 'Assigned Cases') {
            filtered = allComplaints; 
            title = "All Assigned Cases";
        } else if (type === 'Pending Cases') {
            filtered = allComplaints.filter(c => c.status === "Pending" || c.status === "In Progress" || c.status === "Assigned");
            title = "Pending Cases";
        } else if (type === 'Solved Cases') {
            filtered = allComplaints.filter(c => c.status === "Resolved" || c.status === "Closed");
            title = "Solved Cases";
        }
        
        document.getElementById("dynamic-table-title").textContent = title;
        renderComplaints(filtered);
    };

    function updateStats(complaints) {
        const total = complaints.length;
        // Assigned Cases Card: Total number of cases assigned to this officer
        const assigned = total; 
        // Pending Cases Card: Those not yet resolved/closed
        const pending = complaints.filter(c => c.status === "Assigned" || c.status === "Pending" || c.status === "In Progress").length;
        // Solved Cases Card: Those finished
        const solved = complaints.filter(c => c.status === "Resolved" || c.status === "Closed").length;

        const ratedComplaints = complaints.filter(c => c.rating);
        const avgRating = ratedComplaints.length > 0 
            ? (ratedComplaints.reduce((acc, c) => acc + c.rating, 0) / ratedComplaints.length).toFixed(1)
            : "0.0";

        if (document.getElementById("card-avg-rating")) document.getElementById("card-avg-rating").textContent = avgRating;
        if (document.getElementById("card-assigned-cases")) document.getElementById("card-assigned-cases").textContent = assigned;
        if (document.getElementById("card-pending-cases")) document.getElementById("card-pending-cases").textContent = pending;
        if (document.getElementById("card-solved-cases")) document.getElementById("card-solved-cases").textContent = solved;

        // Populate Priority Page if on that page
        renderPriorityPage(complaints);
        
        // Populate Performance Page if on that page
        renderPerformancePage(complaints);
    }

    function renderPriorityPage(complaints) {
        const tbody = document.getElementById("priority-table-body");
        if (!tbody) return;

        const highCount = complaints.filter(c => c.priority === 'High').length;
        const mediumCount = complaints.filter(c => c.priority === 'Medium').length;
        const lowCount = complaints.filter(c => c.priority === 'Low').length;
        
        if (document.getElementById('card-high')) document.getElementById('card-high').textContent = highCount;
        if (document.getElementById('card-medium')) document.getElementById('card-medium').textContent = mediumCount;
        if (document.getElementById('card-low')) document.getElementById('card-low').textContent = lowCount;

        let html = "";
        if (complaints.length === 0) {
            html = '<tr><td colspan="6" class="text-center py-4">No cases found.</td></tr>';
        } else {
            // Sort by priority (High > Medium > Low) then by date
            const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
            const sorted = [...complaints].sort((a, b) => {
                const pA = priorityOrder[a.priority || 'Medium'];
                const pB = priorityOrder[b.priority || 'Medium'];
                if (pA !== pB) return pA - pB;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            sorted.forEach(c => {
                let badgeClass = "bg-secondary";
                if (c.status === "Assigned") badgeClass = "bg-warning text-dark";
                if (c.status === "Pending") badgeClass = "bg-info text-dark";
                if (c.status === "In Progress") badgeClass = "bg-primary text-white";
                if (c.status === "Resolved" || c.status === "Closed") badgeClass = "bg-success text-white";

                let priorityIcon = '';
                let priorityTextClass = '';
                if (c.priority === 'High') { priorityIcon = '🔴 High'; priorityTextClass = 'text-danger fw-bold'; }
                else if (c.priority === 'Low') { priorityIcon = '🟢 Low'; priorityTextClass = 'text-success fw-bold'; }
                else { priorityIcon = '🟠 Medium'; priorityTextClass = 'text-warning fw-bold'; }

                html += `
                    <tr>
                        <td class="fw-medium">${c.complaintId || c._id.substring(0,8).toUpperCase()}</td>
                        <td>${c.citizenName || c.user?.name || 'Anonymous'}</td>
                        <td>${c.title}</td>
                        <td class="${priorityTextClass}">${priorityIcon}</td>
                        <td><span class="badge ${badgeClass}">${c.status}</span></td>
                        <td>${new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                `;
            });
        }
        tbody.innerHTML = html;
    }

    function renderPerformancePage(complaints) {
        if (!document.getElementById("perf-percentage")) return;

        const total = complaints.length;
        const pending = complaints.filter(c => (c.status === 'Assigned' || c.status === 'Pending' || c.status === 'In Progress')).length;
        const solved = complaints.filter(c => (c.status === 'Resolved' || c.status === 'Closed')).length;
        
        const perf = total > 0 ? Math.round((solved / total) * 100) : 0;
        
        document.getElementById('perf-percentage').textContent = perf + '%';
        document.getElementById('perf-assigned').textContent = total;
        document.getElementById('perf-pending').textContent = pending;
        document.getElementById('perf-solved').textContent = solved;
    }

    /* =========================
       MODALS
    ========================= */

    function openUpdateModal(id) {
        const complaint = allComplaints.find(c => c._id === id);
        if (!complaint) return;

        document.getElementById("update-complaint-id").value = id;
        document.getElementById("display-complaint-id").textContent = complaint.complaintId || id.substring(0,8);
        document.getElementById("new-status").value = complaint.status === "Submitted" ? "Pending" : complaint.status;
        
        const statusSelect = document.getElementById("new-status");
        const resImgContainer = document.getElementById("resolution-img-container");
        
        // Initial check
        if(statusSelect.value === 'Resolved') resImgContainer.style.display = 'block';
        else resImgContainer.style.display = 'none';

        statusSelect.addEventListener("change", () => {
            if(statusSelect.value === 'Resolved') resImgContainer.style.display = 'block';
            else resImgContainer.style.display = 'none';
        });

        const modal = new bootstrap.Modal(document.getElementById("updateStatusModal"));
        modal.show();
    }

    function openViewDetailsModal(id) {
        const complaint = allComplaints.find(c => c._id === id);
        if (!complaint) return;

        // Create or get view details modal
        let modalEl = document.getElementById("viewDetailsModal");
        if (!modalEl) {
            modalEl = document.createElement("div");
            modalEl.id = "viewDetailsModal";
            modalEl.className = "modal fade";
            modalEl.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content border-0 shadow">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">Complaint Details</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="view-details-content"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modalEl);
        }

        const content = document.getElementById("view-details-content");
        const imgVal = complaint.image;
        const imageUrl = imgVal ? (imgVal.startsWith('http') ? imgVal : `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${imgVal}`) : null;

        content.innerHTML = `
            <div class="row g-4">
                <div class="col-md-6">
                    <h6 class="fw-bold text-muted small text-uppercase">Citizen Information</h6>
                    <div class="p-3 bg-light rounded mb-4">
                        <p class="mb-1"><strong>Name:</strong> ${complaint.citizenName || complaint.user?.name || 'Anonymous'}</p>
                        <p class="mb-0"><strong>Email:</strong> ${complaint.user?.email || 'N/A'}</p>
                    </div>

                    <h6 class="fw-bold text-muted small text-uppercase">Complaint Information</h6>
                    <div class="p-3 bg-light rounded">
                        <p class="mb-1"><strong>ID:</strong> ${complaint.complaintId || id}</p>
                        <p class="mb-1"><strong>Category:</strong> ${complaint.category}</p>
                        <p class="mb-1"><strong>Status:</strong> <span class="badge bg-primary">${complaint.status}</span></p>
                        <p class="mb-1"><strong>Date:</strong> ${new Date(complaint.createdAt).toLocaleString()}</p>
                        <hr>
                        <p class="mb-1"><strong>Title:</strong> ${complaint.title}</p>
                        <p class="mb-0"><strong>Description:</strong> ${complaint.description}</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <h6 class="fw-bold text-muted small text-uppercase">Uploaded Image</h6>
                    ${imageUrl ? 
                        `<img src="${imageUrl}" class="img-fluid rounded border w-100 shadow-sm" style="max-height: 400px; object-fit: contain;" onerror="this.src='https://placehold.co/600x400?text=Image+Not+Found'">` : 
                        `<div class="border rounded d-flex align-items-center justify-content-center bg-light text-muted" style="height: 200px;">
                            <div><i class="bi bi-image fs-1 d-block text-center"></i> No Image Provided</div>
                         </div>`
                    }
                    
                    <h6 class="fw-bold text-muted small text-uppercase mt-4">Location</h6>
                    <p class="p-3 bg-light rounded"><i class="bi bi-geo-alt me-2"></i>${complaint.location || 'Not provided'}</p>
                </div>
            </div>

            ${complaint.status === 'Resolved' || complaint.status === 'Closed' ? `
            <div class="mt-4 border-top pt-4">
                <h6 class="fw-bold text-muted small text-uppercase mb-3">Resolution Proof</h6>
                <div class="row">
                    <div class="col-md-6">
                        ${complaint.resolutionImage ? 
                            (() => {
                                const resImg = complaint.resolutionImage;
                                const resUrl = resImg.startsWith('http') ? resImg : `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${resImg}`;
                                return `<img src="${resUrl}" class="img-fluid rounded border shadow-sm" style="max-height: 250px; object-fit: contain;">`;
                            })() : 
                            `<div class="p-3 bg-light text-muted rounded text-center small">No image uploaded for resolution.</div>`
                        }
                    </div>
                    <div class="col-md-6">
                         <p class="small text-muted mb-1"><strong>Remarks:</strong></p>
                         <p class="p-2 bg-light rounded small">${complaint.remarks || 'No remarks provided.'}</p>
                    </div>
                </div>
            </div>
            ` : ''}
        `;

        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }

    /* =========================
       API SUBMITS
    ========================= */

    const updateForm = document.getElementById("update-status-form");
    if (updateForm) {
        updateForm.addEventListener("submit", async e => {
            e.preventDefault();
            const id = document.getElementById("update-complaint-id").value;
            const status = document.getElementById("new-status").value;
            const remarks = document.getElementById("action-remarks").value;
            const resImg = document.getElementById("resolution-img").files[0];

            const formData = new FormData();
            formData.append("status", status);
            formData.append("remarks", remarks);
            if(resImg) formData.append("resolutionImage", resImg);

            try {
                const res = await fetch(`${API}/complaints/${id}/status`, {
                    method: "PUT",
                    headers: {
                        Authorization: "Bearer " + token
                    },
                    body: formData
                });

                if (!res.ok) throw new Error("Update failed");

                bootstrap.Modal.getInstance(document.getElementById("updateStatusModal")).hide();
                alert("Complaint updated successfully");
                updateForm.reset();
                document.getElementById("resolution-img-container").style.display = 'none';
                loadComplaints();
            } catch (err) {
                console.error(err);
                alert("Update failed");
            }
        });
    }

    function renderRatingsPage(complaints) {
        const ratedComplaints = complaints.filter(c => c.rating).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        if (!document.getElementById("avg-rating-val")) return;

        const total = ratedComplaints.length;
        const sum = ratedComplaints.reduce((acc, c) => acc + c.rating, 0);
        const avg = total > 0 ? (sum / total).toFixed(1) : "0.0";

        // Update Average Card
        document.getElementById("avg-rating-val").innerHTML = `${avg}<span class="fs-4 text-muted">/5</span>`;
        document.getElementById("total-reviews-text").textContent = `Based on ${total} Citizen Reviews`;

        // Update Stars
        const starContainer = document.getElementById("avg-rating-stars");
        let starHtml = "";
        const fullStars = Math.floor(avg);
        const hasHalf = avg % 1 >= 0.5;
        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) starHtml += '<i class="bi bi-star-fill"></i> ';
            else if (i === fullStars + 1 && hasHalf) starHtml += '<i class="bi bi-star-half"></i> ';
            else starHtml += '<i class="bi bi-star"></i> ';
        }
        starContainer.innerHTML = starHtml;

        // Update Progress Bars
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        ratedComplaints.forEach(c => counts[c.rating]++);
        
        for (let i = 1; i <= 5; i++) {
            const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
            const bar = document.getElementById(`bar-${i}`);
            const pctText = document.getElementById(`pct-${i}`);
            if (bar) bar.style.width = `${pct}%`;
            if (pctText) pctText.textContent = `${pct}%`;
        }

        // Update Recent Feedback Table
        const tbody = document.getElementById("ratings-table-body");
        if (tbody) {
            let tableHtml = "";
            if (total === 0) {
                tableHtml = '<tr><td colspan="5" class="text-center py-4">No reviews yet.</td></tr>';
            } else {
                ratedComplaints.forEach(c => {
                    let stars = "";
                    for(let i=1; i<=5; i++) stars += `<i class="bi bi-star${i <= c.rating ? '-fill' : ''}"></i>`;
                    
                    tableHtml += `
                    <tr>
                        <td>
                            <div class="small fw-bold">${new Date(c.updatedAt || c.createdAt).toLocaleDateString()}</div>
                            <div class="tiny text-muted">${new Date(c.updatedAt || c.createdAt).toLocaleTimeString()}</div>
                        </td>
                        <td>
                            <div class="fw-bold">${c.citizenName || c.user?.name || 'Anonymous'}</div>
                        </td>
                        <td>
                            <div class="fw-bold text-primary">${c.complaintId || c._id.substring(0,8).toUpperCase()}</div>
                            <div class="small text-muted">${c.title || ''}</div>
                        </td>
                        <td class="text-warning">${stars}</td>
                        <td>
                            <div class="p-2 bg-light rounded small fst-italic shadow-sm" style="word-break: break-word; white-space: pre-wrap;">
                                "${c.feedback || 'No comments provided.'}"
                            </div>
                        </td>
                    </tr>
                    `;
                });
            }
            tbody.innerHTML = tableHtml;
        }
    }

    /* =========================
       INIT
    ========================= */
    window.filterComplaintsBySection = filterComplaintsBySection;

    loadComplaints().then(() => {
        if (document.getElementById("avg-rating-val")) {
            renderRatingsPage(allComplaints);
        }
        // Handle ?section= URL param after data loads
        if (window._pendingSectionParam) {
            filterComplaintsBySection(window._pendingSectionParam);
            window._pendingSectionParam = null;
        }
    });
});

/* =========================
   CONCERNS
========================= */

window.viewConcerns = async function(complaintId) {
    const container = document.getElementById('concerns-list-container');
    if (!container) return;
    
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
            <div class="card mb-3 border-0 shadow-sm border-start border-4 border-info">
                <div class="card-body">
                    <div class="d-flex justify-content-between mb-2">
                        <h6 class="fw-bold mb-0">${c.user?.name || 'Citizen'}</h6>
                        <small class="text-muted">${new Date(c.createdAt).toLocaleString()}</small>
                    </div>
                    <p class="mb-3">${c.description}</p>
                    ${imageUrl ? `<img src="${imageUrl}" class="img-fluid rounded mb-3" style="max-height: 200px;">` : ''}
                    <div class="d-flex justify-content-between align-items-center bg-light p-2 rounded small">
                        <span><strong>Status:</strong> ${c.status}</span>
                        ${c.adminResponse ? `<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Admin Responded</span>` : ''}
                    </div>
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

window.logout = function () {
    sessionStorage.removeItem("jwt");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("department");
    window.location.href = "../index.html";
};

// =====================
// FORGOT PASSWORD FLOW
// =====================
function openForgotPassword() {
    // Hide profile modal if open
    const profileModal = bootstrap.Modal.getInstance(document.getElementById("offProfileModal"));
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

/* =========================
   LEGAL NOTICES (OFFICER)
========================= */

async function loadLegalNotices() {
    try {
        const res = await fetch(`${API}/legal-notices/mine`, {
            headers: { Authorization: "Bearer " + token }
        });
        if (res.ok) {
            const data = await res.json();
            renderOfficerLegalNotices(data.notices);
        }
    } catch (err) {
        console.error("Failed to load legal notices", err);
    }
}

function renderOfficerLegalNotices(notices) {
    const tbody = document.getElementById("officer-legal-notices-tbody");
    if (!tbody) return;

    if (notices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No legal notices received.</td></tr>';
        return;
    }

    let html = "";
    notices.forEach(ln => {
        let statusBadge = "bg-danger"; // Pending
        if (ln.status === "Read") statusBadge = "bg-warning text-dark";
        if (ln.status === "Responded") statusBadge = "bg-success";

        const date = new Date(ln.createdAt).toLocaleDateString();
        const displayComplaint = ln.complaint ? ln.complaint.complaintId : `<span class="text-muted small">General Notice</span>`;

        html += `
        <tr class="${ln.status === 'Pending' ? 'table-danger bg-opacity-10' : ''}">
            <td><div class="fw-bold">${ln.title}</div></td>
            <td>${displayComplaint}</td>
            <td><span class="badge ${statusBadge}">${ln.status}</span></td>
            <td>${date}</td>
            <td>
                <button class="btn btn-sm btn-danger respond-notice-btn" 
                    data-id="${ln._id}" 
                    data-title="${ln.title}" 
                    data-content="${ln.content.replace(/"/g, '&quot;')}"
                    data-date="${date}"
                    data-status="${ln.status}"
                    data-response="${ln.officerResponse || ''}">
                    ${ln.status === 'Responded' ? 'View/Edit Response' : 'Respond Now'}
                </button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;

    // Attach event listeners for the respond buttons
    document.querySelectorAll(".respond-notice-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const id = this.dataset.id;
            
            // Mark as read if pending
            if (this.dataset.status === 'Pending') {
                markNoticeAsRead(id);
            }

            document.getElementById("rn-notice-id").value = id;
            document.getElementById("rn-title").textContent = this.dataset.title;
            document.getElementById("rn-date").textContent = "Received: " + this.dataset.date;
            document.getElementById("rn-content").textContent = this.dataset.content;
            document.getElementById("rn-response-text").value = this.dataset.response || '';
            
            new bootstrap.Modal(document.getElementById("respondNoticeModal")).show();
        });
    });
}

async function markNoticeAsRead(id) {
    try {
        await fetch(`${API}/legal-notices/${id}/read`, {
            method: 'PUT',
            headers: { Authorization: "Bearer " + token }
        });
        fetchNotifications(); // Update badges since a notice notification might be cleared
    } catch (err) {
        console.error("Error marking notice as read", err);
    }
}

// Handle response submission
const respondForm = document.getElementById("respond-notice-form");
if (respondForm) {
    respondForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const noticeId = document.getElementById("rn-notice-id").value;
        const responseText = document.getElementById("rn-response-text").value.trim();

        if (!responseText) {
            alert("Please enter a response.");
            return;
        }

        try {
            const res = await fetch(`${API}/legal-notices/${noticeId}/respond`, {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token 
                },
                body: JSON.stringify({ response: responseText })
            });

            if (res.ok) {
                alert("Response submitted successfully to Administration.");
                bootstrap.Modal.getInstance(document.getElementById("respondNoticeModal")).hide();
                loadLegalNotices();
            } else {
                const data = await res.json();
                alert(data.message || "Failed to submit response.");
            }
        } catch (err) {
            console.error("Response error:", err);
            alert("Error submitting response.");
        }
    });
}
