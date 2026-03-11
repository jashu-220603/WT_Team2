/**
 * Officer Dashboard JavaScript
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
            if (link.hasAttribute('data-bs-toggle')) return;

            e.preventDefault();
            const targetSection = link.getAttribute('data-section');
            window.switchSection(targetSection);

            if (window.innerWidth <= 768) {
                sidebar.classList.remove('show');
            }
        });
    });

    window.switchSection = function (sectionId) {
        const sections = ['dashboard-section', 'assigned-section', 'resolved-section'];
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('d-none');
        });

        const target = document.getElementById(`${sectionId}-section`);
        if (target) target.classList.remove('d-none');

        navLinks.forEach(link => {
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // 4. Dummy Assigned Data Generation & Rendering
    let dummyAssigned = [
        { id: 'CMP-2026-001', title: 'Potholes on Main Street', location: 'Main St.', priority: 'Medium', status: 'Pending', date: '2026-03-01', deadline: '2026-03-05' },
        { id: 'CMP-2026-003', title: 'Blocked drain flooding road', location: 'Oak Avenue', priority: 'High', status: 'In Progress', date: '2026-03-02', deadline: '2026-03-04' },
        { id: 'CMP-2026-008', title: 'Damage to sidewalk', location: 'Pine St.', priority: 'Low', status: 'Pending', date: '2026-03-10', deadline: '2026-03-20' },
        { id: 'CMP-2026-009', title: 'Bridge barrier broken', location: 'River Bridge', priority: 'High', status: 'Resolved', date: '2026-02-28', deadline: '2026-03-02', notes: 'Replaced broken barrier with steel rail.' }
    ];

    function renderOfficerComplaints() {
        const urgentTbody = document.getElementById('urgent-complaints');
        const recentTbody = document.getElementById('recent-assigned-complaints');
        const allAssignedTbody = document.getElementById('all-assigned-complaints');
        const resolvedTbody = document.getElementById('resolved-complaints-list');

        let activeCount = 0;
        let urgentCount = 0;
        let resolvedCount = 0;

        let urgentHtml = '';
        let recentHtml = '';
        let allHtml = '';
        let resolvedHtml = '';

        dummyAssigned.forEach((c, index) => {

            // Badge logic
            let badgeClass = 'bg-secondary';
            if (c.status === 'Pending') badgeClass = 'bg-warning text-dark';
            else if (c.status === 'In Progress') badgeClass = 'bg-primary';
            else if (c.status === 'Resolved') badgeClass = 'bg-success';

            let priorityClass = 'bg-secondary';
            if (c.priority === 'High') priorityClass = 'bg-danger';
            else if (c.priority === 'Medium') priorityClass = 'bg-warning text-dark';
            else if (c.priority === 'Low') priorityClass = 'bg-info text-dark';

            // HTML for "Update" button
            const updateBtn = `<button class="btn btn-sm btn-outline-success update-btn" data-id="${c.id}" ${c.status === 'Resolved' ? 'disabled' : ''}>
                                    <i class="bi bi-pencil-square"></i> Update 
                               </button>`;

            // Categorization & Stats
            if (c.status !== 'Resolved') {
                activeCount++;

                allHtml += `
                    <tr>
                        <td class="fw-medium">${c.id}</td>
                        <td>${c.title}</td>
                        <td>${c.location}</td>
                        <td><span class="badge ${priorityClass}">${c.priority}</span></td>
                        <td><span class="badge ${badgeClass}">${c.status}</span></td>
                        <td class="${c.priority === 'High' ? 'text-danger fw-bold' : ''}">${c.deadline}</td>
                        <td>${updateBtn}</td>
                    </tr>
                `;

                if (activeCount <= 3) {
                    recentHtml += `
                        <tr>
                            <td class="fw-medium">${c.id}</td>
                            <td>${c.title}</td>
                            <td>${c.date}</td>
                            <td><span class="badge ${badgeClass}">${c.status}</span></td>
                            <td>${updateBtn}</td>
                        </tr>
                    `;
                }

                if (c.priority === 'High') {
                    urgentCount++;
                    urgentHtml += `
                        <tr>
                            <td class="fw-medium text-danger">${c.id}</td>
                            <td>${c.title}</td>
                            <td class="text-danger fw-bold">${c.deadline}</td>
                            <td><span class="badge ${badgeClass}">${c.status}</span></td>
                            <td>${updateBtn}</td>
                        </tr>
                    `;
                }

            } else {
                resolvedCount++;
                resolvedHtml += `
                    <tr>
                        <td class="fw-medium text-success">${c.id}</td>
                        <td>${c.title}</td>
                        <td>${c.date}</td>
                        <td class="fst-italic">"${c.notes}"</td>
                        <td><span class="badge bg-success">Resolved</span></td>
                    </tr>
                `;
            }
        });

        // Inject HTML
        if (urgentTbody) urgentTbody.innerHTML = urgentHtml || '<tr><td colspan="5" class="text-center text-muted">No urgent tasks right now.</td></tr>';
        if (recentTbody) recentTbody.innerHTML = recentHtml || '<tr><td colspan="5" class="text-center text-muted">No active assignments.</td></tr>';
        if (allAssignedTbody) allAssignedTbody.innerHTML = allHtml || '<tr><td colspan="7" class="text-center text-muted">No active assignments.</td></tr>';
        if (resolvedTbody) resolvedTbody.innerHTML = resolvedHtml || '<tr><td colspan="5" class="text-center text-muted">No resolved cases yet.</td></tr>';

        // Stats
        document.getElementById('officer-active-cases').textContent = activeCount;
        document.getElementById('officer-urgent-cases').textContent = urgentCount;
        document.getElementById('officer-resolved-cases').textContent = resolvedCount;

        // Re-attach update btn events
        document.querySelectorAll('.update-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                openUpdateModal(id);
            });
        });
    }

    // 5. Update Status Modal Logic
    function openUpdateModal(id) {
        document.getElementById('update-complaint-id').value = id;
        document.getElementById('display-complaint-id').textContent = id;

        const complaint = dummyAssigned.find(c => c.id === id);
        if (complaint) {
            document.getElementById('new-status').value = complaint.status;
            document.getElementById('action-remarks').value = '';
        }

        const modal = new bootstrap.Modal(document.getElementById('updateStatusModal'));
        modal.show();
    }

    const updateForm = document.getElementById('update-status-form');
    if (updateForm) {
        updateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('update-complaint-id').value;
            const newStatus = document.getElementById('new-status').value;
            const remarks = document.getElementById('action-remarks').value;

            // Find and update
            const index = dummyAssigned.findIndex(c => c.id === id);
            if (index !== -1) {
                dummyAssigned[index].status = newStatus;

                if (newStatus === 'Resolved') {
                    dummyAssigned[index].notes = remarks;
                }
            }

            // re-render the view
            renderOfficerComplaints();

            // Hide modal
            const modalEl = document.getElementById('updateStatusModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();

            // alert success
            setTimeout(() => {
                alert(`Complaint ${id} status successfully updated to: ${newStatus}`);
            }, 300);
        });
    }

    // Init
    renderOfficerComplaints();
});
