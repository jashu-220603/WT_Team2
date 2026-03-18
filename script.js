function toggleMenu(){
    let sidebar=document.getElementById("sidebar");
    sidebar.classList.toggle("active");
    event.stopPropagation(); // Prevent immediate close
}

// Close sidebar, Helpline, and FAQ when clicking anywhere on Home Page
document.addEventListener("click", function(event) {
    let sidebar = document.getElementById("sidebar");
    let menuBtn = document.querySelector(".menu-btn");
    
    // Sidebar logic
    if (sidebar && sidebar.classList.contains("active")) {
        if (!sidebar.contains(event.target) && !menuBtn.contains(event.target)) {
            closeSidebar();
        }
    }

    // Helpline logic
    let helplineBox = document.getElementById("helplineBox");
    let helplineBtn = document.querySelector('.header-btn[onclick="toggleHelpline()"]');
    if (helplineBox && helplineBox.style.display === "block") {
        if (!helplineBox.contains(event.target) && !helplineBtn.contains(event.target)) {
            helplineBox.style.display = "none";
        }
    }

    // FAQ logic
    let faqBox = document.getElementById("faqBox");
    let faqBtn = document.querySelector('.header-btn[onclick="openFAQ()"]');
    if (faqBox && faqBox.style.display === "block") {
        if (!faqBox.contains(event.target) && !faqBtn.contains(event.target)) {
            faqBox.style.display = "none";
        }
    }
});

// store desired section so we can redirect after login
window.pendingSection = window.pendingSection || '';
window.currentSignupRole = window.currentSignupRole || 'user';

function openLogin(role, section=''){
    pendingSection = section;
    document.getElementById("loginModal").style.display="flex";
    switchTab(role);
    
    // Ensure Google Sign-In is initialized whenever modal opens
    setTimeout(initializeGoogleSignIn, 100);
}

function closeLogin(){
    document.getElementById("loginModal").style.display="none";
}

function openSignup(){
    // Find which login tab is active to open the corresponding signup tab
    const loginTabs = document.querySelectorAll("#loginModal .tab");
    let activeRole = 'citizen';
    if (loginTabs[1] && loginTabs[1].classList.contains('active')) activeRole = 'officer';
    if (loginTabs[2] && loginTabs[2].classList.contains('active')) activeRole = 'admin';
    
    document.getElementById("signupModal").style.display="flex";
    switchSignupTab(activeRole);
    if (activeRole === 'officer') populateSignupDepartments();
}

function closeSignup(){
    document.getElementById("signupModal").style.display="none";
}

function switchTab(role){
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach(tab => tab.classList.remove("active"));

    const citizenFields = document.getElementById("citizenLoginFields");
    const officerAdminFields = document.getElementById("officerAdminLoginFields");

    if(role==="citizen") {
        if(tabs[0]) tabs[0].classList.add("active");
        if(citizenFields) citizenFields.style.display = "block";
        if(officerAdminFields) officerAdminFields.style.display = "none";
    }
    if(role==="officer") {
        if(tabs[1]) tabs[1].classList.add("active");
        if(citizenFields) citizenFields.style.display = "none";
        if(officerAdminFields) officerAdminFields.style.display = "block";
        const lbl = document.getElementById("loginEmailLabel2");
        if(lbl) lbl.textContent = "Officer ID / Email";
        const inp = document.getElementById("loginEmail2");
        if(inp) inp.placeholder = "Enter Staff ID or Email";
    }
    if(role==="admin") {
        if(tabs[2]) tabs[2].classList.add("active");
        if(citizenFields) citizenFields.style.display = "none";
        if(officerAdminFields) officerAdminFields.style.display = "block";
        const lbl = document.getElementById("loginEmailLabel2");
        if(lbl) lbl.textContent = "Admin ID / Email";
        const inp = document.getElementById("loginEmail2");
        if(inp) inp.placeholder = "Enter Admin ID or Email";
    }
}

