// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD7tc1Hb5qg8wKF7z26NIhbniNfYiDsIY4",
    authDomain: "ojt-portfolio-free.firebaseapp.com",
    projectId: "ojt-portfolio-free",
    storageBucket: "ojt-portfolio-free.firebasestorage.app",
    messagingSenderId: "589766813412",
    appId: "1:589766813412:web:c8df0a6aaf6fa57de9eef1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

let allDocuments = []; 
let activeDocFilter = 'all';

const postDeploymentTypes = [
    'Training Supervisor Form',
    'HTE Performance Evaluation',
    'OJT Adviser Performance Evaluation',
    'Trainee Performance Evaluation',
    'Performance Evaluation Grading System',
    'Certificate of Completion'
];

// Scroll to Top Logic
const mainContentScroll = document.getElementById('main-content-scroll');
const topBtn = document.getElementById("back-to-top");

function handleScroll() {
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300 || mainContentScroll.scrollTop > 300) {
        topBtn.style.display = "flex";
    } else {
        topBtn.style.display = "none";
    }
}
window.addEventListener('scroll', handleScroll);
mainContentScroll.addEventListener('scroll', handleScroll);

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mainContentScroll.scrollTo({ top: 0, behavior: 'smooth' });
}

// Modern Toast Notification Function
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = type === 'success' ? `✅ ${message}` : `⚠️ ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fadeOut');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('open');
}

// Load Documents
db.collection("documents").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    allDocuments = [];
    snapshot.forEach((doc) => {
        allDocuments.push({ id: doc.id, ...doc.data() });
    });

    updateDocProgressBar();
    renderDocuments();
});

function updateDocProgressBar() {
    const totalRequired = 16; 
    const uniqueTypes = new Set(allDocuments.map(d => d.docType));
    const count = uniqueTypes.size;
    const percentage = Math.min(Math.round((count / totalRequired) * 100), 100);

    document.getElementById('doc-progress-text').innerText = `${count} of ${totalRequired} Completed (${percentage}%)`;
    document.getElementById('doc-progress-fill').style.width = `${percentage}%`;
}

function setDocFilter(filterType, pillElement) {
    activeDocFilter = filterType;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    if(pillElement) pillElement.classList.add('active');
    renderDocuments();
}

function filterDocuments() {
    renderDocuments();
}

function renderDocuments() {
    const preGrid = document.getElementById('pre-doc-grid');
    const postGrid = document.getElementById('post-doc-grid');
    const searchQuery = document.getElementById('doc-search-input').value.toLowerCase();

    let filtered = allDocuments.filter(doc => {
        const matchesSearch = doc.docType.toLowerCase().includes(searchQuery) || doc.fileName.toLowerCase().includes(searchQuery);
        const isPdf = doc.fileType.includes('pdf');
        
        if (activeDocFilter === 'pdf') return matchesSearch && isPdf;
        if (activeDocFilter === 'image') return matchesSearch && !isPdf;
        return matchesSearch;
    });

    preGrid.innerHTML = "";
    postGrid.innerHTML = "";

    let preCount = 0;
    let postCount = 0;

    if (filtered.length === 0) {
        preGrid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">No documents found matching your criteria.</div>`;
        postGrid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">No documents found matching your criteria.</div>`;
        return;
    }

    filtered.forEach((data) => {
        const isPdf = data.fileType.includes('pdf') || data.fileType.includes('document'); 
        const badgeClass = isPdf ? 'badge-pdf' : 'badge-img';
        const badgeLabel = isPdf ? 'DOC/PDF' : 'IMAGE';
        const iconHtml = isPdf ? '📕' : '🖼️';
        
        let formattedDate = "Uploaded Recently";
        if (data.createdAt && data.createdAt.toDate) {
            formattedDate = "Uploaded: " + data.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        const card = document.createElement('div');
        card.className = 'doc-card';
        card.innerHTML = `
            <span class="doc-card-badge ${badgeClass}">${badgeLabel}</span>
            <div class="delete-trigger" onclick="deleteDocumentFromFirebase('${data.id}')" title="Admin Access">🗑️</div>
            <div class="doc-content">
                <div class="doc-icon" aria-hidden="true">${iconHtml}</div>
                <div class="doc-info">
                    <h4>${data.docType}</h4>
                    <p class="file-name" title="${data.fileName}">${data.fileName}</p>
                    <span class="file-date">${formattedDate}</span>
                </div>
            </div>
            <div class="doc-card-actions">
                <button class="btn view-btn" onclick="openModal('${data.url}', '${data.fileType}')">👁️ View</button>
                <a href="${data.url}" target="_blank" rel="noopener noreferrer" download class="download-btn" title="Direct Download" aria-label="Download ${data.docType}">⬇️</a>
            </div>
        `;

        if (postDeploymentTypes.includes(data.docType)) {
            postGrid.appendChild(card);
            postCount++;
        } else {
            preGrid.appendChild(card);
            preCount++;
        }
    });

    if (preCount === 0) preGrid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">No pre-deployment documents matching your criteria.</div>`;
    if (postCount === 0) postGrid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">No post-deployment documents matching your criteria.</div>`;
}

