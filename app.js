// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCT16wNKYuuR9NO7GEXrJepYiX3qQPemAY",
    authDomain: "ojt-portfolio-web.firebaseapp.com",
    projectId: "ojt-portfolio-web",
    storageBucket: "ojt-portfolio-web.firebasestorage.app",
    messagingSenderId: "345342334262",
    appId: "1:345342334262:web:35493d011eb7406b530f97"
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