function switchSignupTab(role) {
    currentSignupRole = role === 'citizen' ? 'user' : role;
    
    const tabs = document.querySelectorAll(".signup-tab");
    tabs.forEach(tab => tab.classList.remove("active"));

    const staffIdGroup = document.getElementById("staffIdGroup");
    const deptGroup = document.getElementById("deptGroup");
    const staffIdLabel = document.getElementById("staffIdLabel");
    const staffIdInput = document.getElementById("signupStaffId");

    if (role === 'citizen') {
        if (tabs[0]) tabs[0].classList.add("active");
        staffIdGroup.style.display = "none";
        deptGroup.style.display = "none";
        staffIdInput.required = false;
    } else if (role === 'officer') {
        if (tabs[1]) tabs[1].classList.add("active");
        staffIdGroup.style.display = "block";
        deptGroup.style.display = "block";
        staffIdLabel.textContent = "Officer ID";
        staffIdInput.placeholder = "e.g. off-001";
        staffIdInput.required = true;
    } else if (role === 'admin') {
        if (tabs[2]) tabs[2].classList.add("active");
        staffIdGroup.style.display = "block";
        deptGroup.style.display = "none";
        staffIdLabel.textContent = "Admin ID";
        staffIdInput.placeholder = "e.g. adm-001";
    }
}

async function populateSignupDepartments() {
    const deptSelect = document.getElementById("signupDept");
    if (!deptSelect) return;
    try {
        const resp = await fetch(`${window.API_BASE_URL || 'http://localhost:7000'}/api/departments`);
        if (resp.ok) {
            const depts = await resp.json();
            let html = '<option value="">Select Department</option>';
            depts.forEach(d => {
                const name = d.name || d;
                html += `<option value="${name}">${name}</option>`;
            });
            deptSelect.innerHTML = html;
        }
    } catch (err) {
        console.error('Error fetching departments:', err);
    }
}

