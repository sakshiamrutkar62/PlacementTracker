/* =========================================================
   ECampus Placement Admin Panel JS
   ========================================================= */

// ---------- Auth Guard ----------
const adminUser = JSON.parse(localStorage.getItem('user'));
if (!adminUser || adminUser.role !== 'admin') {
    localStorage.setItem('adminRedirect', 'yes');
    window.location.href = 'index.html';
}

// ---------- Toast System ----------
function toast(msg, type = 'info') {
    const container = document.getElementById('toast-admin');
    const el = document.createElement('div');
    const icon = {
        success: 'fa-check-circle', error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle', info: 'fa-info-circle'
    }[type] || 'fa-info-circle';
    el.className = `toast-item toast-${type}`;
    el.innerHTML = `<i class="fas ${icon}"></i>${msg}<span onclick="this.parentElement.remove()"
        style="margin-left:auto; cursor:pointer; opacity:0.6; font-size:0.9rem;">&#x2715;</span>`;
    container.appendChild(el);
    setTimeout(() => { el.style.animation = 'slideOut 0.3s ease forwards'; el.addEventListener('animationend', () => el.remove()); }, 4000);
}

// ---------- Dark Mode ----------
function adminToggleDark() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('adminTheme', next);
    document.getElementById('darkIcon').className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    document.getElementById('darkLabel').textContent = next === 'dark' ? 'Light Mode' : 'Dark Mode';
}
(function initAdminTheme() {
    const saved = localStorage.getItem('adminTheme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    if (saved === 'dark') {
        document.getElementById('darkIcon').className = 'fas fa-sun';
        document.getElementById('darkLabel').textContent = 'Light Mode';
    }
})();

// ---------- Tab Switching ----------
function switchTab(tabName) {
    ['post-job', 'students', 'apply-student', 'applicants', 'stats'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.add('hidden');
    });
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');

    const idx = { 'post-job': 0, 'students': 1, 'apply-student': 2, 'applicants': 3, 'stats': 4 }[tabName];
    const navItems = document.querySelectorAll('.nav-item');
    if (navItems[idx]) navItems[idx].classList.add('active');

    if (tabName === 'applicants') loadAllApplications();
    if (tabName === 'stats') loadAdminStats();
    if (tabName === 'students') loadStudents();
    if (tabName === 'apply-student') loadApplyDropdowns();
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// ---------- 1. POST JOB ----------
document.getElementById('postJobForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const company_name = document.getElementById('jobCompany').value.trim();
    const role_title = document.getElementById('jobRole').value.trim();
    const stipend = document.getElementById('jobStipend').value.trim();
    const duration = document.getElementById('jobDuration').value.trim();
    const mode = document.getElementById('jobMode').value;
    const type = document.getElementById('jobType').value;
    const location = document.getElementById('jobLocation').value.trim();
    const deadline = document.getElementById('jobDeadline').value;
    const rawSkills = document.getElementById('jobSkills').value;

    if (!mode || !type) { toast('Please select a Mode and Type.', 'warning'); return; }

    const required_skills = rawSkills
        ? rawSkills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const btn = e.submitter;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';

    try {
        const res = await authenticatedFetch('/internships', {
            method: 'POST',
            body: JSON.stringify({ company_name, role_title, stipend, duration, mode, type, location, deadline, required_skills })
        });
        const data = await res.json();
        if (res.ok) {
            toast(`"${role_title}" at ${company_name} posted successfully!`, 'success');
            document.getElementById('postJobForm').reset();
        } else {
            toast('Error: ' + (data.error || data.message || 'Failed to post'), 'error');
        }
    } catch (err) {
        console.error(err);
        toast('Network error. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish Opportunity';
    }
});

// ---------- 2. LOAD APPLICATIONS ----------
let allAppsCache = [];

async function loadAllApplications() {
    const tbody = document.getElementById('adminAppList');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:3rem; color:#94a3b8;">
        <i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Loading applications...</td></tr>`;

    try {
        const res = await authenticatedFetch('/applications/admin-view');
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        allAppsCache = Array.isArray(data) ? data : (data.data || []);

        document.getElementById('appSubtitle').textContent = `${allAppsCache.length} application${allAppsCache.length !== 1 ? 's' : ''} found`;
        document.getElementById('totalBadge').textContent = allAppsCache.length;

        renderAppsTable(allAppsCache);
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:3rem; color:#ef4444;">
            <i class="fas fa-exclamation-circle fa-2x"></i><br><br>Failed to load applications.</td></tr>`;
    }
}

