// --- CONFIGURATION ---
const API = (window.API_BASE_URL || "http://localhost:7000") + "/api";

// Get JWT token from session
function getToken() {
    return sessionStorage.getItem("jwt");
}

// --- UTILITIES & NAVIGATION ---
document.addEventListener("DOMContentLoaded", async () => {

    // require prior login
    const auth = sessionStorage.getItem('authenticated');
    if (!auth || auth !== 'citizen') {
        sessionStorage.removeItem('authenticated');
        window.location.href = '../index.html';
        return;
    }

    const token = getToken();
    if (!token) {
        window.location.href = '../index.html';
        return;
    }

    // Show user greeting from stored info
    const userGreeting = document.getElementById("userGreeting");
    if (userGreeting) {
        const storedName = sessionStorage.getItem('userName');
        if (storedName) {
            userGreeting.textContent = `Welcome, ${storedName}`;
        }
    }

    // Sidebar Toggle
    const sidebar = document.getElementById("sidebar");
    const btnMenu = document.getElementById("btn-menu");

    if (btnMenu) {
        btnMenu.addEventListener("click", () => {
            sidebar.classList.toggle("closed");
        });
    }

    // Navigation Logic
    const navLinks = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll(".app-page");

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            sections.forEach(sec => sec.classList.add("hidden"));

            const targetId = link.getAttribute("data-target");
            document.getElementById(targetId).classList.remove("hidden");

            if (targetId === "dashboard-section") {
                loadDashboard();
            }

            if (window.innerWidth < 768) {
                sidebar.classList.add("closed");
            }
        });
    });

    // after binding, if URL contains hash, open corresponding section
    if (location.hash) {
        const hash = location.hash.substring(1);
        const link = [...navLinks].find(l => l.getAttribute('data-target') === hash);
        if (link) {
            link.click();
        }
    }

    // Ripple effect on buttons
    const btns = document.querySelectorAll('.animate-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            let x = e.clientX - e.target.getBoundingClientRect().left;
            let y = e.clientY - e.target.getBoundingClientRect().top;
            let ripples = document.createElement('span');
            ripples.style.left = x + 'px';
            ripples.style.top = y + 'px';
            this.appendChild(ripples);
            setTimeout(() => { ripples.remove(); }, 1000);
        });
    });

    // Show app immediately (no separate login section since login is on homepage)
    const appWrapper = document.getElementById("app-wrapper");
    if (appWrapper) {
        appWrapper.classList.remove("hidden");
        const hash = window.location.hash.substring(1);
        if (hash) {
            const match = Array.from(navLinks).find(l => l.getAttribute('data-target') === hash);
            if (match) {
                match.click();
            } else {
                navLinks[0].click();
            }
        } else {
            navLinks[0].click();
        }
    }

    // Logout Logic
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            sessionStorage.removeItem('authenticated');
            sessionStorage.removeItem('jwt');
            sessionStorage.removeItem('role');
            sessionStorage.removeItem('userName');
            window.location.href = "../index.html";
        });
    }


    // --- 2. FILE COMPLAINT PAGE LOGIC ---

    // Dependent Dropdowns
    const categorySelect = document.getElementById("category");
    const subcategorySelect = document.getElementById("subcategory");

    const subcategoriesData = {
        "Cyber Crime": ["Online Fraud", "Hacking", "Identity Theft", "Phishing"],
        "Water Issue": ["No Water Supply", "Contaminated Water", "Pipeline Leakage"],
        "Electricity Issue": ["Power Cut", "Low Voltage", "Transformer Problem", "Streetlight not working"],
        "Road Damage": ["Potholes", "Broken Payment", "Drainage Block"],
        "Public Safety": ["Suspicious Activity", "Harassment", "Noise Pollution"],
        "Garbage Issue": ["Waste Accumulation", "No Dustbin", "Irregular Collection"]
    };

    if (categorySelect) {
        categorySelect.addEventListener("change", function() {
            const selected = this.value;
            subcategorySelect.innerHTML = '<option value="" disabled selected>Select Subcategory</option>';
            if (subcategoriesData[selected]) {
                subcategoriesData[selected].forEach(sub => {
                    const opt = document.createElement("option");
                    opt.value = sub;
                    opt.textContent = sub;
                    subcategorySelect.appendChild(opt);
                });
                subcategorySelect.disabled = false;
            } else {
                subcategorySelect.disabled = true;
            }
        });
    }

    // Geolocation API
    const getLocationBtn = document.getElementById("getLocationBtn");
    const locationInput = document.getElementById("location");

    if (getLocationBtn) {
        getLocationBtn.addEventListener("click", () => {
            locationInput.value = "Detecting location...";
            getLocationBtn.disabled = true;
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                            .then(response => response.json())
                            .then(data => {
                                let city = data.address.city || data.address.town || data.address.village || data.address.county || "Unknown Location";
                                locationInput.value = `Current Location: ${city}`;
                                getLocationBtn.disabled = false;
                            })
                            .catch(err => {
                                locationInput.value = `Current Location: Lat ${lat.toFixed(4)}, Lng ${lon.toFixed(4)}`;
                                getLocationBtn.disabled = false;
                            });
                    },
                    (error) => {
                        locationInput.value = "Location access denied. Please type manually.";
                        locationInput.removeAttribute("readonly");
                        locationInput.focus();
                        getLocationBtn.disabled = false;
                    }
                );
            } else {
                locationInput.value = "Geolocation is not supported by this browser.";
                locationInput.removeAttribute("readonly");
            }
        });
    }

    // File Upload Display
    const evidenceInput = document.getElementById("evidence");
    const fileNameDisplay = document.getElementById("fileNameDisplay");

    if (evidenceInput) {
        evidenceInput.addEventListener("change", function() {
            if (this.files && this.files.length > 0) {
                fileNameDisplay.textContent = `Selected File: ${this.files[0].name}`;
            } else {
                fileNameDisplay.textContent = "";
            }
        });
    }

    // Form Submission — POST to backend API
    const complaintForm = document.getElementById("complaintForm");
    const successModal = document.getElementById("successModal");
    const popupComplaintId = document.getElementById("popupComplaintId");

    if (complaintForm) {
        complaintForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const title = document.getElementById("title").value.trim();
            const description = document.getElementById("description").value.trim();
            const category = document.getElementById("category").value;
            const subcategory = document.getElementById("subcategory").value;
            const location = document.getElementById("location").value.trim();
            const evidenceFile = evidenceInput ? evidenceInput.files[0] : null;

            if (!title || !description || !category) {
                alert("Please fill in Title, Description and Category.");
                return;
            }

            // Build FormData for multipart (supports file upload)
            const formData = new FormData();
            formData.append("title", title);
            formData.append("description", description);
            formData.append("category", category);
            if (subcategory) formData.append("subcategory", subcategory);
            formData.append("location", location || "Unknown");
            if (evidenceFile) formData.append("image", evidenceFile);

            const submitBtn = complaintForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;

            try {
                const resp = await fetch(`${API}/complaints`, {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer " + getToken()
                        // NOTE: Do NOT set Content-Type when using FormData — browser sets it with boundary
                    },
                    body: formData
                });

                const data = await resp.json();

                if (!resp.ok) {
                    alert("Error: " + (data.message || "Failed to submit complaint"));
                    if (submitBtn) submitBtn.disabled = false;
                    return;
                }

                // Show success popup with formatted complaint ID
                const complId = data.complaint.complaintId || data.complaint._id;
                popupComplaintId.textContent = complId;
                successModal.classList.remove("hidden");

                // Reset form
                complaintForm.reset();
                if (subcategorySelect) {
                    subcategorySelect.innerHTML = '<option value="" disabled selected>Select category first</option>';
                    subcategorySelect.disabled = true;
                }
                if (fileNameDisplay) fileNameDisplay.textContent = "";
                if (locationInput) locationInput.setAttribute("readonly", true);

            } catch (err) {
                console.error("Submit complaint error:", err);
                alert("Failed to submit complaint. Make sure the backend server is running.");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // Modal Interactions
    const closeModalBtn = document.getElementById("closeModalBtn");
    const copyIdBtn = document.getElementById("copyIdBtn");
    const copyToast = document.getElementById("copyToast");

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            successModal.classList.add("hidden");
            const trackIdInput = document.getElementById("trackIdInput");
            if (trackIdInput) {
                trackIdInput.value = popupComplaintId.textContent;
            }
            const trackingResult = document.getElementById("trackingResult");
            if (trackingResult) trackingResult.classList.add("hidden");
            navLinks[1].click(); // Track page
        });
    }

    if (copyIdBtn) {
        copyIdBtn.addEventListener("click", () => {
            const idToCopy = popupComplaintId.textContent;
            navigator.clipboard.writeText(idToCopy).then(() => {
                copyIdBtn.innerHTML = "<i class='bx bx-check'></i> Copied!";
                if (copyToast) copyToast.classList.add("show-right");
                setTimeout(() => {
                    if (copyToast) copyToast.classList.remove("show-right");
                    copyIdBtn.innerHTML = "<i class='bx bx-copy'></i> Copy Complaint ID";
                    closeModalBtn.click();
                }, 2000);
            });
        });
    }


    // --- 3. TRACK COMPLAINT PAGE LOGIC ---
    const trackForm = document.getElementById("trackForm");
    const trackIdInput = document.getElementById("trackIdInput");
    const trackingResult = document.getElementById("trackingResult");
    const displayTrackId = document.getElementById("displayTrackId");
    const displayBadge = document.getElementById("displayBadge");

    if (trackForm) {
        trackForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const searchId = trackIdInput.value.trim();
            if (!searchId) return;

            displayTrackId.textContent = searchId;
            resetStepper();
            trackingResult.classList.remove("hidden");
            trackingResult.style.opacity = '0';
            setTimeout(() => { trackingResult.style.opacity = '1'; }, 50);

            try {
                const resp = await fetch(`${API}/complaints/${searchId}`, {
                    headers: { Authorization: "Bearer " + getToken() }
                });

                if (!resp.ok) {
                    displayBadge.textContent = "Not Found";
                    displayBadge.style.background = "#fee2e2";
                    return;
                }

                const complaint = await resp.json();
                const status = complaint.status;

                displayBadge.textContent = status;

                // Badge color
                if (status === "Submitted") displayBadge.style.background = "#e0e7ff";
                else if (status === "Assigned") displayBadge.style.background = "#e0e7ff";
                else if (status === "In Progress") displayBadge.style.background = "#fef3c7";
                else if (status === "Resolved") displayBadge.style.background = "#d1fae5";
                else if (status === "Closed") displayBadge.style.background = "#d1fae5";
                else displayBadge.style.background = "#ffedd5";

                // Animate stepper
                setTimeout(() => { activateStep('step-assigned'); }, 200);

                if (["In Progress", "Resolved", "Closed"].includes(status)) {
                    setTimeout(() => {
                        document.getElementById('conn-1').classList.add('active');
                        activateStep('step-inprogress');
                    }, 800);
                }

                if (["Resolved", "Closed"].includes(status)) {
                    setTimeout(() => {
                        document.getElementById('conn-2').classList.add('active');
                        activateStep('step-pending');
                    }, 1400);
                    setTimeout(() => {
                        document.getElementById('conn-3').classList.add('active');
                        activateStep('step-resolved');
                    }, 2000);
                }

                // Populate Officer Details
                const officerDetails = document.getElementById("officerDetails");
                if (complaint.assignedOfficer) {
                    const off = complaint.assignedOfficer;
                    document.getElementById("officerNameDisplay").textContent = off.name;
                    document.getElementById("officerDeptDisplay").textContent = `Department: ${off.department || 'General'}`;
                    document.getElementById("officerPhoneDisplay").textContent = off.contactNumber || "Contact Not Provided";
                    document.getElementById("officerEmailDisplay").textContent = off.email;
                    document.getElementById("officerBioDisplay").textContent = off.bio || "";
                    
                    const avatar = document.getElementById("officerAvatarSmall");
                    avatar.innerHTML = `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(off.name)}&background=random&color=fff" alt="${off.name}">`;
                    
                    officerDetails.classList.remove("hidden");
                } else {
                    officerDetails.classList.add("hidden");
                }

                // Populate Resolution Proof
                const resProof = document.getElementById("resolutionProof");
                const resImageDisplay = document.getElementById("resolutionImageDisplay");
                const resRemarks = document.getElementById("resolutionRemarks");
                
                if (complaint.status === "Resolved" || complaint.status === "Closed") {
                    resProof.classList.remove("hidden");
                    resRemarks.textContent = complaint.history && complaint.history.length > 0 
                        ? complaint.history.filter(h => h.status === 'Resolved').pop()?.remarks || "Issue has been successfully resolved." 
                        : "Issue has been successfully resolved.";
                    
                    if (complaint.resolutionImage) {
                        resImageDisplay.src = `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${complaint.resolutionImage}`;
                        resImageDisplay.style.display = "block";
                    } else {
                        resImageDisplay.style.display = "none";
                    }
                } else {
                    resProof.classList.add("hidden");
                }

                // Rating Logic
                const ratingSection = document.getElementById("ratingSection");
                if (["Resolved", "Closed"].includes(status)) {
                    if (complaint.rating) {
                        ratingSection.classList.add("hidden"); // Already rated
                    } else {
                        ratingSection.classList.remove("hidden");
                        ratingSection.dataset.complaintId = complaint._id;
                    }
                } else {
                    ratingSection.classList.add("hidden");
                }

            } catch (err) {
                console.error("Track error:", err);
                displayBadge.textContent = "Error";
                displayBadge.style.background = "#fee2e2";
            }
        });
    }

    const ratingForm = document.getElementById("ratingForm");
    if (ratingForm) {
        ratingForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const complaintId = document.getElementById("ratingSection").dataset.complaintId;
            const ratingInput = ratingForm.querySelector('input[name="rating"]:checked');
            const feedback = document.getElementById("feedback-text").value;

            if (!ratingInput) {
                alert("Please select a star rating.");
                return;
            }

            try {
                const res = await fetch(`${API}/complaints/${complaintId}/rate`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + getToken()
                    },
                    body: JSON.stringify({ rating: ratingInput.value, feedback })
                });

                if (res.ok) {
                    document.getElementById("ratingForm").classList.add("hidden");
                    document.getElementById("ratingSuccess").classList.remove("hidden");
                } else {
                    alert("Failed to submit feedback.");
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    function resetStepper() {
        const steps = document.querySelectorAll('.step');
        const conns = document.querySelectorAll('.connector');
        steps.forEach(s => s.classList.remove('active'));
        conns.forEach(c => c.classList.remove('active'));
    }

    function activateStep(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    }


    // --- 4. DASHBOARD LOGIC — fetch THIS user's complaints from backend ---
    async function loadDashboard() {
        const tbody = document.getElementById("dashboardTableBody");
        const noData = document.getElementById("noDataMessage");
        const dataTable = document.querySelector(".data-table");

        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#888;">Loading...</td></tr>';

        try {
            const resp = await fetch(`${API}/complaints`, {
                headers: { Authorization: "Bearer " + getToken() }
            });

            if (!resp.ok) {
                throw new Error("Failed to load complaints");
            }

            const complaints = await resp.json();

            // Update stats
            const total = complaints.length;
            const pending = complaints.filter(c => !["Resolved","Closed"].includes(c.status)).length;
            const solved = complaints.filter(c => ["Resolved","Closed"].includes(c.status)).length;

            const statTotal = document.getElementById("stat-total");
            const statPending = document.getElementById("stat-pending");
            const statSolved = document.getElementById("stat-solved");

            if (statTotal) statTotal.textContent = total;
            if (statPending) statPending.textContent = pending;
            if (statSolved) statSolved.textContent = solved;

            // Populate Table
            tbody.innerHTML = "";

            if (total === 0) {
                if (dataTable) dataTable.classList.add("hidden");
                if (noData) noData.classList.remove("hidden");
            } else {
                if (dataTable) dataTable.classList.remove("hidden");
                if (noData) noData.classList.add("hidden");

                complaints.forEach(c => {
                    const tr = document.createElement("tr");

                    let statusClass = "";
                    if (c.status === "Submitted") statusClass = "status-pending";
                    else if (c.status === "Assigned") statusClass = "status-assigned";
                    else if (c.status === "In Progress") statusClass = "status-inprogress";
                    else if (c.status === "Resolved" || c.status === "Closed") statusClass = "status-resolved";

                    const dateStr = new Date(c.createdAt).toLocaleDateString();

                    tr.innerHTML = `
                        <td><strong>${c.complaintId || c._id.substring(0,8)}</strong></td>
                        <td>${c.user?.name || "You"}</td>
                        <td>${c.category || c.title}</td>
                        <td>${dateStr}</td>
                        <td><span class="status-badge ${statusClass}">${c.status}</span></td>
                    `;
                    tbody.appendChild(tr);
                });
            }

        } catch (err) {
            console.error("Load dashboard error:", err);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#e74c3c;">Failed to load complaints. Make sure the server is running.</td></tr>';
        }
    }

    // --- 5. PROFILE & SETTINGS DROPDOWN ---
    const profileTrigger = document.getElementById("profileIconTrigger");
    const profileDropdown = document.getElementById("profileDropdown");
    const openProfileBtn = document.getElementById("openProfileBtn");
    const openSettingsBtn = document.getElementById("openSettingsBtn");
    const profileModal = document.getElementById("profileModal");
    const settingsModal = document.getElementById("settingsModal");
    const closeProfileModal = document.getElementById("closeProfileModal");
    const closeSettingsModal = document.getElementById("closeSettingsModal");
    const logoutBtnAlt = document.getElementById("logoutBtnAlt");

    if (profileTrigger) {
        profileTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle("hidden");
        });
    }

    document.addEventListener("click", () => {
        if (profileDropdown) profileDropdown.classList.add("hidden");
    });

    if (openProfileBtn) {
        openProfileBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            
            try {
                const res = await fetch(`${API}/auth/me`, {
                    headers: { Authorization: "Bearer " + getToken() }
                });
                const user = await res.json();
                
                document.getElementById("prof-id").textContent = user._id;
                document.getElementById("prof-name-input").value = user.name;
                document.getElementById("prof-email-input").value = user.email;
                document.getElementById("prof-bio-input").value = user.bio || "";
                document.getElementById("prof-password-input").value = "";
                
                profileModal.classList.remove("hidden");
            } catch (err) {
                console.error("Fetch profile error:", err);
                alert("Could not load profile details.");
            }
        });
    }

    const profileForm = document.getElementById("update-profile-form");
    if (profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const payload = {
                name: document.getElementById("prof-name-input").value,
                email: document.getElementById("prof-email-input").value,
                bio: document.getElementById("prof-bio-input").value,
            };
            
            const newPass = document.getElementById("prof-password-input").value;
            if (newPass) payload.password = newPass;
            
            try {
                const res = await fetch(`${API}/auth/profile`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + getToken()
                    },
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                if (res.ok) {
                    alert("Profile updated successfully!");
                    sessionStorage.setItem("userName", data.user.name);
                    sessionStorage.setItem("userEmail", data.user.email);
                    // Update header display if exists
                    const greeting = document.getElementById("user-greeting");
                    if (greeting) greeting.textContent = data.user.name;
                    
                    profileModal.classList.add("hidden");
                } else {
                    alert(data.message || "Update failed");
                }
            } catch (err) {
                console.error("Update profile error:", err);
                alert("An error occurred during update.");
            }
        });
    }

    if (closeProfileModal) {
        closeProfileModal.addEventListener("click", () => profileModal.classList.add("hidden"));
    }

    if (openSettingsBtn) {
        openSettingsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            settingsModal.classList.remove("hidden");
        });
    }

    if (closeSettingsModal) {
        closeSettingsModal.addEventListener("click", () => settingsModal.classList.add("hidden"));
    }

    if (logoutBtnAlt) {
        logoutBtnAlt.addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("logoutBtn").click();
        });
    }

    // Initialize with real user email if available
    if (!sessionStorage.getItem("userEmail") && getToken()) {
        try {
            fetch(`${API}/complaints`, { 
                headers: { Authorization: "Bearer " + getToken() }
            }).then(r => r.json()).then(data => {
                const list = data.complaints || data;
                if (list.length > 0 && list[0].user) {
                    sessionStorage.setItem("userEmail", list[0].user.email);
                }
            });
        } catch(e) {}
    }

});