// =====================
// LOGIN FUNCTION
// =====================
function setupLoginRedirect(){
    const loginForm = document.getElementById('loginForm');
    if(!loginForm) return;

    loginForm.addEventListener('submit', async function(e){
        e.preventDefault();

        const tabs = document.querySelectorAll("#loginModal .tab");
        let loginRole = 'user';
        if (tabs[1] && tabs[1].classList.contains('active')) loginRole = 'officer';
        if (tabs[2] && tabs[2].classList.contains('active')) loginRole = 'admin';

        let email, password;
        if (loginRole === 'user') {
            email = document.getElementById("loginEmail").value.trim();
            password = document.getElementById("loginPassword").value.trim();
        } else {
            email = document.getElementById("loginEmail2").value.trim();
            password = document.getElementById("loginPassword2").value.trim();
        }

        if(!email || !password){
            alert("Please enter " + (activeRole==='citizen' ? "email" : "ID/Email") + " and password");
            return;
        }

        try {
            const role = loginRole;

            const resp = await fetch(`${window.API_BASE_URL || 'http://localhost:7000'}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({email, password, role})
            });

            if(!resp.ok){
                const err = await resp.json();
                alert('Login failed: ' + (err.message || resp.status));
                return;
            }

            const data = await resp.json();

            // store token, role & name
            sessionStorage.setItem('jwt', data.token);
            sessionStorage.setItem('role', data.role);
            if (data.name) sessionStorage.setItem('userName', data.name);
            if (data.department) sessionStorage.setItem('department', data.department);
            if (data.profilePhoto) {
                sessionStorage.setItem('profilePhoto', data.profilePhoto);
                // Set role-specific photo
                if (data.role === 'admin') sessionStorage.setItem('adminPhoto', data.profilePhoto);
                else if (data.role === 'officer') sessionStorage.setItem('officerPhoto', data.profilePhoto);
                else if (data.role === 'user') sessionStorage.setItem('citizenPhoto', data.profilePhoto);
            }

            // fetch user profile to get name (login response may not include it)
            try {
                const meResp = await fetch(`${window.API_BASE_URL || 'http://localhost:7000'}/api/auth/me`, {
                    headers: { Authorization: 'Bearer ' + data.token }
                });
                if (meResp.ok) {
                    const me = await meResp.json();
                    if (me.name) sessionStorage.setItem('userName', me.name);
                    if (me.department) sessionStorage.setItem('department', me.department);
                    if (me.profilePhoto) {
                        sessionStorage.setItem('profilePhoto', me.profilePhoto);
                        // Set role-specific photo
                        if (data.role === 'admin') sessionStorage.setItem('adminPhoto', me.profilePhoto);
                        else if (data.role === 'officer') sessionStorage.setItem('officerPhoto', me.profilePhoto);
                        else if (data.role === 'user') sessionStorage.setItem('citizenPhoto', me.profilePhoto);
                    }
                }
            } catch(_) {}

            // store an auth flag so the dashboard scripts can recognize a logged-in user
            // 'user' role is internally treated as 'citizen' for the frontend path
            const authRole = data.role === 'user' ? 'citizen' : data.role;
            sessionStorage.setItem('authenticated', authRole);

            // redirect based on role
            let targetUrl = '';
            if (data.role === 'admin') {
                targetUrl = 'admin/index.html';
            } else if (data.role === 'officer') {
                targetUrl = 'officer/index.html';
            } else {
                targetUrl = 'user/index.html';
            }

            if(pendingSection){
                targetUrl += '#' + pendingSection;
            }

            pendingSection = '';
            
            // Robust redirection that works with Live Server and subfolders
            const currentDir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
            window.location.href = currentDir + targetUrl;

        } catch(err){
            console.error('Login error', err);
            alert('Login error. Check backend server.');
        }
    });
}

// Officer/Admin login handler for the separate fields
async function handleOfficerAdminLogin() {
    const email = document.getElementById("loginEmail2").value.trim();
    const password = document.getElementById("loginPassword2").value.trim();

    if(!email || !password){
        alert("Enter email/ID and password");
        return;
    }

    const tabs = document.querySelectorAll("#loginModal .tab");
    let role = 'user';
    if (tabs[1] && tabs[1].classList.contains('active')) role = 'officer';
    if (tabs[2] && tabs[2].classList.contains('active')) role = 'admin';

    try {
        const resp = await fetch(`${window.API_BASE_URL || 'http://localhost:7000'}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({email, password, role})
        });

        if(!resp.ok){
            const err = await resp.json();
            alert('Login failed: ' + (err.message || resp.status));
            return;
        }

        const data = await resp.json();
        sessionStorage.setItem('jwt', data.token);
        sessionStorage.setItem('role', data.role);
        if (data.name) sessionStorage.setItem('userName', data.name);
        if (data.department) sessionStorage.setItem('department', data.department);
        if (data.profilePhoto) {
            sessionStorage.setItem('profilePhoto', data.profilePhoto);
            if (data.role === 'admin') sessionStorage.setItem('adminPhoto', data.profilePhoto);
            else if (data.role === 'officer') sessionStorage.setItem('officerPhoto', data.profilePhoto);
            else if (data.role === 'user') sessionStorage.setItem('citizenPhoto', data.profilePhoto);
        }

        const authRole = data.role === 'user' ? 'citizen' : data.role;
        sessionStorage.setItem('authenticated', authRole);

        let targetUrl = data.role === 'admin' ? 'admin/index.html' : (data.role === 'officer' ? 'officer/index.html' : 'user/index.html');
        if(pendingSection) { targetUrl += '#' + pendingSection; pendingSection = ''; }
        const currentDir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        window.location.href = currentDir + targetUrl;
    } catch(err){
        console.error('Login error', err);
        alert('Login error. Check backend server.');
    }
}

// Global handle for officer/admin login button
window.handleOfficerAdminLogin = function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const event = new Event('submit', { cancelable: true });
        loginForm.dispatchEvent(event);
    }
}


