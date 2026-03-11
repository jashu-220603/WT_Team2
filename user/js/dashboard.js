/**
 * Citizen Dashboard JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
            } else {
                sidebar.classList.toggle('show');
            }
        });
    }

    // 2. Dark Mode Toggle
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    // Check saved theme or system preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    htmlElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        const icon = themeToggleBtn.querySelector('i');
        if (theme === 'dark') {
            icon.classList.remove('bi-moon-fill');
            icon.classList.add('bi-sun-fill');
            themeToggleBtn.classList.replace('text-dark', 'text-warning');
        } else {
            icon.classList.remove('bi-sun-fill');
            icon.classList.add('bi-moon-fill');
            themeToggleBtn.classList.replace('text-warning', 'text-dark');
        }
    }

    // 3. Navigation between sections
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Ignore if it's opening a modal
            if (link.hasAttribute('data-bs-toggle')) return;
            
            e.preventDefault();
            const targetSection = link.getAttribute('data-section');
            window.switchSection(targetSection);
            
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('show');
            }
        });
    });

    window.switchSection = function(sectionId) {
        // Hide all sections
        const sections = ['dashboard-section', 'my-complaints-section'];
        sections.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('d-none');
        });

        // Show target
        const target = document.getElementById(`${sectionId}-section`);
        if (target) target.classList.remove('d-none');

        // Update active nav link
        navLinks.forEach(link => {
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // 4. Dummy Data Generation & Rendering
    const dummyComplaints = [
        { id: 'CMP-2026-001', title: 'Potholes on Main Street', dept: 'Roads', status: 'In Progress', date: '2026-03-01', desc: 'Large potholes causing traffic near the central bank.' },
        { id: 'CMP-2026-005', title: 'No water supply for 2 days', dept: 'Water Supply', status: 'Pending', date: '2026-03-10', desc: 'Water supply has been cut off in block C.' },
        { id: 'CMP-2026-012', title: 'Streetlights not working', dept: 'Electricity', status: 'Resolved', date: '2026-02-15', desc: 'All streetlights are out on 5th Avenue.' },
    ];

    function renderComplaints() {
        const recentTbody = document.getElementById('user-recent-complaints');
        const allTbody = document.getElementById('user-all-complaints');
        
        let pendingCount = 0;
        let resolvedCount = 0;

        const generateRows = (limit = null) => {
            let html = '';
            const subset = limit ? dummyComplaints.slice(0, limit) : dummyComplaints;
            
            subset.forEach(c => {
                let badgeClass = 'bg-secondary';
                if (c.status === 'Pending') badgeClass = 'bg-warning text-dark';
                else if (c.status === 'In Progress') badgeClass = 'bg-primary';
                else if (c.status === 'Resolved') badgeClass = 'bg-success';

                html += `
                    <tr>
                        <td class="fw-medium">${c.id}</td>
                        <td>${c.title}</td>
                        <td>${c.dept}</td>
                        <td><span class="badge ${badgeClass}">${c.status}</span></td>
                        <td>${c.date}</td>
                        ${!limit ? `<td>${c.date}</td>` : ''}
                        <td>
                            <button class="btn btn-sm btn-outline-secondary view-btn" data-id="${c.id}">
                                <i class="bi bi-eye"></i> View
                            </button>
                        </td>
                    </tr>
                `;

                if (!limit) { // Calculate stats only once
                    if (c.status === 'Resolved') resolvedCount++;
                    else pendingCount++;
                }
            });
            return html;
        };

        if (recentTbody) recentTbody.innerHTML = generateRows(3);
        if (allTbody) allTbody.innerHTML = generateRows();

        // Update stats
        document.getElementById('user-total-complaints').textContent = dummyComplaints.length;
        document.getElementById('user-pending-complaints').textContent = pendingCount;
        document.getElementById('user-resolved-complaints').textContent = resolvedCount;

        // Attach event listeners to view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const complaint = dummyComplaints.find(c => c.id === id);
                if (complaint) openViewModal(complaint);
            });
        });
    }

    function openViewModal(complaint) {
        const content = document.getElementById('complaint-details-content');
        let badgeClass = 'bg-secondary';
        if (complaint.status === 'Pending') badgeClass = 'bg-warning text-dark';
        else if (complaint.status === 'In Progress') badgeClass = 'bg-primary';
        else if (complaint.status === 'Resolved') badgeClass = 'bg-success';

        content.innerHTML = `
            <div class="mb-3 border-bottom pb-2">
                <p class="text-muted small mb-1">Complaint ID</p>
                <h5 class="fw-bold">${complaint.id}</h5>
            </div>
            <div class="mb-3 border-bottom pb-2">
                <p class="text-muted small mb-1">Title</p>
                <h6>${complaint.title}</h6>
            </div>
            <div class="row mb-3 border-bottom pb-2">
                <div class="col-6">
                    <p class="text-muted small mb-1">Department</p>
                    <p class="mb-0 fw-medium">${complaint.dept}</p>
                </div>
                <div class="col-6">
                    <p class="text-muted small mb-1">Status</p>
                    <span class="badge ${badgeClass}">${complaint.status}</span>
                </div>
            </div>
            <div class="mb-3 border-bottom pb-2">
                <p class="text-muted small mb-1">Filed On</p>
                <p class="mb-0">${complaint.date}</p>
            </div>
            <div class="mb-2">
                <p class="text-muted small mb-1">Description</p>
                <p class="mb-0 bg-light p-3 rounded border dark-mode-bg">${complaint.desc}</p>
            </div>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('viewComplaintModal'));
        modal.show();
    }

    // 5. Handle Form Submission
    const complaintForm = document.getElementById('file-complaint-form');
    if (complaintForm) {
        complaintForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const title = document.getElementById('complaint-title').value;
            const dept = document.getElementById('complaint-dept').value;
            const location = document.getElementById('complaint-location').value;
            const desc = document.getElementById('complaint-desc').value;

            // Simple validation
            if (!title || !dept || !location || !desc) {
                alert("Please fill in all required fields.");
                return;
            }

            // Create new dummy entry
            const newId = `CMP-2026-0${Math.floor(Math.random() * 90) + 10}`;
            const today = new Date().toISOString().split('T')[0];

            dummyComplaints.unshift({
                id: newId,
                title: title,
                dept: dept,
                status: 'Pending',
                date: today,
                desc: `${location} - ${desc}`
            });

            // Re-render table
            renderComplaints();

            // Reset and close modal
            complaintForm.reset();
            const modalEl = document.getElementById('fileComplaintModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();
            
            // Show success alert
            alert(`Your complaint has been successfully registered with ID: ${newId}`);
        });
    }

    // Initialize layout
    renderComplaints();
});
