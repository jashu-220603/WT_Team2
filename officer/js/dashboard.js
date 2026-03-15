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
    const profileImgs = document.querySelectorAll("img[alt='Profile']");
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(storedName)}&background=198754&color=fff`;
    profileImgs.forEach(img => img.src = avatarUrl);
}

document.addEventListener("DOMContentLoaded", () => {
    updateProfileInfo();

    /* =========================
       SIDEBAR & NAVIGATION
    ========================= */

    const sidebar = document.getElementById("sidebar");
    const mainContent = document.getElementById("main-content");
    const sidebarToggle = document.getElementById("sidebar-toggle");

    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", () => {
            if (window.innerWidth > 768) {
                sidebar.classList.toggle("collapsed");
                mainContent.classList.toggle("expanded");
            } else {
                sidebar.classList.toggle("show");
            }
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
                document.getElementById("off-prof-img").src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=198754&color=fff&size=100`;

                new bootstrap.Modal(document.getElementById("offProfileModal")).show();
            } catch (err) {
                console.error(err);
                alert("Failed to load profile");
            }
        });
    }

    const officerProfileForm = document.getElementById("officer-profile-form");
    if (officerProfileForm) {
        officerProfileForm.addEventListener("submit", async e => {
            e.preventDefault();
            const payload = {
                name: document.getElementById("off-name-input").value,
                email: document.getElementById("off-email-input").value,
                contactNumber: document.getElementById("off-contact-input").value,
                bio: document.getElementById("off-bio-input").value
            };
            const pass = document.getElementById("off-password-input").value;
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
                    bootstrap.Modal.getInstance(document.getElementById("offProfileModal")).hide();
                    location.reload(); // Refresh to update all UI parts
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
        } catch (err) {
            console.error(err);
        }
    }

    function renderComplaints(complaints) {
        const tbody = document.getElementById("dynamic-table-body");
        if (!tbody) return;

        let html = "";
        if (complaints.length === 0) {
            html = '<tr><td colspan="7" class="text-center py-4">No complaints found.</td></tr>';
        } else {
            complaints.forEach(c => {
                let badgeClass = "bg-secondary";
                if (c.status === "Submitted") badgeClass = "bg-warning text-dark";
                if (c.status === "Assigned") badgeClass = "bg-info text-white";
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

                html += `
                <tr>
                    <td><strong>${c.complaintId || (c._id ? c._id.substring(0, 8).toUpperCase() : 'N/A')}</strong></td>
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
        let filtered = allComplaints;
        let title = "Total Cases";

        if (section === "assigned") {
            filtered = allComplaints.filter(c => c.status !== "Resolved");
            title = "Assigned / Pending Cases";
        } else if (section === "resolved") {
            filtered = allComplaints.filter(c => c.status === "Resolved");
            title = "Resolved Cases";
        }

        document.getElementById("dynamic-table-title").textContent = title;
        renderComplaints(filtered);
    }

    window.showTable = function(type) {
        let filtered = allComplaints;
        if (type === 'Assigned Cases') filtered = allComplaints.filter(c => c.status === "Assigned");
        if (type === 'Pending Cases') filtered = allComplaints.filter(c => c.status === "In Progress" || c.status === "Submitted");
        if (type === 'Solved Cases') filtered = allComplaints.filter(c => c.status === "Resolved");
        
        document.getElementById("dynamic-table-title").textContent = type;
        renderComplaints(filtered);
    };

    function updateStats(complaints) {
        const total = complaints.length;
        const assigned = complaints.filter(c => c.status === "Assigned").length;
        const pending = complaints.filter(c => c.status === "In Progress" || c.status === "Submitted").length;
        const solved = complaints.filter(c => c.status === "Resolved" || c.status === "Closed").length;

        const ratedComplaints = complaints.filter(c => c.rating);
        const avgRating = ratedComplaints.length > 0 
            ? (ratedComplaints.reduce((acc, c) => acc + c.rating, 0) / ratedComplaints.length).toFixed(1)
            : "0.0";

        document.getElementById("card-avg-rating").textContent = avgRating;
        document.getElementById("card-assigned-cases").textContent = assigned;
        document.getElementById("card-pending-cases").textContent = pending;
        document.getElementById("card-solved-cases").textContent = solved;
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
        const imageUrl = complaint.image ? `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${complaint.image}` : null;

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
        const tbody = document.querySelector(".table-container tbody");
        if (tbody) {
            let tableHtml = "";
            if (total === 0) {
                tableHtml = '<tr><td colspan="5" class="text-center py-4">No reviews yet.</td></tr>';
            } else {
                ratedComplaints.slice(0, 10).forEach(c => {
                    let stars = "";
                    for(let i=1; i<=5; i++) stars += `<i class="bi bi-star${i <= c.rating ? '-fill' : ''}"></i>`;
                    
                    tableHtml += `
                    <tr>
                        <td>${new Date(c.updatedAt || c.createdAt).toLocaleDateString()}</td>
                        <td>${c.citizenName || 'Anonymous'}</td>
                        <td><small class="fw-bold text-primary">${c.complaintId || c._id.substring(0,8).toUpperCase()}</small></td>
                        <td class="text-warning">${stars}</td>
                        <td class="fst-italic text-muted">"${c.feedback || 'No comments provided.'}"</td>
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
    loadComplaints().then(() => {
        if (document.getElementById("avg-rating-val")) {
            renderRatingsPage(allComplaints);
        }
    });
});

window.logout = function () {
    sessionStorage.removeItem("jwt");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("department");
    window.location.href = "../index.html";
};