// Alias for Google Identity Services callback
function handleGoogleLogin(response) {
    handleCredentialResponse(response);
}

function handleCredentialResponse(response) {
    if (!response.credential) {
        alert('Google authentication failed.');
        return;
    }
    fetch(`${window.API_BASE_URL || 'http://localhost:7000'}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential, role: 'citizen' })
    })
    .then(async resp => {
        if (!resp.ok) {
            const err = await resp.json();
            alert('Google Login failed: ' + (err.message || resp.statusText));
            throw new Error(err.message || 'Login failed');
        }
        return resp.json();
    })
    .then(data => {
        // store token, role & name
        sessionStorage.setItem('jwt', data.token);
        sessionStorage.setItem('role', data.role);
        if (data.name) sessionStorage.setItem('userName', data.name);
        if (data.department) sessionStorage.setItem('department', data.department);
        if (data.email) sessionStorage.setItem('userEmail', data.email); 
        if (data.profilePhoto) {
            sessionStorage.setItem('profilePhoto', data.profilePhoto); // Store photo URL
            // Google login is always for citizens in this app
            sessionStorage.setItem('citizenPhoto', data.profilePhoto);
        }

        // store an auth flag so the dashboard scripts can recognize a logged-in user
        const authRole = data.role === 'user' ? 'citizen' : data.role;
        sessionStorage.setItem('authenticated', authRole);

        // redirect based on role
        let targetUrl = '';
        if (data.role === 'admin') {
            targetUrl = 'admin/index.html';
        } else if (data.role === 'officer') {
            targetUrl = 'officer/index.html';
        } else {
            targetUrl = 'user/index.html';
        }

        if(pendingSection){
            targetUrl += '#' + pendingSection;
            pendingSection = '';
        }

        // Robust redirection that works with Live Server and subfolders
        const currentDir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        const finalUrl = currentDir + targetUrl;
        console.log('Redirecting to:', finalUrl);
        window.location.href = finalUrl;
    })
    .catch(err => {
        console.error('Google Login error', err);
        alert('Google Login failed. See console for details.');
    });
}

function initializeGoogleSignIn() {
    console.log('Initializing Google Sign-In...');
    if (window.google) {
        console.log('Google Script found, rendering button...');
        google.accounts.id.initialize({
            client_id: "588711916449-u7g72decg5agtfgddkielt0v8fh2htge.apps.googleusercontent.com", 
            callback: handleCredentialResponse
        });
        const gc = document.getElementById("googleLoginBtnContainer");
        if (gc) {
            google.accounts.id.renderButton(
                gc,
                { theme: "outline", size: "large", width: "100%" }
            );
        }
    } else {
        console.warn('Google Script (gsi/client) not loaded yet.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupLoginRedirect();
    setTimeout(initializeGoogleSignIn, 1000); // Wait for google identity script to load
});
// =====================
// FAQ POPUP
// =====================
function openFAQ(){
    document.getElementById("faqBox").style.display="block";
}

function closeFAQ(){
    document.getElementById("faqBox").style.display="none";
}

// CHATBOT logic moved to chatbot.js

// =====================
// SLIDER
// =====================
let slideIndex = 0;
const slidesContainer = document.querySelector(".slides");
const originalSlides = document.querySelectorAll(".slides img");
const totalSlides = originalSlides.length;

// Clone first slide for seamless loop
if (totalSlides > 0 && slidesContainer) {
    const firstClone = originalSlides[0].cloneNode(true);
    slidesContainer.appendChild(firstClone);
}

function showSlide(){
    if (!slidesContainer) return;
    slidesContainer.style.transition = "transform 0.6s ease-in-out";
    slidesContainer.style.transform = "translateX(" + (-slideIndex * 100) + "%)";
}

function nextSlide(){
    if (!slidesContainer) return;
    slideIndex++;
    showSlide();

    if(slideIndex >= totalSlides) {
        setTimeout(() => {
            slidesContainer.style.transition = "none";
            slideIndex = 0;
            slidesContainer.style.transform = "translateX(0)";
        }, 600); // Must match CSS transition time
    }
}

function prevSlide(){
    if (!slidesContainer) return;
    slideIndex--;
    if(slideIndex < 0) {
        slidesContainer.style.transition = "none";
        slideIndex = totalSlides;
        slidesContainer.style.transform = "translateX(" + (-slideIndex * 100) + "%)";
        setTimeout(() => {
            slideIndex = totalSlides - 1;
            showSlide();
        }, 20);
    } else {
        showSlide();
    }
}

setInterval(nextSlide,4000);

// =====================
// SIDEBAR & HELPLINE
// =====================
function closeSidebar(){
    document.getElementById("sidebar").classList.remove("active");
}

function toggleHelpline(){
    let box = document.getElementById("helplineBox");
    box.style.display = box.style.display==="block" ? "none" : "block";
}

function scrollToAnnouncements(){
    document.getElementById("announcements").scrollIntoView({ behavior:"smooth" });
    closeSidebar();
}

function showDepartments(){
    document.getElementById("departments").scrollIntoView({ behavior:"smooth" });
    closeSidebar();
}

function openFeedback(){
    document.getElementById("feedbackSection").scrollIntoView({ behavior:"smooth" });
    closeSidebar();
}

// =====================
// SIGNUP FUNCTION
// =====================
function setupSignup() {
    const signupForm = document.getElementById('signupForm');
    if(!signupForm) return;

    signupForm.addEventListener('submit', async function(e){
        e.preventDefault();

        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value.trim();
        const staffId = document.getElementById('signupStaffId').value.trim();
        const department = document.getElementById('signupDept').value;

        if(!name || !email || !password){
            alert("Please fill all required fields.");
            return;
        }

        const newUser = { 
            name, 
            email, 
            password, 
            role: currentSignupRole,
            staffId: (currentSignupRole !== 'user') ? staffId : undefined,
            department: (currentSignupRole === 'officer') ? department : undefined
        };

        try {
            const resp = await fetch(`${window.API_BASE_URL || 'http://localhost:7000'}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });

            if(!resp.ok){
                const err = await resp.json();
                alert('Signup failed: ' + (err.message || resp.status));
                return;
            }

            const data = await resp.json();
            alert('Signup successful! You can now login.');
            closeSignup();

        } catch(err){
            console.error('Signup error', err);
            alert('Signup error. Check backend server.');
        }
    });
}