function filterAdminApps() {
    const q = document.getElementById('adminSearch').value.toLowerCase();
    const status = document.getElementById('adminStatusFilter').value;
    const filtered = allAppsCache.filter(app => {
        const matchQ = !q ||
            (app.student_name || '').toLowerCase().includes(q) ||
            (app.company_name || '').toLowerCase().includes(q) ||
            (app.role_title || '').toLowerCase().includes(q);
        const matchS = !status || app.status === status;
        return matchQ && matchS;
    });
    renderAppsTable(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
    const si = document.getElementById('adminSearch');
    if (si) si.addEventListener('input', filterAdminApps);
});

function renderAppsTable(apps) {
    const tbody = document.getElementById('adminAppList');
    if (!apps.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:4rem; color:#94a3b8;">
            <i class="fas fa-users-slash fa-2x" style="margin-bottom:10px; display:block;"></i>
            No applications match your filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = apps.map((app, i) => {
        const { badge, icon } = getStatusStyle(app.status);
        const date = app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-IN') : '&mdash;';
        return `
        <tr class="app-row">
            <td style="color:#94a3b8; font-size:0.8rem;">${i + 1}</td>
            <td><strong>${escapeAdmin(app.student_name || 'N/A')}</strong></td>
            <td>${escapeAdmin(app.company_name || '—')}</td>
            <td>${escapeAdmin(app.role_title || app.role || '—')}</td>
            <td style="color:#64748b; font-size:0.85rem;">${date}</td>
            <td>
                <span class="offer-tag ${badge}">
                    <i class="fas ${icon}" style="margin-right:4px;"></i>${app.status}
                </span>
                ${app.admin_reason ? `<div style="font-size:0.78rem;color:#64748b;margin-top:5px;font-style:italic;max-width:180px;white-space:normal;line-height:1.4;"><i class="fas fa-comment-alt" style="color:#94a3b8;margin-right:4px;"></i>${escapeAdmin(app.admin_reason)}</div>` : ''}
            </td>
            <td style="white-space:nowrap;">
                ${app.resume_link
                ? `<a href="${app.resume_link}" target="_blank" title="View Resume"
                        style="color:var(--primary); margin-right:10px;">
                        <i class="fas fa-file-pdf fa-lg"></i></a>`
                : `<span style="color:#d1d5db; margin-right:10px;"><i class="fas fa-file-excel fa-lg"></i></span>`}
                ${app.status === 'Applied' ? `
                    <button class="action-btn" style="background:#22c55e; color:white;" title="Shortlist"
                        onclick="openStatusModal('${app.id}', 'Shortlisted')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn" style="background:#f97316; color:white; margin-left:6px;" title="Offer"
                        onclick="openStatusModal('${app.id}', 'Offered')">
                        <i class="fas fa-trophy"></i>
                    </button>
                    <button class="action-btn" style="background:#ef4444; color:white; margin-left:6px;" title="Reject"
                        onclick="openStatusModal('${app.id}', 'Rejected')">
                        <i class="fas fa-times"></i>
                    </button>
                ` : app.status === 'Shortlisted' ? `
                    <button class="action-btn" style="background:#f97316; color:white;" title="Offer"
                        onclick="openStatusModal('${app.id}', 'Offered')">
                        <i class="fas fa-trophy"></i>
                    </button>
                    <button class="action-btn" style="background:#ef4444; color:white; margin-left:6px;" title="Reject"
                        onclick="openStatusModal('${app.id}', 'Rejected')">
                        <i class="fas fa-times"></i>
                    </button>
                ` : `<span style="color:#cbd5e1; font-size:0.8rem;">—</span>`}
            </td>
        </tr>`;
    }).join('');
}

function getStatusStyle(status) {
    const map = {
        'Applied': { badge: 'badge-applied', icon: 'fa-paper-plane' },
        'Shortlisted': { badge: 'badge-shortlisted', icon: 'fa-check-circle' },
        'Offered': { badge: 'badge-offered', icon: 'fa-trophy' },
        'Rejected': { badge: 'badge-rejected', icon: 'fa-times-circle' }
    };
    return map[status] || { badge: 'badge-applied', icon: 'fa-question-circle' };
}

// ---------- 3. UPDATE STATUS ----------
let _pendingStatusId = null;
let _pendingStatusValue = null;

function openStatusModal(appId, newStatus) {
    _pendingStatusId = appId;
    _pendingStatusValue = newStatus;

    const modal = document.getElementById('statusReasonModal');
    const title = document.getElementById('statusModalTitle');
    const badge = document.getElementById('statusModalBadge');
    const textarea = document.getElementById('statusReasonText');

    const styles = {
        Shortlisted: { bg: '#f0fdf4', color: '#166534', border: '#86efac', icon: 'fa-check-circle' },
        Offered:     { bg: '#fefce8', color: '#92400e', border: '#fde68a', icon: 'fa-trophy' },
        Rejected:    { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5', icon: 'fa-times-circle' }
    };
    const c = styles[newStatus] || { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', icon: 'fa-info-circle' };

    title.textContent = `Change Status to "${newStatus}"`;
    badge.innerHTML = `<i class="fas ${c.icon}"></i> ${newStatus}`;
    badge.style.cssText = `display:inline-flex;align-items:center;gap:6px;background:${c.bg};color:${c.color};border:1px solid ${c.border};padding:5px 16px;border-radius:20px;font-size:0.82rem;font-weight:600;`;
    textarea.value = '';
    modal.classList.remove('hidden');
    textarea.focus();
}

function closeStatusModal() {
    document.getElementById('statusReasonModal').classList.add('hidden');
    _pendingStatusId = null;
    _pendingStatusValue = null;
}

async function confirmStatusUpdate() {
    if (!_pendingStatusId || !_pendingStatusValue) return;
    const reason = document.getElementById('statusReasonText').value.trim();
    await updateStatus(_pendingStatusId, _pendingStatusValue, reason);
    closeStatusModal();
}

async function updateStatus(appId, newStatus, reason) {
    try {
        const res = await authenticatedFetch(`/applications/${appId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus, reason: reason || '' })
        });
        if (res.ok) {
            toast(`Status updated to "${newStatus}"${reason ? ' — Reason noted.' : ''}`, 'success');
            loadAllApplications();
        } else {
            const d = await res.json();
            toast('Failed: ' + (d.error || d.message), 'error');
        }
    } catch (err) {
        console.error(err);
        toast('Server error while updating status.', 'error');
    }
}

// ---------- 4. ANALYTICS TAB ----------
async function loadAdminStats() {
    try {
        const res = await authenticatedFetch('/applications/admin-view');
        if (!res.ok) throw new Error();
        const data = await res.json();
        const apps = Array.isArray(data) ? data : (data.data || []);

        const total = apps.length;
        const shortlisted = apps.filter(a => a.status === 'Shortlisted').length;
        const offered = apps.filter(a => a.status === 'Offered').length;
        const rejected = apps.filter(a => a.status === 'Rejected').length;

        animateNum(document.getElementById('sTotal'), total);
        animateNum(document.getElementById('sShortlisted'), shortlisted);
        animateNum(document.getElementById('sOffered'), offered);
        animateNum(document.getElementById('sRejected'), rejected);

        // Status breakdown pills
        const breakdown = document.getElementById('statusBreakdown');
        const statuses = ['Applied', 'Shortlisted', 'Offered', 'Rejected'];
        breakdown.innerHTML = statuses.map(s => {
            const count = apps.filter(a => a.status === s).length;
            const pct = total ? Math.round((count / total) * 100) : 0;
            const { badge } = getStatusStyle(s);
            return `<div style="flex:1; min-width:140px;">
                <div class="offer-tag ${badge}"
                    style="display:block; text-align:center; padding:12px; border-radius:12px; margin-bottom:6px;">
                    <div style="font-size:1.6rem; font-weight:700;">${count}</div>
                    <div style="font-size:0.78rem; margin-top:2px;">${s}</div>
                </div>
                <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
                <div style="text-align:center; font-size:0.75rem; color:#94a3b8; margin-top:4px;">${pct}%</div>
            </div>`;
        }).join('');
    } catch (err) {
        toast('Could not load analytics.', 'error');
    }
}

function animateNum(el, target) {
    if (!el) return;
    let start = 0;
    const step = Math.ceil(target / 30);
    const t = setInterval(() => {
        start = Math.min(start + step, target);
        el.textContent = start;
        if (start >= target) clearInterval(t);
    }, 30);
}

// ---------- Utility ----------
function escapeAdmin(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
}

// ==========================================
// STUDENTS TAB — College Verified Badge
// ==========================================
let allStudentsCache = [];

async function loadStudents() {
    const tbody = document.getElementById('studentList');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:#94a3b8;">
        <i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Loading students...</td></tr>`;

    try {
        const res = await authenticatedFetch('/admin/students');
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        allStudentsCache = Array.isArray(data.data) ? data.data : [];
        document.getElementById('studentSubtitle').textContent =
            `${allStudentsCache.length} student${allStudentsCache.length !== 1 ? 's' : ''} registered`;
        document.getElementById('studentBadge').textContent = allStudentsCache.length;
        renderStudentsTable(allStudentsCache);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:#ef4444;">
            <i class="fas fa-exclamation-circle fa-2x"></i><br><br>Failed to load students.</td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const si = document.getElementById('adminSearch');
    if (si) si.addEventListener('input', filterAdminApps);
    const ss = document.getElementById('studentSearch');
    if (ss) ss.addEventListener('input', () => {
        const q = ss.value.toLowerCase();
        const filtered = allStudentsCache.filter(s =>
            (s.full_name || '').toLowerCase().includes(q) ||
            (s.email || '').toLowerCase().includes(q)
        );
        renderStudentsTable(filtered);
    });
});

function renderStudentsTable(students) {
    const tbody = document.getElementById('studentList');
    if (!students.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:#94a3b8;">
            No students found.</td></tr>`;
        return;
    }
    tbody.innerHTML = students.map((s, i) => {
        const isVerified = !!s.college_verified;
        const verifiedSkillsCount = Array.isArray(s.verified_skills) ? s.verified_skills.length : 0;
        return `
        <tr class="app-row">
            <td style="color:#94a3b8;font-size:0.8rem;">${i + 1}</td>
            <td><strong>${escapeAdmin(s.full_name || 'N/A')}</strong></td>
            <td style="color:#64748b;font-size:0.85rem;">${escapeAdmin(s.email || '—')}</td>
            <td style="color:#64748b;font-size:0.85rem;">${escapeAdmin(s.batch_year || '—')}</td>
            <td style="text-align:center;">
                <span style="background:#f5f3ff;color:#7c3aed;padding:3px 10px;border-radius:20px;font-size:0.8rem;font-weight:600;">
                    ${verifiedSkillsCount} skill${verifiedSkillsCount !== 1 ? 's' : ''}
                </span>
            </td>
            <td style="text-align:center;">
                ${isVerified
                    ? `<span class="offer-tag badge-shortlisted"><i class="fas fa-check-circle"></i> Verified</span>`
                    : `<span class="offer-tag badge-rejected"><i class="fas fa-times-circle"></i> Not Verified</span>`
                }
            </td>
            <td style="white-space:nowrap;">
                ${isVerified
                    ? `<button class="action-btn" style="background:#ef4444;color:white;" title="Revoke Verification"
                        onclick="toggleCollegeVerify('${s.id}', false)">
                        <i class="fas fa-times"></i>
                       </button>`
                    : `<button class="action-btn" style="background:#22c55e;color:white;" title="Grant College Verified Badge"
                        onclick="toggleCollegeVerify('${s.id}', true)">
                        <i class="fas fa-check"></i>
                       </button>`
                }
            </td>
        </tr>`;
    }).join('');
}

async function toggleCollegeVerify(studentId, verified) {
    try {
        const res = await authenticatedFetch(`/admin/students/${studentId}/verify`, {
            method: 'PUT',
            body: JSON.stringify({ college_verified: verified })
        });
        if (res.ok) {
            toast(`College Verified badge ${verified ? 'granted' : 'revoked'} successfully.`, 'success');
            loadStudents();
        } else {
            const d = await res.json();
            toast('Failed: ' + (d.message || d.error), 'error');
        }
    } catch (err) {
        toast('Server error.', 'error');
    }
}

// ==========================================
// APPLY FOR STUDENT TAB
// ==========================================
async function loadApplyDropdowns() {
    try {
        const [studRes, intRes] = await Promise.all([
            authenticatedFetch('/admin/students'),
            authenticatedFetch('/internships')
        ]);
        const studData = await studRes.json();
        const intData = await intRes.json();

        const students = Array.isArray(studData.data) ? studData.data : [];
        const internships = Array.isArray(intData) ? intData : (intData.data || []);

        const studSelect = document.getElementById('applyStudentSelect');
        studSelect.innerHTML = '<option value="">-- Select Student --</option>' +
            students.map(s => `<option value="${s.id}">${escapeAdmin(s.full_name)} (${escapeAdmin(s.email)})</option>`).join('');

        const intSelect = document.getElementById('applyInternshipSelect');
        intSelect.innerHTML = '<option value="">-- Select Opportunity --</option>' +
            internships.map(i => `<option value="${i.id}">${escapeAdmin(i.company_name)} – ${escapeAdmin(i.role_title)}</option>`).join('');
    } catch (err) {
        toast('Failed to load dropdowns.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const applyForm = document.getElementById('adminApplyForm');
    if (applyForm) {
        applyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const student_id = document.getElementById('applyStudentSelect').value;
            const internship_id = document.getElementById('applyInternshipSelect').value;
            if (!student_id || !internship_id) { toast('Please select a student and an opportunity.', 'warning'); return; }

            const btn = e.submitter;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

            try {
                const res = await authenticatedFetch('/admin/applications', {
                    method: 'POST',
                    body: JSON.stringify({ student_id, internship_id })
                });
                const data = await res.json();
                if (res.ok) {
                    toast('✅ Application created successfully!', 'success');
                    applyForm.reset();
                } else {
                    toast('Error: ' + (data.message || data.error || 'Failed'), 'error');
                }
            } catch (err) {
                toast('Network error. Please try again.', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-file-signature"></i> Submit Application';
            }
        });
    }
});