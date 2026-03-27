const supabaseUrl = 'https://ggwhosmpsvxrqogwsisq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnd2hvc21wc3Z4cnFvZ3dzaXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1OTIxODIsImV4cCI6MjA5MDE2ODE4Mn0.7HCRVIyVW0LJd_UMDXyGVuHohNwt59i81DWXljmoFPw';
// Renamed to supabaseClient to avoid conflicting with the global 'supabase' object from the CDN!
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    
    const yearSelect = document.getElementById('year-select');
    const dateSelect = document.getElementById('date-select');
    const loadStudentsBtn = document.getElementById('load-students-btn');
    const attendanceWorkspace = document.getElementById('attendance-workspace');
    const studentsListBody = document.getElementById('students-list');
    
    const totalCountEl = document.getElementById('total-count');
    const presentCountEl = document.getElementById('present-count');
    const absentCountEl = document.getElementById('absent-count');
    
    const markAllPresentBtn = document.getElementById('mark-all-present');
    const markAllAbsentBtn = document.getElementById('mark-all-absent');
    const saveAttendanceBtn = document.getElementById('save-attendance-btn');
    
    const historyYearSelect = document.getElementById('history-year');
    const historyDateSelect = document.getElementById('history-date');
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const historyResults = document.getElementById('history-results');
    const noHistoryMsg = document.getElementById('no-history-msg');
    const historyListBody = document.getElementById('history-list');

    // Set today's date as default (This proves the script runs if it sets visually!)
    const today = new Date().toISOString().split('T')[0];
    dateSelect.value = today;
    historyDateSelect.value = today;

    // View Switching
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            const viewId = item.getAttribute('data-view');
            viewSections.forEach(section => {
                section.classList.remove('active');
                if(section.id === `${viewId}-view`) {
                    section.classList.add('active');
                }
            });
        });
    });

    // Dashboard Logic
    yearSelect.addEventListener('change', () => {
        if(yearSelect.value) {
            loadStudentsBtn.disabled = false;
        } else {
            loadStudentsBtn.disabled = true;
            attendanceWorkspace.classList.add('hidden');
        }
    });

    loadStudentsBtn.addEventListener('click', async () => {
        const year = yearSelect.value;
        const date = dateSelect.value;
        
        if(!year || !date) {
            showToast('Please select both Year and Date', 'error');
            return;
        }

        try {
            // Fetch students from Supabase
            const { data: students, error: stdErr } = await supabaseClient
                .from('students')
                .select('*')
                .eq('year', year)
                .order('id', { ascending: true });
                
            if (stdErr) throw stdErr;
            if (!students || students.length === 0) {
                showToast('No students found for this year in database', 'error');
                return;
            }
            
            // Fetch existing attendance for today
            const { data: existingData, error: attErr } = await supabaseClient
                .from('attendance')
                .select('*')
                .eq('year', year)
                .eq('date', date);
                
            if (attErr) throw attErr;

            const yearText = yearSelect.options[yearSelect.selectedIndex].text;
            document.getElementById('workspace-title').textContent = `${yearText} Students`;
            studentsListBody.innerHTML = '';
            
            students.forEach(student => {
                let isPresent = true;
                if (existingData && existingData.length > 0) {
                    const record = existingData.find(r => r.student_id === student.id);
                    if(record) isPresent = record.present;
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${student.id}</strong></td>
                    <td>${student.name}</td>
                    <td>
                        <span class="status-badge ${isPresent ? 'present' : 'absent'}" id="badge-${student.id}">
                            ${isPresent ? 'Present' : 'Absent'}
                        </span>
                    </td>
                    <td class="text-right">
                        <div class="attendance-toggle">
                            <label class="toggle-switch">
                                <input type="checkbox" class="status-checkbox" data-id="${student.id}" data-name="${student.name}" ${isPresent ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </td>
                `;
                studentsListBody.appendChild(tr);
            });

            const checkboxes = document.querySelectorAll('.status-checkbox');
            checkboxes.forEach(box => {
                box.addEventListener('change', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const badge = document.getElementById(`badge-${id}`);
                    
                    if(e.target.checked) {
                        badge.textContent = 'Present';
                        badge.className = 'status-badge present';
                    } else {
                        badge.textContent = 'Absent';
                        badge.className = 'status-badge absent';
                    }
                    updateStats();
                });
            });

            attendanceWorkspace.classList.remove('hidden');
            updateStats();
        } catch (error) {
            console.error(error);
            showToast('Failed to load data from Supabase', 'error');
        }
    });

    function updateStats() {
        const checkboxes = document.querySelectorAll('.status-checkbox');
        let present = 0;
        let total = checkboxes.length;
        
        checkboxes.forEach(box => {
            if(box.checked) present++;
        });

        totalCountEl.textContent = total;
        presentCountEl.textContent = present;
        absentCountEl.textContent = total - present;
    }

    markAllPresentBtn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.status-checkbox');
        checkboxes.forEach(box => {
            if(!box.checked) {
                box.checked = true;
                const id = box.getAttribute('data-id');
                const badge = document.getElementById(`badge-${id}`);
                badge.textContent = 'Present';
                badge.className = 'status-badge present';
            }
        });
        updateStats();
    });

    markAllAbsentBtn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.status-checkbox');
        checkboxes.forEach(box => {
            if(box.checked) {
                box.checked = false;
                const id = box.getAttribute('data-id');
                const badge = document.getElementById(`badge-${id}`);
                badge.textContent = 'Absent';
                badge.className = 'status-badge absent';
            }
        });
        updateStats();
    });

    saveAttendanceBtn.addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('.status-checkbox');
        const year = yearSelect.value;
        const date = dateSelect.value;
        
        const attendanceRecords = [];
        checkboxes.forEach(box => {
            attendanceRecords.push({
                student_id: box.getAttribute('data-id'),
                year: year,
                date: date,
                present: box.checked
            });
        });

        try {
            saveAttendanceBtn.disabled = true;
            saveAttendanceBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            // Use Supabase upsert
            const { error: upsertErr } = await supabaseClient
                .from('attendance')
                .upsert(attendanceRecords, { onConflict: 'student_id, date' });

            if (upsertErr) throw upsertErr;

            showToast(`Attendance saved successfully for ${date}`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to save attendance in Supabase', 'error');
        } finally {
            saveAttendanceBtn.disabled = false;
            saveAttendanceBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save Attendance';
        }
    });

    viewHistoryBtn.addEventListener('click', async () => {
        const year = historyYearSelect.value;
        const date = historyDateSelect.value;
        
        if(!date) {
            showToast('Please select a date', 'error');
            return;
        }

        try {
            const { data: record, error } = await supabaseClient
                .from('attendance')
                .select(`
                    id,
                    student_id,
                    present,
                    students ( name )
                `)
                .eq('year', year)
                .eq('date', date)
                .order('student_id', { ascending: true });

            if (error) throw error;

            if(record && record.length > 0) {
                document.getElementById('history-title-date').textContent = new Date(date).toLocaleDateString();
                document.getElementById('history-title-year').textContent = historyYearSelect.options[historyYearSelect.selectedIndex].text;
                
                let presentCount = 0;
                historyListBody.innerHTML = '';
                
                record.forEach(studentAttendance => {
                    const isPresent = studentAttendance.present;
                    // Extract name from joined students table
                    const studentName = studentAttendance.students && studentAttendance.students.name ? studentAttendance.students.name : 'Unknown Student';
                    const studentId = studentAttendance.student_id;

                    if(isPresent) presentCount++;
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${studentId}</strong></td>
                        <td>${studentName}</td>
                        <td>
                            <span class="status-badge ${isPresent ? 'present' : 'absent'}">
                                ${isPresent ? 'Present' : 'Absent'}
                            </span>
                        </td>
                    `;
                    historyListBody.appendChild(tr);
                });
                
                document.getElementById('history-present-count').textContent = presentCount;
                document.getElementById('history-absent-count').textContent = (record.length - presentCount);
                
                historyResults.classList.remove('hidden');
                noHistoryMsg.classList.add('hidden');
            } else {
                historyResults.classList.add('hidden');
                noHistoryMsg.classList.remove('hidden');
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to fetch history from Supabase server', 'error');
        }
    });

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';
        
        toast.innerHTML = `
            ${icon}
            <div>
                <strong>${type === 'success' ? 'Success' : 'Error'}</strong>
                <p style="margin: 0; font-size: 0.9rem;">${message}</p>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
});