// Load Weekly Reports
db.collection("reports").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    const historyContainer = document.getElementById('report-history-container');
    if (snapshot.empty) {
        historyContainer.innerHTML = `<div class="empty-state" id="empty-reports" style="margin-left: 20px;"><p>No reports submitted yet. Admin can log the first entry.</p></div>`;
        return;
    }
    historyContainer.innerHTML = "";
    snapshot.forEach((doc) => {
        const data = doc.data();
        const reportCard = document.createElement('div');
        reportCard.className = 'report-accordion card'; 
        
        let galleryHtml = '';
        if (data.imageUrls && data.imageUrls.length > 0) {
            galleryHtml = `<div class="report-gallery">`;
            data.imageUrls.forEach(url => {
                galleryHtml += `<img src="${url}" alt="Report Image" class="report-img-thumbnail" tabindex="0" onclick="openModal('${url}', 'image')">`;
            });
            galleryHtml += `</div>`;
        } else if (data.imageUrl) { 
            galleryHtml = `<div class="report-gallery">
                              <img src="${data.imageUrl}" alt="Report Image" class="report-img-thumbnail" tabindex="0" onclick="openModal('${data.imageUrl}', 'image')">
                           </div>`;
        }

        let fullTitle = data.title || 'Weekly Report';
        let badgeText = 'OJT Log';
        let mainTitle = fullTitle;
        
        if (fullTitle.includes(':')) {
            let parts = fullTitle.split(':');
            badgeText = parts[0].trim();
            mainTitle = parts.slice(1).join(':').trim();
        }

        reportCard.innerHTML = `
            <div class="timeline-node"></div>
            <div class="report-header" tabindex="0" onclick="toggleAccordion(this)" role="button" aria-expanded="false">
                <div style="flex: 1; padding-right: 20px;">
                    <span class="week-badge">${badgeText}</span>
                    <h4>${mainTitle}</h4>
                    <span class="date">📅 Week Ending: ${data.date}</span>
                </div>
                <span class="toggle-icon" aria-hidden="true">▼</span>
            </div>
            <div class="report-body">
                <div class="report-body-text">${data.text}</div>
                ${galleryHtml}
                <div class="report-actions">
                    <button class="btn-delete" style="width: auto; padding: 8px 18px;" onclick="deleteReportFromFirebase('${doc.id}')">Delete Log</button>
                </div>
            </div>
        `;
        historyContainer.appendChild(reportCard);
    });
});

