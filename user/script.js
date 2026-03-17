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
    const mobileBtnMenu = document.getElementById("mobile-btn-menu");

    if (btnMenu) {
        btnMenu.addEventListener("click", () => {
            sidebar.classList.toggle("closed");
            sidebar.classList.toggle("show"); // for mobile
        });
    }

    if (mobileBtnMenu) {
        mobileBtnMenu.addEventListener("click", () => {
            sidebar.classList.toggle("show");
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
            const targetEl = document.getElementById(targetId);
            if(targetEl) targetEl.classList.remove("hidden");

            if (targetId === "dashboard-section") {
                loadDashboard();
            } else if (targetId === "your-complaints-section") {
                loadYourComplaints();
            } else if (targetId === "notifications-section") {
                loadNotifications();
            } else if (targetId === "profile-section") {
                loadStandaloneProfile();
            } else if (targetId === "feedback-section") {
                loadFeedbackDropdown();
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

    // --- THEME TOGGLE (DARK MODE) ---
    const themeToggle = document.getElementById("themeToggleCheckbox");
    const body = document.body;

    // Check for saved theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        body.classList.add("dark-mode");
        if (themeToggle) themeToggle.checked = true;
    }

    if (themeToggle) {
        themeToggle.addEventListener("change", () => {
            if (themeToggle.checked) {
                body.classList.add("dark-mode");
                localStorage.setItem("theme", "dark");
            } else {
                body.classList.remove("dark-mode");
                localStorage.setItem("theme", "light");
            }
        });
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
                document.querySelector('.nav-link[data-target="dashboard-section"]')?.click();
            }
        } else {
            document.querySelector('.nav-link[data-target="dashboard-section"]')?.click();
        }
    }

    // --- NOTIFICATION BELL LOGIC ---
    const notifBellTrigger = document.getElementById("notificationBellTrigger");
    const notifDropdown = document.getElementById("notificationDropdown");
    const markAllReadBtn = document.getElementById("markAllReadBtn");

    if (notifBellTrigger) {
        notifBellTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle("hidden");
            if (!notifDropdown.classList.contains("hidden")) {
                loadNotificationsForDropdown();
            }
        });
    }

    document.addEventListener("click", (e) => {
        if (notifDropdown && !notifDropdown.contains(e.target) && e.target !== notifBellTrigger) {
            notifDropdown.classList.add("hidden");
        }
    });

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener("click", markNotificationsAsRead);
    }

    // Initial check for notifications
    checkNotifications();
    setInterval(checkNotifications, 60000); // Check every minute


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
                        
                        // Use accurate zoom for more specific address details
                        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`)
                            .then(response => response.json())
                            .then(data => {
                                // Prefer full display name for exact location, fallback to city/town
                                let address = data.display_name || (data.address.city || data.address.town || data.address.village || data.address.county || "Unknown Location");
                                locationInput.value = address;
                                locationInput.removeAttribute("readonly"); // Allow manual correction
                                getLocationBtn.disabled = false;
                            })
                            .catch(err => {
                                locationInput.value = `Lat: ${lat.toFixed(6)}, Lng: ${lon.toFixed(6)}`;
                                locationInput.removeAttribute("readonly");
                                getLocationBtn.disabled = false;
                            });
                    },
                    (error) => {
                        let errorMsg = "Location access denied. Please type manually.";
                        if (error.code === error.TIMEOUT) errorMsg = "Location detection timed out.";
                        else if (error.code === error.POSITION_UNAVAILABLE) errorMsg = "Location information is unavailable.";
                        
                        locationInput.value = "";
                        locationInput.placeholder = errorMsg;
                        locationInput.removeAttribute("readonly");
                        locationInput.focus();
                        getLocationBtn.disabled = false;
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            } else {
                locationInput.value = "";
                locationInput.placeholder = "Geolocation not supported.";
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

            const submitBtn = complaintForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Submitting...";
            }

            const description = document.getElementById("description").value.trim();
            const category = document.getElementById("category").value;
            const subcategory = document.getElementById("subcategory").value;
            const location = document.getElementById("location").value.trim();
            const evidenceFile = evidenceInput ? evidenceInput.files[0] : null;

            const formData = new FormData();
            formData.append("description", description);
            formData.append("category", category);
            if (subcategory) formData.append("subcategory", subcategory);
            formData.append("location", location || "Unknown");
            if (evidenceFile) formData.append("image", evidenceFile);

            try {
                const resp = await fetch(`${API}/complaints`, {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer " + getToken()
                    },
                    body: formData
                });

                const data = await resp.json();

                if (!resp.ok) {
                    alert("Error: " + (data.message || "Failed to submit complaint"));
                    return;
                }

                // Show success popup
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
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Submit Complaint";
                }
            }
        });
    }

    // --- RAISE A CONCERN LOGIC ---
    const showConcernFormBtn = document.getElementById("showConcernFormBtn");
    const cancelConcernBtn = document.getElementById("cancelConcernBtn");
    const concernForm = document.getElementById("concernForm");

    if (showConcernFormBtn) {
        showConcernFormBtn.addEventListener("click", () => {
            concernForm.classList.remove("hidden");
            document.querySelector(".concern-content").classList.add("hidden");
        });
    }

    if (cancelConcernBtn) {
        cancelConcernBtn.addEventListener("click", () => {
            concernForm.classList.add("hidden");
            document.querySelector(".concern-content").classList.remove("hidden");
        });
    }

    if (concernForm) {
        concernForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const submitBtn = this.querySelector('button[type="submit"]');
            const compIDInput = document.getElementById("concernComplaintId");
            const description = document.getElementById("concernDescription").value;
            const evidence = document.getElementById("concernEvidence").files[0];

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Submitting...";
            }

            const formData = new FormData();
            formData.append("complaintId", compIDInput.getAttribute('data-real-id'));
            formData.append("description", description);
            if (evidence) formData.append("image", evidence);

            try {
                const res = await fetch(`${API}/concerns`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${getToken()}`
                    },
                    body: formData
                });

                if (res.ok) {
                    document.getElementById("concernSuccess").classList.remove("hidden");
                    this.reset();
                    setTimeout(() => {
                        document.getElementById("concernSuccess").classList.add("hidden");
                        concernForm.classList.add("hidden");
                        document.querySelector(".concern-content").classList.remove("hidden");
                    }, 4000);
                } else {
                    const data = await res.json();
                    alert(data.message || "Error raising concern");
                }
            } catch (err) {
                console.error(err);
                alert("Error submitting concern.");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Submit Concern";
                }
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
                
                // Set ID for concern form
                const concernCompId = document.getElementById("concernComplaintId");
                if (concernCompId) {
                    concernCompId.value = searchId;
                    concernCompId.setAttribute('data-real-id', complaint._id);
                }
                
                // Show concern section
                const raiseConcernSection = document.getElementById("raiseConcernSection");
                if (raiseConcernSection) raiseConcernSection.classList.remove("hidden");


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
            const submitted = complaints.filter(c => c.status === "Submitted").length;
            const inProgress = complaints.filter(c => ["Assigned", "In Progress"].includes(c.status)).length;
            const solved = complaints.filter(c => ["Resolved", "Closed"].includes(c.status)).length;

            const statTotal = document.getElementById("stat-total");
            const statPending = document.getElementById("stat-pending");
            const statInProgress = document.getElementById("stat-inprogress");
            const statSolved = document.getElementById("stat-solved");

            if (statTotal) statTotal.textContent = total;
            if (statPending) statPending.textContent = submitted;
            if (statInProgress) statInProgress.textContent = inProgress;
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

    // --- 5. PROFILE SLIDE PANEL & STANDALONE PAGES LOGIC ---
    
    // Panel Elements
    const profileIconTrigger = document.getElementById("profileIconTrigger");
    const profileSlidePanel = document.getElementById("profileSlidePanel");
    const closeProfilePanelBtn = document.getElementById("closeProfilePanelBtn");
    const panelOverlay = document.getElementById("panelOverlay");
    const panelLogoutBtn = document.getElementById("panelLogoutBtn");
    const panelNavTriggers = document.querySelectorAll(".nav-trigger");
    const panelSwitchAccountBtn = document.getElementById("panelSwitchAccountBtn");

    function openPanel() {
        if(profileSlidePanel) profileSlidePanel.classList.add("open");
        if(panelOverlay) panelOverlay.classList.add("show");
        
        // Populate info
        const storedName = sessionStorage.getItem('userName') || "Citizen";
        const storedEmail = sessionStorage.getItem('userEmail') || "citizen@portal.com";
        document.getElementById("panelUserName").textContent = storedName;
        document.getElementById("panelUserEmail").textContent = storedEmail;
        
        let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(storedName)}&background=6366f1&color=fff`;
        const storedPhoto = sessionStorage.getItem("profilePhoto");
        if (storedPhoto && storedPhoto !== "undefined" && storedPhoto !== "") {
            avatarUrl = `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${storedPhoto}`;
        }
        
        document.getElementById("headerProfileAvatar").src = avatarUrl;
        document.getElementById("panelProfileAvatar").src = avatarUrl;
    }

    function closePanel() {
        if(profileSlidePanel) profileSlidePanel.classList.remove("open");
        if(panelOverlay) panelOverlay.classList.remove("show");
    }

    if (profileIconTrigger) {
        profileIconTrigger.addEventListener("click", openPanel);
    }
    if (closeProfilePanelBtn) {
        closeProfilePanelBtn.addEventListener("click", closePanel);
    }
    if (panelOverlay) {
        panelOverlay.addEventListener("click", closePanel);
    }
    
    // Switch Account
    if (panelSwitchAccountBtn) {
        panelSwitchAccountBtn.addEventListener("click", (e) => {
            e.preventDefault();
            logoutBtn.click();
        });
    }

    // Nav triggers inside panel
    panelNavTriggers.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            closePanel();
            const target = btn.getAttribute("data-target");
            const navLink = document.querySelector(`.nav-link[data-target="${target}"]`);
            if(navLink) navLink.click();
        });
    });

    if (panelLogoutBtn) {
        panelLogoutBtn.addEventListener("click", () => logoutBtn.click());
    }

    // --- PAGE: Your Complaints ---
    async function loadYourComplaints() {
        const tbody = document.getElementById("yourComplaintsTableBody");
        const noMsg = document.getElementById("noComplaintsMessage");
        if(!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
        
        try {
            const resp = await fetch(`${API}/complaints`, {
                headers: { Authorization: "Bearer " + getToken() }
            });
            const complaints = await resp.json();
            tbody.innerHTML = "";
            
            if(complaints.length === 0) {
                noMsg.classList.remove("hidden");
                document.querySelector("#your-complaints-section .data-table").classList.add("hidden");
            } else {
                noMsg.classList.add("hidden");
                document.querySelector("#your-complaints-section .data-table").classList.remove("hidden");
                
                complaints.forEach(c => {
                    const tr = document.createElement("tr");
                    const dateStr = new Date(c.createdAt).toLocaleDateString();
                    tr.innerHTML = `
                        <td><strong>${c.complaintId || c._id.substring(0,8)}</strong></td>
                        <td>${c.category}</td>
                        <td>${dateStr}</td>
                        <td><span class="badge" style="background:var(--light);color:var(--dark);">${c.status}</span></td>
                        <td>
                            <button class="btn-secondary" style="padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="viewComplaintDetails('${c.complaintId || c._id}')">
                                View
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        } catch(err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load</td></tr>';
        }
    }

    window.viewComplaintDetails = function(id) {
        document.querySelector('.nav-link[data-target="track-complaint-section"]').click();
        const trkInput = document.getElementById("trackIdInput");
        if(trkInput) {
            trkInput.value = id;
            document.getElementById("trackForm").dispatchEvent(new Event("submit"));
        }
    };

    // --- PAGE: Notifications ---
    async function loadNotifications() {
        const list = document.getElementById("notificationsList");
        if(!list) return;
        
        list.innerHTML = "<p class='text-center'>Loading notifications...</p>";
        
        try {
            const resp = await fetch(`${API}/complaints`, {
                headers: { Authorization: "Bearer " + getToken() }
            });
            const complaints = await resp.json();
            list.innerHTML = "";
            
            // Generate synthetic notifications based on status
            const notifications = [];
            
            complaints.forEach(c => {
                const id = c.complaintId || c._id.substring(0,8);
                if(c.status === "Assigned") {
                    notifications.push({
                        text: `Complaint ${id} has been assigned to an officer.`,
                        time: new Date(c.updatedAt || c.createdAt),
                        type: 'info', icon: 'bx-user-pin'
                    });
                } else if(c.status === "In Progress") {
                    notifications.push({
                        text: `Complaint ${id} is currently under review / in progress.`,
                        time: new Date(c.updatedAt || c.createdAt),
                        type: 'info', icon: 'bx-cog'
                    });
                } else if(["Resolved", "Closed"].includes(c.status)) {
                    notifications.push({
                        text: `Complaint ${id} has been resolved!`,
                        time: new Date(c.updatedAt || c.createdAt),
                        type: 'success', icon: 'bx-check-shield'
                    });
                }
            });
            
            notifications.sort((a,b) => b.time - a.time);
            
            if(notifications.length === 0) {
                list.innerHTML = "<div class='no-data'><i class='bx bx-bell'></i><p>No new notifications</p></div>";
            } else {
                notifications.forEach(n => {
                    list.innerHTML += `
                        <div class="notification-item">
                            <div class="noti-icon ${n.type}"><i class='bx ${n.icon}'></i></div>
                            <div class="noti-content">
                                <p>${n.text}</p>
                                <span class="noti-time">${n.time.toLocaleString()}</span>
                            </div>
                        </div>
                    `;
                });
            }
        } catch(err) {
            console.error(err);
            list.innerHTML = "<p class='text-center text-danger'>Error loading notifications.</p>";
        }
    }

    // --- PAGE: Feedback ---
    async function loadFeedbackDropdown() {
        const select = document.getElementById("feedbackComplaintSelect");
        if(!select) return;
        
        try {
            const resp = await fetch(`${API}/complaints`, {
                headers: { Authorization: "Bearer " + getToken() }
            });
            const complaints = await resp.json();
            
            const resolved = complaints.filter(c => ["Resolved", "Closed"].includes(c.status));
            
            select.innerHTML = '<option value="" disabled selected>Select a complaint</option>';
            resolved.forEach(c => {
                const id = c.complaintId || c._id.substring(0,8);
                select.innerHTML += `<option value="${c._id}">${id} - ${c.category}</option>`;
            });
            
        } catch(err) {
            console.error("Feedback dropdwn err", err);
        }
    }

    const standaloneFeedbackForm = document.getElementById("standaloneFeedbackForm");
    if(standaloneFeedbackForm) {
        standaloneFeedbackForm.addEventListener("submit", async(e) => {
            e.preventDefault();
            const cid = document.getElementById("feedbackComplaintSelect").value;
            const text = document.getElementById("standaloneFeedbackText").value;
            const ratingEl = document.querySelector('input[name="standaloneRating"]:checked');
            
            if(!cid || !ratingEl) {
                alert("Please select a complaint and provide a star rating.");
                return;
            }
            
            try {
                const res = await fetch(`${API}/complaints/${cid}/rate`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + getToken()
                    },
                    body: JSON.stringify({ rating: ratingEl.value, feedback: text })
                });
                
                if(res.ok) {
                    standaloneFeedbackForm.classList.add("hidden");
                    document.getElementById("standaloneFeedbackSuccess").classList.remove("hidden");
                } else {
                    alert("Failed to submit feedback.");
                }
            } catch(e) {
                console.error(e);
            }
        });
    }

    // --- PAGE: Profile Update ---
    async function loadStandaloneProfile() {
        try {
            const res = await fetch(`${API}/auth/me`, {
                headers: { Authorization: "Bearer " + getToken() }
            });
            const user = await res.json();
            
            if (document.getElementById("profNameMain")) document.getElementById("profNameMain").value = user.name || "";
            if (document.getElementById("profEmailMain")) document.getElementById("profEmailMain").value = user.email || "";
            if (document.getElementById("profPhoneMain")) document.getElementById("profPhoneMain").value = user.phone || "";
            if (document.getElementById("profAddressMain")) document.getElementById("profAddressMain").value = user.address || "";
            
            let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name||"Citizen")}&background=6366f1&color=fff`;
            if (user.profilePhoto) {
                avatarUrl = `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${user.profilePhoto}`;
            }
            if (document.getElementById("standaloneProfileImg")) document.getElementById("standaloneProfileImg").src = avatarUrl;
            
        } catch(err) {
            console.error("Profile load err", err);
        }
    }

    const standaloneProfileForm = document.getElementById("standaloneProfileForm");
    const uploadPhotoInput = document.getElementById("uploadProfilePhoto");

    if (uploadPhotoInput) {
        uploadPhotoInput.addEventListener("change", async function() {
            if (this.files && this.files[0]) {
                const formData = new FormData();
                formData.append("profilePhoto", this.files[0]);
                
                try {
                    const res = await fetch(`${API}/auth/profile`, {
                        method: "PUT",
                        headers: {
                            Authorization: "Bearer " + getToken()
                        },
                        body: formData
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.user.profilePhoto) {
                            sessionStorage.setItem("profilePhoto", data.user.profilePhoto);
                        }
                        openPanel(); // Refresh panel display
                        loadStandaloneProfile(); // Refresh page display
                    }
                } catch(e) { console.error(e); }
            }
        });
    }

    if(standaloneProfileForm) {
        standaloneProfileForm.addEventListener("submit", async(e) => {
            e.preventDefault();
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            const name = document.getElementById("profNameMain").value;
            const phone = document.getElementById("profPhoneMain").value;
            const photo = document.getElementById("profPhotoMain").files[0];

            const formData = new FormData();
            formData.append("name", name);
            formData.append("contactNumber", phone);
            if (photo) formData.append("profilePhoto", photo);

            try {
                const res = await fetch(`${API}/auth/profile`, {
                    method: "PUT",
                    headers: {
                        "Authorization": `Bearer ${getToken()}`
                    },
                    body: formData
                });

                if (res.ok) {
                    const data = await res.json();
                    alert("Profile updated successfully!");
                    sessionStorage.setItem('userName', name);
                    if (userGreeting) userGreeting.textContent = `Welcome, ${name}`;
                    if (data.user.profilePhoto) {
                        const photoUrl = `${window.API_BASE_URL || "http://localhost:7000"}/uploads/${data.user.profilePhoto}`;
                        document.getElementById("standaloneProfileImg").src = photoUrl;
                        const headerAv = document.getElementById("headerProfileAvatar");
                        if (headerAv) headerAv.src = photoUrl;
                    }
                } else {
                    alert("Failed to update profile.");
                }
            } catch (err) {
                console.error(err);
                alert("Error updating profile.");
            } finally {
                submitBtn.disabled = false;
            }
        });

        // Photo preview
        const profPhotoMain = document.getElementById("profPhotoMain");
        if (profPhotoMain) {
            profPhotoMain.addEventListener("change", function() {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        document.getElementById("standaloneProfileImg").src = e.target.result;
                    };
                    reader.readAsDataURL(this.files[0]);
                }
            });
        }
    }


    // --- PAGE: Settings (Change Password) ---
    const pwdUpdateBtn = document.getElementById("pwdUpdateBtn");
    if(pwdUpdateBtn) {
        pwdUpdateBtn.addEventListener("click", async() => {
            const newp = document.getElementById("newPassword").value;
            if(!newp) return alert("Enter new password");
            
            try {
                const res = await fetch(`${API}/auth/profile`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + getToken()
                    },
                    body: JSON.stringify({ password: newp })
                });
                if(res.ok) {
                    alert("Password updated");
                    document.getElementById("newPassword").value = "";
                } else {
                    alert("Failed to update password");
                }
            } catch(e) {
                console.error(e);
            }
        });
    }

    // Initialize with real user email if available
    if (!sessionStorage.getItem("userEmail") && getToken()) {
        try {
            fetch(`${API}/auth/me`, { 
                headers: { Authorization: "Bearer " + getToken() }
            }).then(r => r.json()).then(data => {
                sessionStorage.setItem("userEmail", data.email);
            });
        } catch(e) {}
    }
    // Clean up modals since we replaced them with pages and slide panel
    // Keep this safe in case they referenced existing DOMs.
});

// =====================
// FORGOT PASSWORD FLOW
// =====================
function openForgotPassword() {
    // If modal is open, we might need to handle overlays
    const profileModal = document.getElementById("profileModal");
    if (profileModal) profileModal.classList.add("hidden");
    
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

// --- NOTIFICATION HELPERS ---
async function checkNotifications() {
    try {
        const resp = await fetch(`${API}/notifications`, {
            headers: { Authorization: "Bearer " + getToken() }
        });
        if (!resp.ok) return;
        const notifications = await resp.json();
        const unreadCount = notifications.filter(n => !n.isRead).length;
        
        const badge = document.getElementById("notificationCount");
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.classList.remove("hidden");
            } else {
                badge.classList.add("hidden");
            }
        }
        
        // Update dashboard summary if we are on dashboard
        updateDashboardNotifSummary(notifications.filter(n => !n.isRead).slice(0, 3));
    } catch (err) {
        console.error("Check notifications error:", err);
    }
}

async function loadNotificationsForDropdown() {
    const list = document.getElementById("notifDropdownList");
    if (!list) return;
    
    list.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>';
    
    try {
        const resp = await fetch(`${API}/notifications`, {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const notifications = await resp.json();
        
        if (notifications.length === 0) {
            list.innerHTML = '<div class="notif-placeholder">No notifications yet</div>';
            return;
        }
        
        list.innerHTML = notifications.slice(0, 10).map(notif => `
            <div class="notif-item ${notif.isRead ? '' : 'unread'}" onclick="markAsRead('${notif._id}')">
                <div class="notif-icon ${getNotifColor(notif.type)}">
                    <i class='${getNotifIcon(notif.type)}'></i>
                </div>
                <div class="notif-content">
                    <div class="notif-title">${notif.title}</div>
                    <div class="notif-message">${notif.message}</div>
                    <div class="notif-time">${new Date(notif.createdAt).toLocaleString([], {hour: '2-digit', minute:'2-digit', month:'short', day:'numeric'})}</div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = '<div class="notif-placeholder">Failed to load notifications</div>';
    }
}

