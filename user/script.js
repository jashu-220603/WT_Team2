// --- GLOBAL DATA ---
// Simple array to store complaints locally for the simulation
let complaintsDB = [];

// --- UTILITIES & NAVIGATION ---
document.addEventListener("DOMContentLoaded", () => {
    
    // Sidebar Toggle
    const sidebar = document.getElementById("sidebar");
    const btnMenu = document.getElementById("btn-menu");
    
    if(btnMenu) {
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
            // Remove active from all links
            navLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            // Hide all sections
            sections.forEach(sec => sec.classList.add("hidden"));

            // Show target section
            const targetId = link.getAttribute("data-target");
            document.getElementById(targetId).classList.remove("hidden");

            // If dashboard selected, update stats
            if(targetId === "dashboard-section") {
                updateDashboard();
            }

            // Close sidebar on small screens
            if(window.innerWidth < 768) {
                sidebar.classList.add("closed");
            }
        });
    });

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
            
            setTimeout(() => {
                ripples.remove();
            }, 1000);
        });
    });

    
    // --- 1. LOGIN PAGE LOGIC ---
    const loginForm = document.getElementById("loginForm");
    const loginSection = document.getElementById("login-section");
    const appWrapper = document.getElementById("app-wrapper");
    const emailInput = document.getElementById("email");
    const passInput = document.getElementById("password");
    const emailError = document.getElementById("emailError");
    const userGreeting = document.getElementById("userGreeting");

    if(loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            // Basic validation
            let isValid = true;
            const emailVal = emailInput.value.trim();
            const passVal = passInput.value.trim();

            if(!emailVal.includes("@") || !emailVal.includes(".")) {
                emailInput.parentElement.parentElement.classList.add("input-error");
                isValid = false;
            } else {
                emailInput.parentElement.parentElement.classList.remove("input-error");
            }

            if(passVal.length < 4) {
                passInput.parentElement.parentElement.classList.add("input-error");
                isValid = false;
            } else {
                passInput.parentElement.parentElement.classList.remove("input-error");
            }

            if(isValid) {
                // Simulate login
                setTimeout(() => {
                    loginSection.classList.add("hidden");
                    appWrapper.classList.remove("hidden");
                    
                    // Extract name from email for greeting
                    const name = emailVal.split("@")[0];
                    userGreeting.textContent = `Welcome, ${name.charAt(0).toUpperCase() + name.slice(1)}`;

                    // Reset forms
                    loginForm.reset();
                    
                    // Activate File Complaint page by default
                    navLinks[0].click();
                }, 500);
            }
        });
    }

    // Logout Logic
    const logoutBtn = document.getElementById("logoutBtn");
    if(logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            appWrapper.classList.add("hidden");
            loginSection.classList.remove("hidden");
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

    if(categorySelect) {
        categorySelect.addEventListener("change", function() {
            const selected = this.value;
            subcategorySelect.innerHTML = '<option value="" disabled selected>Select Subcategory</option>';
            
            if(subcategoriesData[selected]) {
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

    if(getLocationBtn) {
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
                        console.error("Error Code = " + error.code + " - " + error.message);
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
    
    if(evidenceInput) {
        evidenceInput.addEventListener("change", function() {
            if(this.files && this.files.length > 0) {
                fileNameDisplay.textContent = `Selected File: ${this.files[0].name}`;
            } else {
                fileNameDisplay.textContent = "";
            }
        });
    }

    // Form Submission & ID Generation
    const complaintForm = document.getElementById("complaintForm");
    const successModal = document.getElementById("successModal");
    const popupComplaintId = document.getElementById("popupComplaintId");
    
    if(complaintForm) {
        complaintForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            // Generate Random ID (CMP + 6 digits)
            const randomNum = Math.floor(100000 + Math.random() * 900000);
            const genId = "CMP" + randomNum;
            
            const citizenName = document.getElementById("fullName").value;
            const category = document.getElementById("category").value;
            
            // Save to DB simulation
            const newComplaint = {
                id: genId,
                name: citizenName,
                type: category,
                date: new Date().toLocaleDateString(),
                status: "Assigned" // initial status
            };
            
            complaintsDB.unshift(newComplaint); // Add to beginning
            
            // Show popup
            popupComplaintId.textContent = genId;
            successModal.classList.remove("hidden");
            
            // Reset form
            complaintForm.reset();
            subcategorySelect.innerHTML = '<option value="" disabled selected>Select category first</option>';
            subcategorySelect.disabled = true;
            fileNameDisplay.textContent = "";
            // Reset readonly state if changed by geo error
            locationInput.setAttribute("readonly", true);
        });
    }

    // Modal Interactions
    const closeModalBtn = document.getElementById("closeModalBtn");
    const copyIdBtn = document.getElementById("copyIdBtn");
    const copyToast = document.getElementById("copyToast");

    if(closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            successModal.classList.add("hidden");
            
            // Pre-fill tracking ID and navigate to track page
            document.getElementById("trackIdInput").value = popupComplaintId.textContent;
            
            // Ensure the result is hidden until "Check Status" is clicked
            document.getElementById("trackingResult").classList.add("hidden");
            document.getElementById("trackIdInput").focus();
            
            navLinks[1].click(); // Track page is index 1
        });
    }

    if(copyIdBtn) {
        copyIdBtn.addEventListener("click", () => {
            const idToCopy = popupComplaintId.textContent;
            navigator.clipboard.writeText(idToCopy).then(() => {
                copyIdBtn.innerHTML = "<i class='bx bx-check'></i> Copied!";
                copyToast.classList.add("show-right");
                setTimeout(() => {
                    copyToast.classList.remove("show-right");
                    copyIdBtn.innerHTML = "<i class='bx bx-copy'></i> Copy Complaint ID";
                    // Redirect user automatically
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

    if(trackForm) {
        trackForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const searchId = trackIdInput.value.trim().toUpperCase();
            if(!searchId) return;

            // Find complaint in DB
            const complaint = complaintsDB.find(c => c.id === searchId);
            
            displayTrackId.textContent = searchId;
            
            // Visual reset
            resetStepper();
            trackingResult.classList.remove("hidden");
            trackingResult.style.opacity = '0';
            setTimeout(() => { trackingResult.style.opacity = '1'; }, 50);

            // Simulate finding and status logic
            // If complaint exists, progress up to its status, else default simulate
            let targetStatus = complaint ? complaint.status : "Pending"; 
            
            // For demo purposes, we randomly simulate progression if not found in our list
            if(!complaint) {
                const statuses = ["Assigned", "In Progress", "Pending", "Resolved"];
                targetStatus = statuses[Math.floor(Math.random() * statuses.length)];
            }

            displayBadge.textContent = targetStatus;
            
            // Badge color
            if(targetStatus === "Assigned") displayBadge.style.background = "#e0e7ff";
            else if(targetStatus === "In Progress") displayBadge.style.background = "#fef3c7";
            else if(targetStatus === "Pending") displayBadge.style.background = "#ffedd5";
            else if(targetStatus === "Resolved") displayBadge.style.background = "#d1fae5";

            // Animate stepper based on status
            setTimeout(() => { activateStep('step-assigned'); }, 200);
            
            if(["In Progress", "Pending", "Resolved"].includes(targetStatus)) {
                setTimeout(() => {
                    document.getElementById('conn-1').classList.add('active');
                    activateStep('step-inprogress'); 
                }, 800);
            }
            if(["Pending", "Resolved"].includes(targetStatus)) {
                setTimeout(() => { 
                    document.getElementById('conn-2').classList.add('active');
                    activateStep('step-pending'); 
                }, 1400);
            }
            if(targetStatus === "Resolved") {
                setTimeout(() => { 
                    document.getElementById('conn-3').classList.add('active');
                    activateStep('step-resolved'); 
                }, 2000);
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
        document.getElementById(id).classList.add('active');
    }

    
    // --- 4. DASHBOARD LOGIC ---
    function updateDashboard() {
        // Calculate stats
        const total = complaintsDB.length;
        const pending = complaintsDB.filter(c => c.status === "Pending" || c.status === "Assigned" || c.status === "In Progress").length;
        const solved = complaintsDB.filter(c => c.status === "Resolved").length;

        document.getElementById("stat-total").textContent = total;
        document.getElementById("stat-pending").textContent = pending;
        document.getElementById("stat-solved").textContent = solved;

        // Populate Table
        const tbody = document.getElementById("dashboardTableBody");
        const noData = document.getElementById("noDataMessage");
        const dataTable = document.querySelector(".data-table");
        
        tbody.innerHTML = "";

        if(total === 0) {
            dataTable.classList.add("hidden");
            noData.classList.remove("hidden");
        } else {
            dataTable.classList.remove("hidden");
            noData.classList.add("hidden");
            
            complaintsDB.forEach(c => {
                const tr = document.createElement("tr");
                
                // badge class
                let statusClass = "";
                if(c.status === "Assigned") statusClass = "status-assigned";
                else if(c.status === "In Progress") statusClass = "status-inprogress";
                else if(c.status === "Pending") statusClass = "status-pending";
                else if(c.status === "Resolved") statusClass = "status-resolved";

                tr.innerHTML = `
                    <td><strong>${c.id}</strong></td>
                    <td>${c.name}</td>
                    <td>${c.type}</td>
                    <td>${c.date}</td>
                    <td><span class="status-badge ${statusClass}">${c.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

});
