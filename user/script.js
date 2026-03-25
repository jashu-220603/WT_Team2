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

    // Initialize profile images from stored info
    const storedName = sessionStorage.getItem('userName') || "Citizen";
    let storedPhoto = sessionStorage.getItem("citizenPhoto");
    
    // Sync if needed
    if (!storedPhoto) {
        const commonPhoto = sessionStorage.getItem("profilePhoto");
        const role = sessionStorage.getItem("role");
        if (commonPhoto && (role === "user" || role === "citizen")) {
            storedPhoto = commonPhoto;
            sessionStorage.setItem("citizenPhoto", commonPhoto);
        }
    }
    
    let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(storedName)}&background=6366f1&color=fff`;
    if (storedPhoto && storedPhoto !== "undefined" && storedPhoto !== "") {
        avatarUrl = storedPhoto.startsWith('http') ? storedPhoto : `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${storedPhoto}`;
    }
    const headerAv = document.getElementById("headerProfileAvatar");
    if (headerAv) headerAv.src = avatarUrl;

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
        "Cyber Crime": ["Online Fraud", "Hacking", "Identity Theft", "Phishing", "Social Media Harassment"],
        "Road Problems": ["Potholes", "Road Blockage", "Broken Street", "Poor Construction"],
        "Water Issues": ["No Water Supply", "Low Pressure", "Contaminated Water", "Pipeline Leakage"],
        "Electricity Issues": ["Frequent Power Cut", "Low Voltage", "Transformer Issue", "Sparking Wires"],
        "Sanitation Problems": ["Open Manhole", "Sewage Overflow", "Stagnant Water", "Lack of Public Toilets"]
    };

    // Category Grid Logic
    const categoryGrid = document.getElementById("categoryGrid");
    const complaintFormWrapper = document.getElementById("complaintFormWrapper");
    const complaintFormOverlay = document.getElementById("complaintFormOverlay");
    const backToCategories = document.getElementById("backToCategories");
    const selectedCategoryTitle = document.getElementById("selectedCategoryTitle");

    // Map categories to their icons
    const categoryIcons = {
        "Cyber Crime": "bx-fingerprint",
        "Road Problems": "bx-traffic-cone",
        "Water Issues": "bx-water",
        "Electricity Issues": "bx-bolt",
        "Sanitation Problems": "bx-leaf"
    };

    function openComplaintModal() {
        if (complaintFormOverlay) {
            complaintFormOverlay.classList.remove("hidden");
            document.body.style.overflow = "hidden"; // Prevent background scroll
        }
    }

    function closeComplaintModal() {
        if (complaintFormOverlay) {
            complaintFormOverlay.classList.add("hidden");
            document.body.style.overflow = ""; // Restore scroll
        }
    }

    function initCategoryGrid() {
        if (!categoryGrid) return;
        const cards = categoryGrid.querySelectorAll(".category-card");
        cards.forEach(card => {
            card.addEventListener("click", () => {
                const category = card.getAttribute("data-category");
                selectCategory(category);
            });
        });

        if (backToCategories) {
            backToCategories.addEventListener("click", () => {
                closeComplaintModal();
            });
        }

        // Close modal when clicking overlay backdrop (outside the dialog)
        if (complaintFormOverlay) {
            complaintFormOverlay.addEventListener("click", (e) => {
                if (e.target === complaintFormOverlay) {
                    closeComplaintModal();
                }
            });
        }

        // Close on Escape key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && complaintFormOverlay && !complaintFormOverlay.classList.contains("hidden")) {
                closeComplaintModal();
            }
        });
    }

    async function selectCategory(category) {
        if (!categorySelect || !complaintFormWrapper || !categoryGrid) return;

        // Find the card to get its theme accent
        const card = Array.from(categoryGrid.querySelectorAll(".category-card")).find(c => c.getAttribute("data-category") === category);
        if (card) {
            const accent = getComputedStyle(card).getPropertyValue('--accent');
            complaintFormWrapper.style.setProperty('--accent', accent);
        }

        // Set category in hidden input
        categorySelect.value = category;
        selectedCategoryTitle.textContent = category;

        // Update modal header icon
        const modalIcon = complaintFormWrapper.querySelector(".modal-category-icon i");
        if (modalIcon && categoryIcons[category]) {
            modalIcon.className = "bx " + categoryIcons[category];
        }
        
        // Populate subcategories immediately
        populateSubcategories(category);

        // Open the modal dialog
        openComplaintModal();

        // Auto-fill from profile when selecting category
        await autoFillComplaintForm();
    }

    async function autoFillComplaintForm() {
        const fullNameInput = document.getElementById("fullName");
        const phoneInput = document.getElementById("phone");
        
        if (!fullNameInput || !phoneInput) return;

        // Reset values to be empty so user has to type
        fullNameInput.value = "";
        phoneInput.value = "";

        // Try from session storage first for placeholders
        const sName = sessionStorage.getItem("userName");
        const sPhone = sessionStorage.getItem("userPhone"); 

        if (sName) fullNameInput.placeholder = sName;
        if (sPhone) phoneInput.placeholder = sPhone;

        // Fetch fresh if needed or always to be accurate
        try {
            const res = await fetch(`${API}/auth/me`, {
                headers: { Authorization: "Bearer " + getToken() }
            });
            if (res.ok) {
                const user = await res.json();
                if (user.name) fullNameInput.placeholder = user.name;
                if (user.contactNumber) {
                    phoneInput.placeholder = user.contactNumber;
                    sessionStorage.setItem("userPhone", user.contactNumber);
                }
            }
        } catch (err) {
            console.error("Auto-placeholder error", err);
        }
    }

    initCategoryGrid();

    function populateSubcategories(category) {
        if (!subcategorySelect) return;
        subcategorySelect.innerHTML = '<option value="" disabled selected>Select Subcategory</option>';
        if (subcategoriesData[category]) {
            subcategoriesData[category].forEach(sub => {
                const opt = document.createElement("option");
                opt.value = sub;
                opt.textContent = sub;
                subcategorySelect.appendChild(opt);
            });
            subcategorySelect.disabled = false;
        } else {
            subcategorySelect.disabled = true;
        }
    }

    if (categorySelect && categorySelect.tagName === 'SELECT') {
        categorySelect.addEventListener("change", function() {
            populateSubcategories(this.value);
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

        const uploadArea = evidenceInput.closest('.upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('click', (e) => {
                if (e.target !== evidenceInput) evidenceInput.click();
            });
        }
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

                // Auto-sync phone number to profile
                const phoneVal = document.getElementById("phone")?.value?.trim();
                if (phoneVal) {
                    const phoneForm = new FormData();
                    phoneForm.append("contactNumber", phoneVal);
                    fetch(`${API}/auth/profile`, {
                        method: "PUT",
                        headers: { Authorization: "Bearer " + getToken() },
                        body: phoneForm
                    }).catch(() => {}); // Silent sync — no error needed
                }

                // Reset form
                complaintForm.reset();
                if (subcategorySelect) {
                    subcategorySelect.innerHTML = '<option value="" disabled selected>Select Subcategory</option>';
                }
                if (fileNameDisplay) fileNameDisplay.textContent = "";
                
                // Return to categories
                if (backToCategories) backToCategories.click();

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
    const concernModalOverlay = document.getElementById("concernModalOverlay");

    function openConcernModal() {
        if (concernModalOverlay) {
            concernModalOverlay.classList.remove("hidden");
            document.body.style.overflow = "hidden";
        }
    }

    function closeConcernModal() {
        if (concernModalOverlay) {
            concernModalOverlay.classList.add("hidden");
            document.body.style.overflow = "";
            
            // Reset form and success message on close
            if (concernForm) concernForm.reset();
            const successMsg = document.getElementById("concernSuccess");
            if (successMsg) successMsg.classList.add("hidden");
            const fileDisplay = document.getElementById("concernFileNameDisplay");
            if (fileDisplay) fileDisplay.textContent = "";
        }
    }

    if (showConcernFormBtn) {
        showConcernFormBtn.addEventListener("click", openConcernModal);
    }

    if (cancelConcernBtn) {
        cancelConcernBtn.addEventListener("click", (e) => {
            e.preventDefault();
            closeConcernModal();
        });
    }

    // Close concern modal on backdrop click
    if (concernModalOverlay) {
        concernModalOverlay.addEventListener("click", (e) => {
            if (e.target === concernModalOverlay) {
                closeConcernModal();
            }
        });
    }

    // File name display for concern evidence
    const concernEvidence = document.getElementById("concernEvidence");
    const concernFileNameDisplay = document.getElementById("concernFileNameDisplay");
    if (concernEvidence && concernFileNameDisplay) {
        concernEvidence.addEventListener("change", function() {
            if (this.files && this.files.length > 0) {
                concernFileNameDisplay.textContent = `Selected File: ${this.files[0].name}`;
            } else {
                concernFileNameDisplay.textContent = "";
            }
        });

        const concernUploadArea = concernEvidence.closest('.upload-area');
        if (concernUploadArea) {
            concernUploadArea.addEventListener('click', (e) => {
                if (e.target !== concernEvidence) concernEvidence.click();
            });
        }
    }

    if (concernForm) {
        concernForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const submitBtn = this.querySelector('button[type="submit"]');
            const compIDInput = document.getElementById("concernComplaintId");
            const description = document.getElementById("concernDescription").value;
            const evidence = document.getElementById("concernEvidence").files[0];
            const successMsg = document.getElementById("concernSuccess");

            // Reset success/error message
            if (successMsg) successMsg.classList.add("hidden");

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
                    if (successMsg) {
                        // Ensure it's styled as a success box if it passes
                        successMsg.className = "text-success text-center mt-3 fw-bold p-3 rounded";
                        successMsg.style.background = "#ecfdf5";
                        successMsg.style.border = "1px solid #a7f3d0";
                        successMsg.innerHTML = `<i class='bx bx-check-circle'></i> Concern submitted successfully!`;
                        successMsg.classList.remove("hidden");
                    }
                    
                    setTimeout(() => {
                        closeConcernModal();
                    }, 3000);

                } else {
                    const data = await res.json();
                    if (successMsg) {
                        successMsg.className = "text-danger text-center mt-3 fw-bold p-3 rounded";
                        successMsg.style.background = "#fef2f2";
                        successMsg.style.border = "1px solid #fecaca";
                        // The backend provides the exact "available in X working day(s)" message
                        successMsg.innerHTML = `<i class='bx bx-error-circle'></i> ${data.message || "Error raising concern."}`;
                        successMsg.classList.remove("hidden");
                        
                        setTimeout(() => {
                            closeConcernModal();
                        }, 5000);
                    }
                }
            } catch (err) {
                console.error(err);
                if (successMsg) {
                    successMsg.className = "text-danger text-center mt-3 fw-bold p-3 rounded";
                    successMsg.style.background = "#fef2f2";
                    successMsg.style.border = "1px solid #fecaca";
                    successMsg.innerHTML = `<i class='bx bx-error-circle'></i> Failed to submit concern.`;
                    successMsg.classList.remove("hidden");
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<span>Submit Concern</span>\n                                <i class='bx bx-send'></i>`;
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
                    if (complaint.createdAt) {
                        concernCompId.setAttribute('data-created-at', complaint.createdAt);
                    }
                    
                    // Add click event for the raise concern button to check eligibility
                    const rcBtn = document.getElementById("triggerRaiseConcernBtn");
                    if (rcBtn) {
                        rcBtn.onclick = () => checkConcernEligibility(complaint._id, complaint.complaintId);
                    }
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

                // Animate stepper — cumulative activation
                // Step 1: Submitted (always active once complaint exists)
                setTimeout(() => { activateStep('step-submitted'); }, 200);

                if (["Assigned", "In Progress", "Resolved", "Closed"].includes(status)) {
                    setTimeout(() => {
                        document.getElementById('conn-1').classList.add('active');
                        activateStep('step-assigned');
                    }, 600);
                }

                if (["In Progress", "Resolved", "Closed"].includes(status)) {
                    setTimeout(() => {
                        document.getElementById('conn-2').classList.add('active');
                        activateStep('step-inprogress');
                    }, 1000);
                }

                if (["Resolved", "Closed"].includes(status)) {
                    setTimeout(() => {
                        document.getElementById('conn-3').classList.add('active');
                        activateStep('step-pending');
                    }, 1400);
                    setTimeout(() => {
                        document.getElementById('conn-4').classList.add('active');
                        activateStep('step-resolved');
                    }, 1800);
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
                // 1. Update rating on the complaint document itself
                const compRes = await fetch(`${API}/complaints/${complaintId}/rate`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
                    body: JSON.stringify({ rating: ratingInput.value, feedback })
                });

                // 2. Also submit to centralized feedback system with officer link
                const storedName = sessionStorage.getItem('userName') || "Citizen";
                const storedEmail = sessionStorage.getItem('userEmail') || "citizen@portal.com";
                
                // Fetch complaint to get assignedOfficer
                let officerId = null;
                try {
                    const cResp = await fetch(`${API}/complaints/${complaintId}`, {
                        headers: { Authorization: "Bearer " + getToken() }
                    });
                    if (cResp.ok) {
                        const cData = await cResp.json();
                        officerId = cData.assignedOfficer?._id || cData.assignedOfficer || null;
                    }
                } catch(e) {}
                
                await fetch(`${API}/feedback/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
                    body: JSON.stringify({ 
                        name: storedName, 
                        email: storedEmail, 
                        feedbackText: `Rating: ${ratingInput.value}/5. ${feedback}`,
                        type: 'Complaint',
                        complaintId: complaintId,
                        officerId: officerId,
                        rating: parseInt(ratingInput.value)
                    })
                });

                if (compRes.ok) {
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

                complaints.slice(0, 4).forEach(c => {
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
        let storedPhoto = sessionStorage.getItem("citizenPhoto");
        
        // Sync if needed
        if (!storedPhoto) {
            const commonPhoto = sessionStorage.getItem("profilePhoto");
            const role = sessionStorage.getItem("role");
            if (commonPhoto && (role === "user" || role === "citizen")) {
                storedPhoto = commonPhoto;
                sessionStorage.setItem("citizenPhoto", commonPhoto);
            }
        }

        if (storedPhoto && storedPhoto !== "undefined" && storedPhoto !== "") {
            avatarUrl = storedPhoto.startsWith('http') ? storedPhoto : `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${storedPhoto}`;
        }
        
        const headerAv = document.getElementById("headerProfileAvatar");
        if (headerAv) headerAv.src = avatarUrl;
        const panelAv = document.getElementById("panelProfileAvatar");
        if (panelAv) panelAv.src = avatarUrl;
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
            
            if(navLink) {
                navLink.click();
            } else {
                // Support standalone sections like profile
                navLinks.forEach(l => l.classList.remove("active"));
                sections.forEach(sec => sec.classList.add("hidden"));
                const targetEl = document.getElementById(target);
                if(targetEl) targetEl.classList.remove("hidden");
                
                if (target === "profile-section") loadStandaloneProfile();
                
                if (window.innerWidth < 768) {
                    sidebar.classList.add("closed");
                }
            }
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
                        id: id,
                        text: `Complaint ${id} has been assigned to an officer.`,
                        time: new Date(c.updatedAt || c.createdAt),
                        type: 'info', icon: 'bx-user-pin'
                    });
                } else if(c.status === "In Progress") {
                    notifications.push({
                        id: id,
                        text: `Complaint ${id} is currently under review / in progress.`,
                        time: new Date(c.updatedAt || c.createdAt),
                        type: 'info', icon: 'bx-cog'
                    });
                } else if(["Resolved", "Closed"].includes(c.status)) {
                    notifications.push({
                        id: id,
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
                        <div class="notification-item" onclick="window.viewComplaintDetails('${n.id}')" style="cursor: pointer;">
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
    let feedbackComplaintsCache = [];

    async function loadFeedbackDropdown() {
        const select = document.getElementById("feedbackComplaintSelect");
        if(!select) return;
        
        try {
            const resp = await fetch(`${API}/complaints`, {
                headers: { Authorization: "Bearer " + getToken() }
            });
            const complaints = await resp.json();
            
            const resolved = complaints.filter(c => ["Resolved", "Closed"].includes(c.status));
            feedbackComplaintsCache = resolved; // cache for officer lookup
            
            select.innerHTML = '<option value="" disabled selected>Select a complaint</option>';
            if (resolved.length === 0) {
                select.innerHTML += '<option disabled>No resolved complaints yet</option>';
            } else {
                resolved.forEach(c => {
                    const id = c.complaintId || c._id.substring(0,8);
                    const category = c.category || c.title || 'Complaint';
                    select.innerHTML += `<option value="${c._id}">${id} — ${category}</option>`;
                });
            }
            
        } catch(err) {
            console.error("Feedback dropdown err", err);
        }
    }

    const standaloneFeedbackForm = document.getElementById("standaloneFeedbackForm");
    if(standaloneFeedbackForm) {
        standaloneFeedbackForm.addEventListener("submit", async(e) => {
            e.preventDefault();
            const cid = document.getElementById("feedbackComplaintSelect").value;
            const text = document.getElementById("standaloneFeedbackText").value.trim();
            const ratingEl = document.querySelector('input[name="standaloneRating"]:checked');
            
            if(!cid) { alert("Please select a complaint."); return; }
            if(!ratingEl) { alert("Please provide a star rating."); return; }
            if(!text) { alert("Please add a comment."); return; }
            
            // Get officerId from cache
            const complaintObj = feedbackComplaintsCache.find(c => c._id === cid);
            const officerId = complaintObj?.assignedOfficer?._id || complaintObj?.assignedOfficer || null;

            try {
                // 1. Update rating on the complaint document
                const compRes = await fetch(`${API}/complaints/${cid}/rate`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
                    body: JSON.stringify({ rating: ratingEl.value, feedback: text })
                });

                // 2. Submit to centralized feedback system with officer link
                const storedName = sessionStorage.getItem('userName') || "Citizen";
                const storedEmail = sessionStorage.getItem('userEmail') || "citizen@portal.com";

                await fetch(`${API}/feedback/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
                    body: JSON.stringify({ 
                        name: storedName, 
                        email: storedEmail, 
                        feedbackText: `Rating: ${ratingEl.value}/5. ${text}`,
                        type: 'Complaint',
                        complaintId: cid,
                        officerId: officerId,
                        rating: parseInt(ratingEl.value)
                    })
                });
                
                if(compRes.ok) {
                    standaloneFeedbackForm.classList.add("hidden");
                    document.getElementById("standaloneFeedbackSuccess").classList.remove("hidden");
                } else {
                    const err = await compRes.json();
                    alert("Failed to submit feedback: " + (err.message || "Unknown error"));
                }
            } catch(e) {
                console.error(e);
                alert("Error submitting feedback.");
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
            // Use contactNumber from DB (the correct field)
            if (document.getElementById("profPhoneMain")) document.getElementById("profPhoneMain").value = user.contactNumber || "";
            if (document.getElementById("profAddressMain")) document.getElementById("profAddressMain").value = user.address || "";
            
            let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name||"Citizen")}&background=6366f1&color=fff`;
            if (user.profilePhoto && user.profilePhoto !== '' && user.profilePhoto !== 'undefined') {
                avatarUrl = user.profilePhoto.startsWith('http') ? user.profilePhoto : `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${user.profilePhoto}`;
                sessionStorage.setItem("citizenPhoto", user.profilePhoto);
                sessionStorage.setItem("profilePhoto", user.profilePhoto);
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
                            sessionStorage.setItem("citizenPhoto", data.user.profilePhoto);
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
        standaloneProfileForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const submitBtn = standaloneProfileForm.querySelector('button[type="submit"]');
            if(submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Saving...";
            }

            const name = document.getElementById("profNameMain").value.trim();
            const phone = document.getElementById("profPhoneMain").value.trim();
            const photoPicker = document.getElementById("profPhotoMain");
            const photo = photoPicker ? photoPicker.files[0] : null;

            if (!name) {
                alert("Name is required.");
                if(submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Update Profile"; }
                return;
            }

            const formData = new FormData();
            formData.append("name", name);
            formData.append("contactNumber", phone);
            if (photo) formData.append("profilePhoto", photo);

            try {
                const res = await fetch(`${API}/auth/profile`, {
                    method: "PUT",
                    headers: { "Authorization": `Bearer ${getToken()}` },
                    body: formData
                });

                if (res.ok) {
                    const data = await res.json();
                    // Update session
                    sessionStorage.setItem('userName', name);
                    if (userGreeting) userGreeting.textContent = `Welcome, ${name}`;
                    // Update panel name
                    const panelName = document.getElementById("panelUserName");
                    if (panelName) panelName.textContent = name;
                    
                    // Update avatar if photo changed
                    if (data.user && data.user.profilePhoto) {
                        sessionStorage.setItem("citizenPhoto", data.user.profilePhoto);
                        sessionStorage.setItem("profilePhoto", data.user.profilePhoto);
                        const photoUrl = data.user.profilePhoto.startsWith('http') ? data.user.profilePhoto : `${window.API_BASE_URL || "http://localhost:7000"}/uploads/${data.user.profilePhoto}`;
                        
                        const profImg = document.getElementById("standaloneProfileImg");
                        if (profImg) profImg.src = photoUrl;
                        const headerAv = document.getElementById("headerProfileAvatar");
                        if (headerAv) headerAv.src = photoUrl;
                        sessionStorage.setItem("profilePhoto", data.user.profilePhoto);
                    }
                    // Show success inline
                    let successMsg = document.getElementById("profileUpdateSuccess");
                    if (!successMsg) {
                        successMsg = document.createElement("p");
                        successMsg.id = "profileUpdateSuccess";
                        successMsg.style.cssText = "color:#10B981; font-weight:600; text-align:center; margin-top:0.5rem;";
                        standaloneProfileForm.appendChild(successMsg);
                    }
                    successMsg.innerHTML = "<i class='bx bx-check-circle'></i> Profile updated successfully!";
                    setTimeout(() => { successMsg.innerHTML = ""; }, 4000);
                } else {
                    const err = await res.json();
                    alert("Failed to update profile: " + (err.message || "Unknown error"));
                }
            } catch (err) {
                console.error(err);
                alert("Error updating profile. Make sure the server is running.");
            } finally {
                if(submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Update Profile"; }
            }
        });

        // Photo preview
        const profPhotoMain = document.getElementById("profPhotoMain");
        if (profPhotoMain) {
            profPhotoMain.addEventListener("change", function() {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const profImg = document.getElementById("standaloneProfileImg");
                        if (profImg) profImg.src = e.target.result;
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

    // Initialize with fresh user data if needed
    if (getToken()) {
        try {
            fetch(`${API}/auth/me`, { 
                headers: { Authorization: "Bearer " + getToken() }
            }).then(r => r.json()).then(data => {
                sessionStorage.setItem("userEmail", data.email);
                sessionStorage.setItem("userName", data.name);
                if (data.profilePhoto) {
                    sessionStorage.setItem("citizenPhoto", data.profilePhoto);
                    sessionStorage.setItem("profilePhoto", data.profilePhoto);
                    // Update header avatar if it was already set to fallback
                    const avatarUrl = data.profilePhoto.startsWith('http') ? data.profilePhoto : `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${data.profilePhoto}`;
                    const headerAv = document.getElementById("headerProfileAvatar");
                    if (headerAv) headerAv.src = avatarUrl;
                }
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

// Mark single notification as read and handle navigation
async function handleNotificationClick(notifId, type, complaintId, concernId) {
    try {
        await markAsRead(notifId);
        
        // Navigate based on type and attached IDs
        if (complaintId) {
            // Wait a bit for the UI to update if needed
            setTimeout(() => {
                window.viewComplaintDetails(complaintId);
            }, 100);
        } else if (type === 'general' || type === 'alert') {
            switchPage('notifications-section');
        }
    } catch (err) {
        console.error("Error handling notification click:", err);
    }
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
        
        list.innerHTML = notifications.slice(0, 10).map(notif => {
            const complaintIdStr = notif.relatedComplaint ? (notif.relatedComplaint.complaintId || notif.relatedComplaint) : '';
            return `
            <div class="notif-item ${notif.isRead ? '' : 'unread'}" onclick="handleNotificationClick('${notif._id}', '${notif.type}', '${complaintIdStr}', '${notif.relatedConcern || ''}')">
                <div class="notif-icon ${getNotifColor(notif.type)}">
                    <i class='${getNotifIcon(notif.type)}'></i>
                </div>
                <div class="notif-content">
                    <div class="notif-title">${notif.title}</div>
                    <div class="notif-message">${notif.message}</div>
                    <div class="notif-time">${new Date(notif.createdAt).toLocaleString([], {hour: '2-digit', minute:'2-digit', month:'short', day:'numeric'})}</div>
                </div>
            </div>
            `;
        }).join('');
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

// --- CONCERN ESCALATION LOGIC ---

async function checkConcernEligibility(realId, displayId) {
    try {
        const res = await fetch(`${API}/concerns/eligible/${realId}`, {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const data = await res.json();
        
        if (data.eligible) {
            document.getElementById('rc-cid').value = realId;
            document.getElementById('rc-complaint-id').textContent = displayId;
            document.getElementById('rc-escalation').textContent = data.nextEscalationLevel + " (" + (data.concernCount + 1) + "/3)";
            document.getElementById('raiseConcernModal').classList.remove('hidden');
        } else {
            alert("Concern Eligibility: " + data.reason);
        }
    } catch (err) {
        console.error("Eligibility check error", err);
        alert("Failed to check concern eligibility. Please try again later.");
    }
}

const raiseConcernForm = document.getElementById('raise-concern-form');
if (raiseConcernForm) {
    raiseConcernForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const complaintId = document.getElementById('rc-cid').value;
        const description = document.getElementById('rc-description').value;
        const imageFile = document.getElementById('rc-image').files[0];
        
        const formData = new FormData();
        formData.append('complaintId', complaintId);
        formData.append('description', description);
        if (imageFile) formData.append('image', imageFile);
        
        const submitBtn = raiseConcernForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        try {
            const res = await fetch(`${API}/concerns`, {
                method: "POST",
                headers: { Authorization: "Bearer " + getToken() },
                body: formData
            });
            
            const data = await res.json();
            if (res.ok) {
                alert(`Concern raised successfully! Escalation Level: ${data.escalationLevel}`);
                document.getElementById('raiseConcernModal').classList.add('hidden');
                raiseConcernForm.reset();
            } else {
                alert(data.message || "Failed to raise concern.");
            }
        } catch (err) {
            console.error("Raise concern error", err);
            alert("Failed to raise concern. Please check your connection.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Concern';
        }
    });
}

document.getElementById('closeRaiseConcernModal')?.addEventListener('click', () => {
    document.getElementById('raiseConcernModal').classList.add('hidden');
});

// Replace the existing handleRaiseConcern
async function handleRaiseConcern(e) {
    e.preventDefault();
    const inputField = document.getElementById("concernComplaintId");
    const realId = inputField.getAttribute('data-real-id');
    const displayId = inputField.value;
    
    if (!realId) {
        alert("Please track a valid complaint first.");
        return;
    }
    
    checkConcernEligibility(realId, displayId);
}

// Ensure the form uses the new handler
const oldConcernForm = document.getElementById("concernForm");
if (oldConcernForm) {
    // Remove old listeners if any (by replacing the button or cloning form) - simplest is to just overwrite onsubmit
    oldConcernForm.onsubmit = handleRaiseConcern;
    // Remove the old addEventListener if it existed by replacing the element
    const newForm = oldConcernForm.cloneNode(true);
    oldConcernForm.parentNode.replaceChild(newForm, oldConcernForm);
    newForm.addEventListener("submit", handleRaiseConcern);
    
    // Wire up the button for eligibility check directly
    const triggerBtn = newForm.querySelector('button');
    if (triggerBtn) {
        triggerBtn.id = "triggerRaiseConcernBtn";
        triggerBtn.type = "button"; // Change from submit to button so it doesn't trigger standard form submission
        triggerBtn.addEventListener("click", () => {
            const inputField = document.getElementById("concernComplaintId");
            const realId = inputField.getAttribute('data-real-id');
            const displayId = inputField.value;
            if (realId) checkConcernEligibility(realId, displayId);
            else alert("Please track a valid complaint first.");
        });
    }
}

// --- VIEW CONCERNS LOGIC ---
const viewConcernsBtn = document.getElementById("viewConcernsBtn");
if (viewConcernsBtn) {
    // Overwrite any existing onclick from the HTML
    viewConcernsBtn.onclick = async (e) => {
        e.preventDefault();
        const inputField = document.getElementById("concernComplaintId");
        const realId = inputField.getAttribute('data-real-id');
        
        if (!realId) {
            alert("No tracked complaint found.");
            return;
        }

        const container = document.getElementById("view-concerns-container");
        container.innerHTML = '<div class="text-center p-4">Loading concerns...</div>';
        document.getElementById('viewConcernsModal').classList.remove('hidden');

        try {
            const res = await fetch(`${API}/concerns/${realId}`, {
                headers: { Authorization: "Bearer " + getToken() }
            });
            const concerns = await res.json();
            
            if (concerns.length === 0) {
                container.innerHTML = '<div class="text-center p-4 text-muted">No concerns raised for this complaint yet.</div>';
                return;
            }

            let html = '';
            concerns.forEach((c, index) => {
                const isWarning = c.escalationLevel === 'Warning';
                const isCritical = c.escalationLevel === 'Critical';
                let borderClass = 'border-info';
                if (isWarning) borderClass = 'border-warning';
                if (isCritical) borderClass = 'border-danger';

                const imageUrl = c.image ? `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${c.image}` : null;
                
                html += `
                <div class="mb-3 p-3 bg-light rounded border-start border-4 ${borderClass}">
                    <div class="d-flex justify-content-between mb-2">
                        <strong class="${isCritical ? 'text-danger' : isWarning ? 'text-warning text-dark' : 'text-info'}">
                            Concern #${c.concernNumber} (${c.escalationLevel})
                        </strong>
                        <small class="text-muted">${new Date(c.createdAt).toLocaleDateString()}</small>
                    </div>
                    <p class="mb-2" style="font-size: 0.9rem;">${c.description}</p>
                    ${imageUrl ? `<img src="${imageUrl}" class="img-fluid rounded mb-2" style="max-height: 150px; display: block;">` : ''}
                    <div class="d-flex justify-content-between align-items-center bg-white p-2 rounded border small mt-2">
                        <span><strong>Status:</strong> <span class="badge ${c.status === 'Pending' ? 'bg-danger' : 'bg-success'}">${c.status}</span></span>
                        ${c.adminResponse ? `<span class="text-success fw-bold"><i class="bx bx-check-circle"></i> Resolved by Admin</span>` : '<span class="text-danger small">Awaiting Review</span>'}
                    </div>
                    ${c.adminResponse ? `
                    <div class="mt-2 p-2 bg-success bg-opacity-10 border border-success rounded small">
                        <strong>Admin Response:</strong><br>${c.adminResponse}
                    </div>` : ''}
                </div>`;
            });
            container.innerHTML = html;
        } catch (err) {
            console.error("View concerns error", err);
            container.innerHTML = '<div class="text-center p-4 text-danger">Failed to load concern history.</div>';
        }
    };
}

document.getElementById('closeViewConcernsModal')?.addEventListener('click', () => {
    document.getElementById('viewConcernsModal').classList.add('hidden');
});

// =====================
// DARK MODE & THEME SYNC
// =====================
document.addEventListener('DOMContentLoaded', () => {
    const themeBtnUser = document.getElementById('themeToggleBtnUser');
    const themeCheckbox = document.getElementById('themeToggleCheckbox');
    
    function updateThemeUI(isDark) {
        if (isDark) {
            document.body.classList.add('dark-mode');
            if (themeBtnUser) {
                const icon = themeBtnUser.querySelector('i');
                if (icon) icon.className = 'bx bx-sun';
            }
            if (themeCheckbox) themeCheckbox.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            if (themeBtnUser) {
                const icon = themeBtnUser.querySelector('i');
                if (icon) icon.className = 'bx bx-moon';
            }
            if (themeCheckbox) themeCheckbox.checked = false;
        }
    }

    // Initial load
    const savedTheme = localStorage.getItem('theme');
    updateThemeUI(savedTheme === 'dark');

    // Header Toggle
    if (themeBtnUser) {
        themeBtnUser.addEventListener('click', () => {
            const isDarkNow = !document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDarkNow ? 'dark' : 'light');
            updateThemeUI(isDarkNow);
        });
    }

    // Settings Toggle
    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', () => {
            const isDarkNow = themeCheckbox.checked;
            localStorage.setItem('theme', isDarkNow ? 'dark' : 'light');
            updateThemeUI(isDarkNow);
        });
    }

    // =====================
    // SETTINGS ACTIONS
    // =====================
    const pwdUpdateBtn = document.getElementById('pwdUpdateBtn');
    if (pwdUpdateBtn) {
        pwdUpdateBtn.addEventListener('click', () => {
            const currentPwd = document.getElementById('currentPassword').value;
            const newPwd = document.getElementById('newPassword').value;
            
            if (!currentPwd || !newPwd) {
                alert('Please fill in both password fields.');
                return;
            }

            // In a real app, this would be an API call
            pwdUpdateBtn.disabled = true;
            pwdUpdateBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Updating...';
            
            setTimeout(() => {
                alert('Password updated successfully!');
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                pwdUpdateBtn.disabled = false;
                pwdUpdateBtn.textContent = 'Update Password';
            }, 1500);
        });
    }

    // =====================
    // FEEDBACK INTERACTIONS
    // =====================
    const feedbackForm = document.getElementById('standaloneFeedbackForm');
    const moodItems = document.querySelectorAll('.mood-item');
    const tagChips = document.querySelectorAll('.tag-chip');
    const feedbackFormCard = document.getElementById('feedbackFormCard');
    const feedbackSuccessCard = document.getElementById('standaloneFeedbackSuccess');

    // Mood Selection Logic
    moodItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all
            moodItems.forEach(m => m.classList.remove('active'));
            // Add to current
            item.classList.add('active');
            
            // Sync with star rating
            const ratingValue = item.getAttribute('data-rating');
            const starInput = document.getElementById(`sr${ratingValue}`);
            if (starInput) starInput.checked = true;
        });
    });

    // Tag Chips Selection
    tagChips.forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
        });
    });

    // Feedback Submission
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const submitBtn = feedbackForm.querySelector('.feedback-submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Submitting...';

            // Simulate API call
            setTimeout(() => {
                feedbackFormCard.classList.add('hidden');
                feedbackSuccessCard.classList.remove('hidden');
                
                // Optional: Scroll to top of section
                document.getElementById('feedback-section').scrollIntoView({ behavior: 'smooth' });
            }, 1500);
        });
    }
});

