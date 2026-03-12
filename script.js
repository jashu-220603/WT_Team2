function toggleMenu(){

let sidebar=document.getElementById("sidebar");

sidebar.classList.toggle("active");

}

// store desired section so we can redirect after login
let pendingSection = '';

// show login modal and configure for role; optional section indicates which
// area in the dashboard we want to open after authentication
function openLogin(role, section){
    pendingSection = section || '';
    document.getElementById("loginModal").style.display="flex";
    let tabs=document.querySelectorAll(".tab");
    tabs.forEach(tab=>tab.classList.remove("active"));
    let userField=document.getElementById("userField");

    if(role==="citizen"){
        tabs[0].classList.add("active");
        userField.innerHTML=`
<label>Email</label>
<input type="text" placeholder="your@email.com">
`;
    }
    if(role==="officer"){
        tabs[1].classList.add("active");
        userField.innerHTML=`
<label>Officer ID</label>
<input type="text" placeholder="e.g. OFF-001">
`;
    }
    if(role==="admin"){
        tabs[2].classList.add("active");
        userField.innerHTML=`
<label>Admin ID</label>
<input type="text" placeholder="e.g. ADM-001">
`;
    }
}

function closeLogin(){
    document.getElementById("loginModal").style.display="none";
}

function openSignup(){
    document.getElementById("signupModal").style.display="flex";
}

function closeSignup(){
    document.getElementById("signupModal").style.display="none";
}

function switchTab(role){
    // reuse openLogin logic without showing modal again
    const tabs=document.querySelectorAll(".tab");
    tabs.forEach(tab=>tab.classList.remove("active"));
    const userField=document.getElementById("userField");
    if(role==="citizen"){
        tabs[0].classList.add("active");
        userField.innerHTML=`
<label>Email</label>
<input type="text" placeholder="your@email.com">
`;
    }
    if(role==="officer"){
        tabs[1].classList.add("active");
        userField.innerHTML=`
<label>Officer ID</label>
<input type="text" placeholder="e.g. OFF-001">
`;
    }
    if(role==="admin"){
        tabs[2].classList.add("active");
        userField.innerHTML=`
<label>Admin ID</label>
<input type="text" placeholder="e.g. ADM-001">
`;
    }
}

// redirect on form submit based on active tab
function setupLoginRedirect(){
    const loginForm=document.getElementById('loginForm');
    if(!loginForm) return;
    loginForm.addEventListener('submit', function(e){
        e.preventDefault();
        const activeTab=document.querySelector('.tab.active');
        if(!activeTab) return;
        const role=activeTab.textContent.trim().toLowerCase();
        let targetUrl = '';
        switch(role){
            case 'citizen':
                targetUrl = 'user/index.html';
                sessionStorage.setItem('authenticated','citizen');
                break;
            case 'officer':
                targetUrl = 'officer/index.html';
                sessionStorage.setItem('authenticated','officer');
                break;
            case 'admin':
                targetUrl = 'admin/index.html';
                sessionStorage.setItem('authenticated','admin');
                break;
        }
        if(pendingSection && targetUrl){
            targetUrl += '#' + pendingSection;
        }
        if(targetUrl){
            // clear pendingSection after building url
            pendingSection = '';
            window.location.href = targetUrl;
        }
    });
}

if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', setupLoginRedirect);
} else {
    setupLoginRedirect();
}


/* FAQ POPUP */

function openFAQ(){
document.getElementById("faqBox").style.display="block";
}

function closeFAQ(){
document.getElementById("faqBox").style.display="none";
}


/* CHATBOT */

function toggleChat(){

let chat=document.getElementById("chatbox");

if(chat.style.display==="block"){
chat.style.display="none";
}else{
chat.style.display="block";
}

}

function sendMessage(){

let input=document.getElementById("userInput");
let chatBody=document.getElementById("chatBody");

let userText=input.value;

if(userText==="") return;

chatBody.innerHTML+=`<p><b>You:</b> ${userText}</p>`;

let botReply="Please contact the helpline for more support.";

if(userText.toLowerCase().includes("complaint")){
botReply="You can file a complaint using the 'File Complaint' button.";
}

if(userText.toLowerCase().includes("track")){
botReply="Use the 'Track Complaint' option and enter your complaint ID.";
}

if(userText.toLowerCase().includes("login")){
botReply="Click the Login button at the top right to access your account.";
}

chatBody.innerHTML+=`<p><b>Bot:</b> ${botReply}</p>`;

input.value="";
chatBody.scrollTop=chatBody.scrollHeight;

}




/* SLIDER */

let slideIndex = 0;

const slides = document.querySelector(".slides");
const totalSlides = document.querySelectorAll(".slides img").length;

function showSlide(){

slides.style.transform = "translateX(" + (-slideIndex * 100) + "%)";

}

function nextSlide(){

slideIndex++;

if(slideIndex >= totalSlides){
slideIndex = 0;
}

showSlide();

}

function prevSlide(){

slideIndex--;

if(slideIndex < 0){
slideIndex = totalSlides - 1;
}

showSlide();

}

/* AUTO SLIDE */

setInterval(nextSlide,4000);

function closeSidebar(){
document.getElementById("sidebar").classList.remove("active");
}

function toggleHelpline(){

let box = document.getElementById("helplineBox");

if(box.style.display === "block"){
box.style.display = "none";
}else{
box.style.display = "block";
}

}

function scrollToAnnouncements(){

document.getElementById("announcements").scrollIntoView({
behavior:"smooth"
});

closeSidebar();

}

function showDepartments(){

document.getElementById("departments").scrollIntoView({
behavior:"smooth"
});

closeSidebar();

}

function openFeedback(){

document.getElementById("feedbackSection").scrollIntoView({
behavior:"smooth"
});

closeSidebar();

}
