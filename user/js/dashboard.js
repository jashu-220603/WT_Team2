/**
 * Citizen Dashboard JavaScript (Connected to Backend)
 */

const API = (window.API_BASE_URL || "http://localhost:7000") + "/api";
const token = sessionStorage.getItem("jwt");

if (!token) {
    alert("Please login first");
    window.location.href = "../index.html";
}


/* =========================
   LOAD PAGE
========================= */

document.addEventListener("DOMContentLoaded", () => {

    loadComplaints();

});


/* =========================
   LOAD COMPLAINTS
========================= */

async function loadComplaints() {

    try {

        const res = await fetch(`${API}/complaints`, {
            headers: {
                Authorization: "Bearer " + token
            }
        });

        if (!res.ok) {
            throw new Error("Failed to load complaints");
        }

        const complaints = await res.json();

        renderComplaints(complaints);

    } catch (err) {

        console.error(err);

        alert("Session expired. Please login again.");

        sessionStorage.clear();

        window.location.href = "../index.html";

    }

}


/* =========================
   RENDER COMPLAINTS
========================= */

function renderComplaints(complaints) {

    const recentTbody = document.getElementById("user-recent-complaints");
    const allTbody = document.getElementById("user-all-complaints");

    let pending = 0;
    let resolved = 0;

    let rows = "";

    complaints.forEach(c => {

        let badgeClass = "bg-secondary";

        if (c.status === "Submitted") badgeClass = "bg-warning text-dark";
        if (c.status === "Assigned") badgeClass = "bg-info";
        if (c.status === "In Progress") badgeClass = "bg-primary";
        if (c.status === "Resolved") badgeClass = "bg-success";

        if (c.status === "Resolved") resolved++;
        else pending++;

        rows += `
        <tr>
            <td>${c._id}</td>
            <td>${c.title}</td>
            <td>${c.category || "-"}</td>
            <td><span class="badge ${badgeClass}">${c.status}</span></td>
            <td>${new Date(c.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-secondary view-btn" data-id="${c._id}">
                    View
                </button>
            </td>
        </tr>
        `;

    });

    if (allTbody) allTbody.innerHTML = rows;

    if (recentTbody) {
        recentTbody.innerHTML = rows.split("</tr>").slice(0,3).join("</tr>");
    }

    document.getElementById("user-total-complaints").textContent = complaints.length;
    document.getElementById("user-pending-complaints").textContent = pending;
    document.getElementById("user-resolved-complaints").textContent = resolved;

    document.querySelectorAll(".view-btn").forEach(btn => {

        btn.addEventListener("click", () => {

            const id = btn.dataset.id;

            const complaint = complaints.find(c => c._id === id);

            if (complaint) openViewModal(complaint);

        });

    });

}


/* =========================
   VIEW COMPLAINT
========================= */

function openViewModal(c) {

    const content = document.getElementById("complaint-details-content");

    const imgVal = c.image;
    const imageUrl = imgVal ? (imgVal.startsWith('http') ? imgVal : `${window.API_BASE_URL || 'http://localhost:7000'}/uploads/${imgVal}`) : null;

    content.innerHTML = `
    <p><b>Title:</b> ${c.title}</p>
    <p><b>Status:</b> ${c.status}</p>
    <p><b>Category:</b> ${c.category || "-"}</p>
    <p><b>Location:</b> ${c.location || "-"}</p>
    <p><b>Description:</b> ${c.description}</p>
    ${imageUrl ? `<img src="${imageUrl}" style="max-width:100%;margin-top:10px;">` : ""}
    `;


    const modal = new bootstrap.Modal(
        document.getElementById("viewComplaintModal")
    );

    modal.show();

}


/* =========================
   SUBMIT COMPLAINT
========================= */

const complaintForm = document.getElementById("file-complaint-form");

if (complaintForm) {

    complaintForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const formData = new FormData(complaintForm);

        try {

            const res = await fetch(`${API}/complaints`, {

                method: "POST",

                headers: {
                    Authorization: "Bearer " + token
                },

                body: formData

            });

            if (!res.ok) {
                throw new Error("Submission failed");
            }

            alert("Complaint submitted successfully");

            complaintForm.reset();

            bootstrap.Modal.getInstance(
                document.getElementById("fileComplaintModal")
            ).hide();

            loadComplaints();

        } catch (err) {

            console.error(err);

            alert("Error submitting complaint");

        }

    });

}


/* =========================
   LOGOUT
========================= */

function logout(){
    sessionStorage.clear();
    window.location.href = "../index.html";
}
// store pending section in sessionStorage so target page can scroll to it
if (typeof pendingSection !== 'undefined' && pendingSection) {
    sessionStorage.setItem('pendingSection', pendingSection);
    pendingSection = '';
}

// redirect based on role
if (typeof targetUrl !== 'undefined' && targetUrl) {
    window.location.href = targetUrl;
}