async function markNotificationsAsRead() {
    try {
        await fetch(`${API}/notifications/read-all`, {
            method: "PUT",
            headers: { Authorization: "Bearer " + getToken() }
        });
        checkNotifications();
        if (!document.getElementById("notificationDropdown").classList.contains("hidden")) {
            loadNotificationsForDropdown();
        }
    } catch (err) {
        console.error("Mark all read error:", err);
    }
}

async function markAsRead(id) {
    try {
        await fetch(`${API}/notifications/${id}/read`, {
            method: "PUT",
            headers: { Authorization: "Bearer " + getToken() }
        });
        checkNotifications();
        loadNotificationsForDropdown();
    } catch (err) {
        console.error("Mark read error:", err);
    }
}

function getNotifIcon(type) {
    switch(type) {
        case 'complaint_status': return 'bx bx-info-circle';
        case 'assignment': return 'bx bx-user-plus';
        case 'concern_responded': return 'bx bx-reply';
        case 'concern_raised': return 'bx bx-error-circle';
        case 'legal_notice': return 'bx bx-shield-quarter';
        default: return 'bx bx-bell';
    }
}

function getNotifColor(type) {
    switch(type) {
        case 'complaint_status': return 'text-primary';
        case 'assignment': return 'text-success';
        case 'concern_responded': return 'text-warning';
        case 'concern_raised': return 'text-danger';
        case 'legal_notice': return 'text-danger';
        default: return 'text-secondary';
    }
}

function updateDashboardNotifSummary(notifs) {
    const container = document.getElementById("dashboardNotificationSummary");
    if (!container) return;
    
    if (notifs.length === 0) {
        container.innerHTML = '<p class="text-muted small">You are all caught up!</p>';
        return;
    }
    
    container.innerHTML = notifs.map(n => `
        <div class="notif-summary-item">
            <i class='${getNotifIcon(n.type)} ${getNotifColor(n.type)}' style="font-size: 1.25rem;"></i>
            <div style="flex: 1;">
                <div class="fw-bold small">${n.title}</div>
                <div class="text-muted smaller" style="font-size: 0.75rem;">${n.message}</div>
            </div>
            <div class="smaller text-muted" style="font-size: 0.7rem;">${new Date(n.createdAt).toLocaleDateString()}</div>
        </div>
    `).join('');
}