// Trigger Document Upload 
async function triggerUpload(inputId, docType, btnElement) {
    const fileInput = document.getElementById(inputId);
    const file = fileInput.files[0];
    if (!file) { showToast("Please choose a file first!", "error"); return; }

    const password = prompt(`Enter admin password to upload ${docType}:`);
    if (password !== "admin2026") { showToast("Access Denied: Incorrect password.", "error"); return; }

    if(btnElement) {
        btnElement.classList.add('loading');
        btnElement.disabled = true;
    }

    showToast("Uploading... Please wait.", "success");
    const filePath = `ojt-documents/${Date.now()}_${file.name}`;
    const storageRef = storage.ref(filePath);
    
    try {
        const snapshot = await storageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        await db.collection("documents").add({
            docType: docType, 
            fileName: file.name, 
            fileType: file.type, 
            url: downloadURL, 
            filePath: filePath,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast("Upload successful!", "success");
        fileInput.value = "";
    } catch (error) { 
        console.error("Upload error details:", error);
        showToast("Failed to upload.", "error"); 
    } finally {
        if(btnElement) {
            btnElement.classList.remove('loading');
            btnElement.disabled = false;
        }
    }
}

// Submit Weekly Report
async function submitReportToFirebase(btnElement) {
    const title = document.getElementById('report-title').value;
    const date = document.getElementById('report-date').value;
    const text = document.getElementById('report-text').value;
    const imageInput = document.getElementById('report-image');
    const files = imageInput.files;

    if(!date || !text || !title) { showToast("Please fill out all fields.", "error"); return; }
    
    const password = prompt("Enter admin password to submit report:");
    if (password !== "admin2026") { showToast("Access Denied: Incorrect password.", "error"); return; }

    if(btnElement) {
        btnElement.classList.add('loading');
        btnElement.disabled = true;
    }

    showToast("Saving report... Please wait.", "success");

    try {
        let imageUrls = [];
        let imagePaths = [];

        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                let path = `ojt-report-images/${Date.now()}_${file.name}`;
                let imgRef = storage.ref(path);
                let snapshot = await imgRef.put(file);
                let url = await snapshot.ref.getDownloadURL();
                
                imageUrls.push(url);
                imagePaths.push(path);
            }
        }

        await db.collection("reports").add({ 
            title: title,
            date: date, 
            text: text, 
            imageUrls: imageUrls, 
            imagePaths: imagePaths, 
            createdAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
        
        document.getElementById('report-title').value = '';
        document.getElementById('report-date').value = '';
        document.getElementById('report-text').value = '';
        document.getElementById('report-image').value = '';
        toggleReportForm();
        showToast("Weekly Report saved successfully!", "success");

    } catch (error) { 
        console.error(error);
        showToast("Failed to save report.", "error"); 
    } finally {
        if(btnElement) {
            btnElement.classList.remove('loading');
            btnElement.disabled = false;
        }
    }
}

// Delete Document 
async function deleteDocumentFromFirebase(docId) {
    const password = prompt("Restricted Area. Enter admin password to delete document:");
    if (password === "admin2026") {
        try { 
            const docRef = db.collection("documents").doc(docId);
            const doc = await docRef.get();
            if (doc.exists) {
                const data = doc.data();
                if (data.filePath) await storage.ref(data.filePath).delete().catch(e => console.log("File not found in storage", e));
            }
            await docRef.delete(); 
            showToast("Document deleted securely.", "success");
        } catch (error) { 
            console.error("Error deleting:", error);
            showToast("Error deleting document.", "error"); 
        }
    } else if (password !== null) {
        showToast("Access Denied: Incorrect password.", "error");
    }
}

// Delete Report
async function deleteReportFromFirebase(docId) {
    const password = prompt("Restricted Area. Enter admin password to delete this report:");
    if (password === "admin2026") {
        try { 
            const docRef = db.collection("reports").doc(docId);
            const doc = await docRef.get();
            if (doc.exists) {
                const data = doc.data();
                if (data.imagePaths && data.imagePaths.length > 0) {
                    for(let path of data.imagePaths) await storage.ref(path).delete().catch(e => console.log("Image not found", e));
                } else if (data.imagePath) {
                    await storage.ref(data.imagePath).delete().catch(e => console.log("Image not found", e));
                }
            }
            await docRef.delete(); 
            showToast("Report deleted.", "success");
        } catch (error) { 
            console.error("Error deleting report:", error);
            showToast("Error deleting report.", "error"); 
        }
    } else if (password !== null) {
        showToast("Access Denied: Incorrect password.", "error");
    }
}

// UI Interactions
function toggleAccordion(element) {
    const body = element.nextElementSibling;
    const icon = element.querySelector('.toggle-icon');
    const isOpen = body.classList.contains('open');
    
    body.classList.toggle('open');
    element.setAttribute('aria-expanded', !isOpen);
    icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

function openTab(tabName, btnElement) {
    if (tabName === 'upload-reqs') {
        const pwd = prompt("Restricted Area. Enter admin password to view this section:");
        if (pwd !== "admin2026") {
            showToast("Access Denied: Incorrect password.", "error");
            return; 
        }
    }

    const contents = document.querySelectorAll(".content-section");
    contents.forEach(c => c.classList.remove("active"));
    
    const buttons = document.querySelectorAll(".tab-link");
    buttons.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
    });
    
    document.getElementById(tabName).classList.add("active");
    
    if (btnElement) {
        btnElement.classList.add("active");
        btnElement.setAttribute("aria-selected", "true");
    }

    if (window.innerWidth <= 900) {
        toggleSidebar();
    }
}

function toggleReportForm() {
    const form = document.getElementById('report-form-container');
    const isCurrentlyHidden = (form.style.display === 'none' || form.style.display === '');
    
    if (isCurrentlyHidden) {
        const pwd = prompt("Restricted Area. Enter admin password to create a new report:");
        if (pwd !== "admin2026") {
            showToast("Access Denied: Incorrect password.", "error");
            return;
        }
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

function openModal(fileUrl, fileType) {
    const modal = document.getElementById('document-modal');
    const viewer = document.getElementById('modal-viewer');
    
    viewer.innerHTML = (fileType.includes('pdf') || fileType.includes('text')) 
        ? `<iframe src="${fileUrl}#toolbar=0" title="Document Preview"></iframe>` 
        : `<img src="${fileUrl}" class="modal-img" alt="Enlarged Document Preview">`;
        
    modal.style.display = 'flex';
}

function closeModal() { document.getElementById('document-modal').style.display = 'none'; }

// Close modal on outside click
window.onclick = function(event) { if (event.target == document.getElementById('document-modal')) closeModal(); }

// TEMPORARY ADMIN SCRIPT - Run this once to load your weekly reports manually
async function loadOfflineReports() {
    const myReports = [
        {
            title: "Week 1: General Orientation, IT Unit Deployment & Database System",
            date: "2026-07-02",
            text: `TASKS ACCOMPLISHED:\n• Attended the NTC general orientation led by Sir Zaldua regarding OJT expectations, standard protocols, and professional workplace conduct.\n• Assigned to the NTC NCR office under the IT Unit following briefings and introductory interviews with Atty. Torres and Admin Chief Ma'am Pingoy.\n• Managed physical and digital data organization by sorting, filing, and processing licenses and permits into the NTC database system.\n• Conducted a market canvas of computer hardware parts and technical specifications to evaluate suitable upgrades for the IT Unit's workstations.\n• Performed server room maintenance, workstation optimization, and sorted department backlogs to assist office operations.\n• Initiated the software development phase for a requested program assigned by supervisor Sir Nomer, successfully building its main dashboard and landing page.\n• Collaborated on preliminary research and insights to help draft official guidelines for the government Data Privacy Management Program and Privacy Manual.\n\nKEY LEARNINGS:\n• Gained hands-on familiarity with government administrative workflows, institutional record-keeping, and NTC's specialized database systems.\n• Applied hardware evaluation skills to align commercial computer specifications with the specific technical demands of an IT unit.\n• Developed practical frontend development skills by translating user request system requirements into functional UI/UX layouts.\n• Understood the vital role of government data privacy standards and the structural requirements involved in building a compliance manual.\n• Cultivated adaptability and initiative by managing office backlogs and maintaining critical hardware environments like the server room.`,
            imageUrls: [
                "ojt-report-images/week1-1.jpg", "ojt-report-images/week1-2.jpg", "ojt-report-images/week1-3.jpg",
                "ojt-report-images/week1-4.jpg", "ojt-report-images/week1-5.jpg", "ojt-report-images/week1-6.jpg"
            ]
        },
        {
            title: "Week 2: GUI Development, Licensing Automation & System Integration",
            date: "2026-07-09",
            text: `TASKS ACCOMPLISHED:\n• Designed and finalized a series of sequential control badges (01–80) for the National Single Window (NSW) Licensing Assessment, including layout scaling and physical printing.\n• Engineered a desktop DTR (Daily Time Record) System using Python's PySide6 and SQLite, featuring a dashboard, automated attendance logging, CRUD operations for employees, and report exporting capabilities.\n• Resolved complex technical issues including UI rendering bugs and database session errors (DetachedInstanceError) to ensure stable application performance.\n• Developed the foundational structure for a personal OJT portfolio website, implementing "About Me," file upload, and PDF viewing functionalities.\n• Conducted routine administrative tasks including processing new radio license forms, encoding company data and OR numbers into Excel, and maintaining system databases.\n• Initiated planning and parameter analysis for a new, upcoming real-time database-driven system, and began familiarization with the NTC employee request management system.\n\nKEY LEARNINGS:\n• Deepened proficiency in Python and PyQt/PySide6, specifically in connecting GUI elements to backend controllers for professional-grade application development.\n• Gained practical experience in software security and data integrity by implementing admin password protection and automated data validation.\n• Developed cross-platform technical skills by balancing independent programming projects with high-volume administrative record-keeping.\n• Improved workflow efficiency by creating automated solutions for repetitive tasks, such as badge design and data entry formatting.\n• Enhanced professional communication and project management skills by coordinating with supervisors for project approvals and defining system requirements for future development.`,
            imageUrls: [
                "ojt-report-images/week2-1.jpg", "ojt-report-images/week2-2.jpg", "ojt-report-images/week2-3.jpg",
                "ojt-report-images/week2-4.jpg", "ojt-report-images/week2-5.jpg", "ojt-report-images/week2-6.jpg"
            ]
        },
        {
            title: "Week 3: System Architecture Planning, Portfolio Deployment & Admin Support",
            date: "2026-07-16",
            text: `TASKS ACCOMPLISHED:\n• Finalized the design and deployment of the OJT Portfolio website, successfully integrating Firebase for the online database and securing administrative upload functions.\n• Led system architecture planning for a new "Tenant Tracker Admin System," including the definition of modules for tenant information, financial tracking, and security settings.\n• Initialized the professional project repository on GitHub with comprehensive documentation (README.md) and version control protocols.\n• Performed network infrastructure maintenance, including cable management, troubleshooting ethernet connections, and crimping RJ45 connectors.\n• Performed quality assurance on licensing documents, including verifying OR numbers and license types against the official database.\n• Implemented an improved office workflow by integrating Excel-based tracking for real-time monitoring of releasing and licensing processes.\n• Continued regular administrative support, including filing, sorting, and encoding department backlogs to maintain IT unit efficiency.\n\nKEY LEARNINGS:\n• Learned to translate complex business logic into structured software requirements, bridging the gap between operational needs and technical architecture.\n• Gained deeper understanding of frontend-to-backend connectivity by successfully integrating Firebase and SQLite databases with custom applications.\n• Developed practical skills in network hardware maintenance, specifically regarding structured cable management and RJ45 standards.\n• Developed advanced prompt engineering skills to generate precise, production-ready code while maintaining Git version control standards.\n• Strengthened data integrity practices by creating manual tracking systems (Excel) to complement automated database inputs.\n• Reinforced the importance of UI/UX planning and modular design in creating scalable, user-friendly administrative tools.`,
            imageUrls: [
                "ojt-report-images/week3-1.jpg", "ojt-report-images/week3-2.jpg", "ojt-report-images/week3-3.jpg",
                "ojt-report-images/week3-4.jpg", "ojt-report-images/week3-5.jpg", "ojt-report-images/week3-6.jpg"
            ]
        },
        {
            title: "Week 4: Network Fabrication, Automated Email Integration & Database Security",
            date: "2026-07-23",
            text: `TASKS ACCOMPLISHED:\n• Organized, sorted, and catalogued licenses by OR number and type, performing database updates and Excel encoding.\n• Fabricated a custom 3-meter Ethernet cable with RJ45 connectors on both ends and performed network testing via server command prompt ping checks.\n• Maintained and serviced office hardware, including printer ink replacement and maintenance.\n• Developed advanced backend features for the assigned admin system, including local database capture, storage, and CSV export capabilities.\n• Integrated automated email functionality into the admin system and configured database schema and input validation fields.\n• Implemented robust security features (unauthorized login prevention) and added database backup and restore functionalities.\n• Conducted record retrieval tasks, locating missing WDN lists within the filing and records room.\n\nKEY LEARNINGS:\n• Strengthened practical networking skills through physical cable fabrication, crimping standards, and server-side connectivity troubleshooting.\n• Gained hands-on experience in software security by implementing administrative access controls, input validation, and data recovery features (backup/restore).\n• Enhanced data management efficiency by automating database-to-CSV exports and integrating programmatic email notifications.\n• Improved organizational and clerical workflows through rigorous document cataloguing, reconciliation of invoices, and inventory tracking.`,
            imageUrls: [
                "ojt-report-images/week4-1.jpg", "ojt-report-images/week4-2.jpg", "ojt-report-images/week4-3.jpg",
                "ojt-report-images/week4-4.jpg", "ojt-report-images/week4-5.jpg", "ojt-report-images/week4-6.jpg"
            ]
        },
        {
            title: "Week 5: Network Diagnostics, System Deployment & Thermal Printer Integration",
            date: "2026-07-30",
            text: `TASKS ACCOMPLISHED:\n• Performed daily cataloguing, validation, and quality checking of license OR numbers, sorting and segregating files to be forwarded to releasing.\n• Took charge of routine telecommunication and network diagnostics, checking Wi-Fi connectivity, testing telephone lines, and rebooting/testing servers in the NTC server room.\n• Assisted in physically relocating the server from the monitoring room to the IT unit room.\n• Refined and debugged the DTR and admin system applications, fixing UI/UX issues, date-time input bugs, and local database synchronization.\n• Created a comprehensive user manual and successfully packaged the admin system into a standalone executable (.exe) file using PyInstaller for flash drive deployment.\n• Learned to operate the X58C thermal printer and successfully developed a custom queueing system featuring company logos, auto-incrementing numbers, and editable messages.\n\nKEY LEARNINGS:\n• Gained hands-on experience in enterprise IT infrastructure management, including server room troubleshooting, network diagnostics, and telecommunication checks.\n• Enhanced software deployment skills by learning how to package Python applications into portable executables for seamless deployment.\n• Developed hardware integration skills by programming for specialized peripherals like the X58C thermal printer to build practical queueing solutions.\n• Strengthened documentation standards by creating a complete system manual to ensure user-friendly maintenance and operation.`,
            imageUrls: [
                "ojt-report-images/week5-1.jpg", "ojt-report-images/week5-2.jpg", "ojt-report-images/week5-3.jpg",
                "ojt-report-images/week5-4.jpg", "ojt-report-images/week5-5.jpg", "ojt-report-images/week5-6.jpg"
            ]
        },
        {
            title: "Week 6: Telecommunication Diagnostics, Digital Signage & Printer Finalization",
            date: "2026-08-05",
            text: `TASKS ACCOMPLISHED:\n• Performed routine license cataloguing, validation of OR numbers, and encoding into Excel spreadsheets.\n• Officially took charge of communication infrastructure maintenance, systematically testing local/outside telephone lines and Wi-Fi connectivity in the admin room.\n• Configured digital signage on the lobby TV via flash drive to display the NTC Citizen's Charter as a continuous slideshow.\n• Updated and refactored code for the thermal printer receipt application, implementing custom headers, footers, hardcoded Python modifications, and robust file error handling.\n• Reorganized and catalogued documents by date and type in the NTC NCR releasing area to optimize public-facing document retrieval, alongside printing labels for storage logbooks.\n• Enhanced the admin system code to automate date range parameters (automatically advancing 11 years and showing up to 4 years back).\n• Successfully presented the finalized thermal printer queueing/receipt program to the supervisor, gaining approval for official operational use pending paper supplies.\n• Conducted general workstation cleanup and organization to maintain a tidy office environment.\n\nKEY LEARNINGS:\n• Deepened practical expertise in enterprise IT support by managing telecommunication line diagnostics and network troubleshooting independently.\n• Gained hands-on experience in software error handling, user interface customization, and tailoring scripts for peripheral hardware like thermal printers.\n• Improved administrative efficiency by structuring physical archiving systems, labeling storage logbooks, and optimizing public service areas for clients.\n• Strengthened stakeholder communication and project presentation skills by successfully delivering a client-ready software solution approved by supervisors.`,
            imageUrls: [
                "ojt-report-images/week6-1.jpg", "ojt-report-images/week6-2.jpg", "ojt-report-images/week6-3.jpg",
                "ojt-report-images/week6-4.jpg", "ojt-report-images/week6-5.jpg", "ojt-report-images/week6-6.jpg"
            ]
        },
        {
            title: "Week 7: Printer Deployment, Infrastructure Signage & Queue Ticket System",
            date: "2026-08-13",
            text: `TASKS ACCOMPLISHED:\n• Performed routine network diagnostics, testing telephone lines and Wi-Fi connections in both the admin and IT unit rooms.\n• Prepared physical queueing materials by printing, gluing, and cutting queue numbers for use by building security personnel, alongside updating the NTC Citizen's Charter slideshow display.\n• Catalogued, validated, and encoded license OR numbers into Excel spreadsheets.\n• Designed, printed, laminated, and mounted official office signages (e.g., "Employees Only" and "Authorized Personnel Only") across facility walls.\n• Successfully deployed the custom-developed thermal printer receipt queue ticket system for the National Telecommunications Commission (NTC-NCR).\n• Engineered robust software solutions for the XP-58C thermal printer, resolving hardware desync via Windows RAW spooling, implementing dynamic Lanczos image downscaling for the NTC logo, and optimizing layout spacing to save paper.\n• Integrated low-level ESC/POS hexadecimal commands for 3x font scaling on queue numbers, and packaged the multi-instance Tkinter/Pillow application into a standalone .exe file for portable deployment.\n\nKEY LEARNINGS:\n• Mastered low-level hardware communication by bypassing buggy GDI drivers with raw byte streams, direct ESC/POS command injection, and Windows RAW spooler pipelines.\n• Gained practical proficiency in desktop application architecture, utilizing Python, Tkinter state management, and Pillow for real-time live preview rendering and dynamic image processing.\n• Enhanced resource efficiency by optimizing UI layouts for restricted-width 58mm thermal media, ensuring maximum clarity while minimizing government paper waste.\n• Strengthened physical infrastructure management and administrative support through systematic document cataloguing, facility signage deployment, and routine telecommunication checks.`,
            imageUrls: [
                "ojt-report-images/week7-1.jpg", "ojt-report-images/week7-2.jpg", "ojt-report-images/week7-3.jpg",
                "ojt-report-images/week7-4.jpg", "ojt-report-images/week7-5.jpg", "ojt-report-images/week7-6.jpg"
            ]
        },
        {
            title: "Week 8: Radio License Processing, Queue System Refinement & Manuals",
            date: "2026-08-20",
            text: `TASKS ACCOMPLISHED:\n• Printed out official radio station licenses to support ongoing issuance and releasing workflows.\n• Updated and deployed the queuing system thermal printer program installed in the guard area to integrate recent functional enhancements.\n• Conducted routine infrastructure maintenance, verifying Wi-Fi connectivity and testing telephone lines alongside Sir Alvir.\n• Finalized the queue system software and authored a comprehensive user and technical manual detailing step-by-step operating procedures and troubleshooting steps for potential errors.\n\nKEY LEARNINGS:\n• Strengthened technical documentation skills by creating clear, structured manuals to ensure seamless system handovers and troubleshooting.\n• Gained practical experience in deploying and updating live hardware-integrated software in active public areas like the guard security station.\n• Enhanced collaborative IT support capabilities through joint network and telecommunication infrastructure diagnostics.`,
            imageUrls: [
                "ojt-report-images/week8-1.jpg", "ojt-report-images/week8-2.jpg", "ojt-report-images/week8-3.jpg",
                "ojt-report-images/week8-4.jpg", "ojt-report-images/week8-5.jpg", "ojt-report-images/week8-6.jpg"
            ]
        },
        {
            title: "Week 9: Certification Processing, Hardware Maintenance & Configuration",
            date: "2026-08-27",
            text: `TASKS ACCOMPLISHED:\n• Printed official radio operator certificates and permits to purchase, sell, or possess radio equipment.\n• Performed comprehensive hardware maintenance on office printing equipment, including Epson L6290 nozzle head cleaning, ink refilling, ink requisition, and replacing the printer maintenance box with the assistance of Sir Alvir.\n• Validated, catalogued, and encoded license OR numbers and license types.\n• Conducted routine infrastructure checks, verifying Wi-Fi connectivity and monitoring the NTC Citizen's Charter lobby display.\n• Inspected and troubleshot error logs and maintenance metrics for the queuing system receipt program, alongside updating printer configuration settings.\n\nKEY LEARNINGS:\n• Gained hands-on experience in specialized office hardware upkeep, including advanced troubleshooting and parts replacement (maintenance box and print heads) for enterprise multi-function printers.\n• Strengthened administrative workflows by accurately processing critical permits and operator certificates alongside rigorous data encoding.\n• Enhanced system reliability by performing proactive software monitoring and configuration updates for deployed queuing peripherals.`,
            imageUrls: [
                "ojt-report-images/week9-1.jpg", "ojt-report-images/week9-2.jpg", "ojt-report-images/week9-3.jpg",
                "ojt-report-images/week9-4.jpg", "ojt-report-images/week9-5.jpg", "ojt-report-images/week9-6.jpg"
            ]
        },
        {
            title: "Week 10: License Organization, Public Display Setup & Email Integration",
            date: "2026-09-03",
            text: `TASKS ACCOMPLISHED:\n• Organized and catalogued official receipt (OR) numbers and licenses to streamline records management.\n• Powered on the lobby television and configured the NTC Citizen's Charter display for public viewing.\n• Performed routine maintenance and upkeep on queuing system receipt printers located in both the licensing area and the lobby.\n• Configured Gmail app passwords and successfully tested the automated emailing feature integrated into the admin system application.\n\nKEY LEARNINGS:\n• Strengthened systems integration capabilities by successfully configuring and verifying automated email notification pipelines using secure app credentials.\n• Enhanced hardware and peripheral reliability through hands-on maintenance checks on thermal receipt printers across multiple department stations.\n• Improved public-facing office operations by maintaining organized registry records and keeping digital information displays active.`,
            imageUrls: [
                "ojt-report-images/week10-1.jpg", "ojt-report-images/week10-2.jpg", "ojt-report-images/week10-3.jpg",
                "ojt-report-images/week10-4.jpg", "ojt-report-images/week10-5.jpg", "ojt-report-images/week10-6.jpg"
            ]
        },
        {
            title: "Week 11: License Cataloguing, Queuing Diagnostics & Digital Displays",
            date: "2026-09-10",
            text: `TASKS ACCOMPLISHED:\n• Organized, catalogued, and systematically encoded license OR numbers and records into Excel spreadsheets.\n• Conducted routine inspections and error diagnostics on the thermal printer queuing systems to ensure continuous operational readiness.\n• Powered on, configured, and managed the NTC-NCR Citizen's Charter digital display on the lobby television for public viewing.\n\nKEY LEARNINGS:\n• Strengthened administrative data management skills through precise record cataloguing and digital encoding workflows.\n• Enhanced hardware maintenance routines by performing consistent error checking and diagnostic assessments on deployed queuing peripherals.\n• Improved public-facing administrative support by ensuring public information systems and digital signage remain active and updated.`,
            imageUrls: [
                "ojt-report-images/week11-1.jpg", "ojt-report-images/week11-2.jpg", "ojt-report-images/week11-3.jpg",
                "ojt-report-images/week11-4.jpg", "ojt-report-images/week11-5.jpg", "ojt-report-images/week11-6.jpg"
            ]
        }
    ];

    for (let report of myReports) {
        await db.collection("reports").add({
            title: report.title,
            date: report.date,
            text: report.text,
            imageUrls: report.imageUrls,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    alert("Success! All 11 weekly reports and 66 images have been loaded into the database.");
}