if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', setupSignup);
}else{
    setupSignup();
}
// =====================
// FEEDBACK SUBMISSION
// =====================
function setupFeedbackForm() {
    const feedbackForm = document.querySelector('.feedback-form');
    if (!feedbackForm) return;

    feedbackForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const nameInput = feedbackForm.querySelector('input[type="text"]');
        const emailInput = feedbackForm.querySelector('input[type="email"]');
        const feedbackTextInput = feedbackForm.querySelector('textarea');

        if (!nameInput || !emailInput || !feedbackTextInput) return;

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const feedbackText = feedbackTextInput.value.trim();

        if (!name || !email || !feedbackText) {
            alert('Please fill out all fields in the feedback form.');
            return;
        }

        try {
            const resp = await fetch((window.API_BASE_URL || 'http://localhost:7000') + '/api/feedback/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, feedbackText, type: 'General' })
            });

            if (resp.ok) {
                alert('Thank you! Your feedback has been submitted successfully.');
                feedbackForm.reset();
            } else {
                const data = await resp.json();
                alert('Feedback submission failed: ' + (data.message || 'Unknown error'));
            }
        } catch (err) {
            console.error('Feedback submission error', err);
            alert('Could not submit feedback. Check connection.');
        }
    });
}

document.addEventListener('DOMContentLoaded', setupFeedbackForm);

