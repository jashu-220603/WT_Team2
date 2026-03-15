function toggleMenu(){
    let sidebar=document.getElementById("sidebar");
    sidebar.classList.toggle("active");
}

// store desired section so we can redirect after login
window.pendingSection = window.pendingSection || '';
window.currentSignupRole = window.currentSignupRole || 'user';

function openLogin(role, section=''){
    pendingSection = section;
    document.getElementById("loginModal").style.display="flex";
    switchTab(role);
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
}

function closeSignup(){
    document.getElementById("signupModal").style.display="none";
}

function switchTab(role){
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach(tab => tab.classList.remove("active"));

    const loginEmailLabel = document.getElementById("loginEmailLabel");
    const loginEmailInput = document.getElementById("loginEmail");

    if(role==="citizen") {
        if(tabs[0]) tabs[0].classList.add("active");
        if(loginEmailLabel) loginEmailLabel.textContent = "Citizen Email";
        if(loginEmailInput) loginEmailInput.placeholder = "example: user@gmail.com";
    }
    if(role==="officer") {
        if(tabs[1]) tabs[1].classList.add("active");
        if(loginEmailLabel) loginEmailLabel.textContent = "Officer ID";
        if(loginEmailInput) loginEmailInput.placeholder = "example: off-001";
    }
    if(role==="admin") {
        if(tabs[2]) tabs[2].classList.add("active");
        if(loginEmailLabel) loginEmailLabel.textContent = "Admin ID";
        if(loginEmailInput) loginEmailInput.placeholder = "example: adm-001";
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
        staffIdInput.required = true;
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

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        if(!email || !password){
            alert("Enter email and password");
            return;
        }

        try {
            const resp = await fetch(`${window.API_BASE_URL || 'http://localhost:7000'}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({email, password})
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

            // fetch user profile to get name (login response may not include it)
            try {
                const meResp = await fetch(`${window.API_BASE_URL || 'http://localhost:7000'}/api/auth/me`, {
                    headers: { Authorization: 'Bearer ' + data.token }
                });
                if (meResp.ok) {
                    const me = await meResp.json();
                    if (me.name) sessionStorage.setItem('userName', me.name);
                    if (me.department) sessionStorage.setItem('department', me.department);
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

document.addEventListener('DOMContentLoaded', setupLoginRedirect);
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
const slides = document.querySelector(".slides");
const totalSlides = document.querySelectorAll(".slides img").length;

function showSlide(){
    slides.style.transform = "translateX(" + (-slideIndex * 100) + "%)";
}

function nextSlide(){
    slideIndex++;
    if(slideIndex >= totalSlides) slideIndex=0;
    showSlide();
}

function prevSlide(){
    slideIndex--;
    if(slideIndex < 0) slideIndex = totalSlides-1;
    showSlide();
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