// =====================
// FORGOT PASSWORD FLOW
// =====================
function openForgotPassword() {
    closeLogin();
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
    // Simulate API call
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
    
    // Simulate/Implement actual reset if backend exists
    // For now, consistent with UI request
    alert("Password reset successfully! Please login with your new password.");
    closeForgotPassword();
    openLogin('citizen');
}

// =====================
// OVERVIEW MODAL
// =====================
async function openOverview() {
    closeSidebar();
    document.getElementById("overviewModal").style.display = "flex";
    
    const totalEl = document.getElementById("overviewTotal");
    const resolvedEl = document.getElementById("overviewResolved");
    
    // reset to loading state
    totalEl.textContent = "...";
    resolvedEl.textContent = "...";
    
    try {
        const resp = await fetch(`${window.API_BASE_URL || 'http://localhost:7000'}/api/complaints/public/stats`);
        if (resp.ok) {
            const data = await resp.json();
            // Animate counting up (optional polish)
            animateValue(totalEl, 0, data.total, 1000);
            animateValue(resolvedEl, 0, data.resolved, 1000);
        } else {
            console.error('Failed to fetch public stats');
            totalEl.textContent = "Error";
            resolvedEl.textContent = "Error";
        }
    } catch (err) {
        console.error('Error fetching public stats:', err);
        totalEl.textContent = "Err";
        resolvedEl.textContent = "Err";
    }
}

function closeOverview() {
    document.getElementById("overviewModal").style.display = "none";
}

// Simple counter animation helper
function animateValue(obj, start, end, duration) {
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.textContent = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.textContent = end; // ensure exact final value
        }
    };
    window.requestAnimationFrame(step);
}

// =====================
// HOMEPAGE STATS FETCH
// =====================
async function fetchHomepageStats() {
    const totalEl = document.getElementById('dynamicTotal');
    const resolvedEl = document.getElementById('dynamicResolved');
    const pendingEl = document.getElementById('dynamicPending');
    
    if (!totalEl || !resolvedEl || !pendingEl) return;

    try {
        const resp = await fetch(`${window.API_BASE_URL || 'http://localhost:7000'}/api/complaints/public/stats`);
        if (resp.ok) {
            const data = await resp.json();
            animateValue(totalEl, 0, data.total, 1500);
            animateValue(resolvedEl, 0, data.resolved, 1500);
            // Calculate or fetch pending if not in API. 
            // Most public stats APIs return total and resolved; pending = total - resolved.
            const pending = data.pending !== undefined ? data.pending : (data.total - data.resolved);
            animateValue(pendingEl, 0, pending, 1500);
        }
    } catch (err) {
        console.error('Error fetching homepage stats:', err);
    }
}

// DYNAMIC ANNOUNCEMENTS
// =====================
async function loadAnnouncements() {
    const container = document.getElementById('announcements-dynamic-container');
    if (!container) return;

    try {
        const resp = await fetch((window.API_BASE_URL || 'http://localhost:7000') + '/api/announcements');
        if (resp.ok) {
            const announcements = await resp.json();
            if (announcements.length === 0) {
                container.innerHTML = '<div class="text-center py-4 w-100">No recent announcements.</div>';
                return;
            }

            container.innerHTML = announcements.map(a => `
                <div class="announcement-card">
                    <h4>${a.title}</h4>
                    <p>${a.content}</p>
                    <span>Posted: ${new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Error fetching announcements:', err);
        container.innerHTML = '<div class="text-center py-4 w-100 text-danger">Failed to load announcements.</div>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchHomepageStats();
    loadAnnouncements();
});

function scrollToOverview(){
    const overviewSec = document.getElementById('overviewSection');
    if (overviewSec) {
        overviewSec.scrollIntoView({ behavior:'smooth' });
    }
    closeSidebar();
}
