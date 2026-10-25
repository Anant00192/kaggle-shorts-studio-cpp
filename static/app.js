document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let studioData = {
        globals: { voice: null, bgm: null },
        videos: [],
        outros: []
    };
    let isPolling = false;
    let pollInterval = null;

    // --- DOM Elements ---
    const credsForm = document.getElementById('credsForm');
    const toggleCredsBtn = document.getElementById('toggleCredsBtn');
    const resetDefaultCredsBtn = document.getElementById('resetDefaultCredsBtn');
    const activeUsernameDisplay = document.getElementById('activeUsernameDisplay');
    const kaggleUsernameInput = document.getElementById('kaggleUsername');
    const kaggleKeyInput = document.getElementById('kaggleKey');
    const connectionStatus = document.getElementById('connectionStatus');
    const connectionText = document.getElementById('connectionText');
    const saveCredsBtn = document.getElementById('saveCredsBtn');

    // Multi-Account & Browser Storage
    const quickAccountSelect = document.getElementById('quickAccountSelect');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    const browserSyncTag = document.getElementById('browserSyncTag');
    const accountTagBadge = document.getElementById('accountTagBadge');
    const browserCacheBadge = document.getElementById('browserCacheBadge');
    const accountSubtext = document.getElementById('accountSubtext');

    // Bulk Videos Elements
    const bulkVideosDropzone = document.getElementById('bulkVideosDropzone');
    const bulkVideosInput = document.getElementById('bulkVideosInput');
    const browseVideosBtn = document.getElementById('browseVideosBtn');
    const videosUploadProgress = document.getElementById('videosUploadProgress');
    const videosUploadStatusText = document.getElementById('videosUploadStatusText');
    const queuedVideosList = document.getElementById('queuedVideosList');
    const videoCountBadge = document.getElementById('videoCountBadge');
    const clearAllVideosBtn = document.getElementById('clearAllVideosBtn');

    // Bulk Outros Elements
    const bulkOutrosDropzone = document.getElementById('bulkOutrosDropzone');
    const bulkOutrosInput = document.getElementById('bulkOutrosInput');
    const browseOutrosBtn = document.getElementById('browseOutrosBtn');
    const outrosUploadProgress = document.getElementById('outrosUploadProgress');
    const outrosUploadStatusText = document.getElementById('outrosUploadStatusText');
    const queuedOutrosList = document.getElementById('queuedOutrosList');
    const outroCountBadge = document.getElementById('outroCountBadge');
    const clearAllOutrosBtn = document.getElementById('clearAllOutrosBtn');

    // Pipeline Settings
    const outroRatio = document.getElementById('outroRatio');
    const zoomFactor = document.getElementById('zoomFactor');
    const zoomVal = document.getElementById('zoomVal');
    const cooldownSecs = document.getElementById('cooldownSecs');
    const resolutionMode = document.getElementById('resolutionMode');

    // Launcher & Monitor
    const launchBtn = document.getElementById('launchBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const statusBadge = document.getElementById('statusBadge');
    const statusMessage = document.getElementById('statusMessage');
    const progressBar = document.getElementById('progressBar');
    const terminalLogs = document.getElementById('terminalLogs');
    const clearLogBtn = document.getElementById('clearLogBtn');

    // Cloud Dataset Elements
    const cloudDatasetBadge = document.getElementById('cloudDatasetBadge');
    const cloudDatasetDesc = document.getElementById('cloudDatasetDesc');
    const btnDeleteCloudDataset = document.getElementById('btnDeleteCloudDataset');
    const btnRefreshCloudDataset = document.getElementById('btnRefreshCloudDataset');
    const autoPurgeCheckbox = document.getElementById('autoPurgeCheckbox');

    // --- Range Sliders ---
    if (zoomFactor && zoomVal) {
        zoomFactor.addEventListener('input', (e) => {
            zoomVal.textContent = parseFloat(e.target.value).toFixed(2) + 'x';
        });
    }

    // --- Account & Browser Storage Manager ---
    const STORAGE_KEY = 'kaggle_shorts_studio_accounts';
    const ACTIVE_KEY = 'kaggle_shorts_studio_active';

    function getBrowserName() {
        const ua = navigator.userAgent;
        if (ua.includes("Firefox")) return "Mozilla Firefox";
        if (ua.includes("Edg")) return "Microsoft Edge";
        if (ua.includes("Chrome")) return "Google Chrome";
        if (ua.includes("Safari")) return "Apple Safari";
        return "This Browser";
    }

    function getStoredAccounts() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveStoredAccounts(accounts) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
        } catch (e) {
            console.error('Failed to save accounts to localStorage:', e);
        }
    }

    function getActiveAccount() {
        const accounts = getStoredAccounts();
        const activeUser = localStorage.getItem(ACTIVE_KEY);
        if (activeUser && accounts[activeUser]) {
            return accounts[activeUser];
        }
        const keys = Object.keys(accounts);
        if (keys.length > 0) {
            return accounts[keys[0]];
        }
        return null;
    }

    function setActiveAccount(account) {
        if (!account || !account.username) return;
        localStorage.setItem(ACTIVE_KEY, account.username);
        document.cookie = `kaggle_username=${encodeURIComponent(account.username)}; path=/; max-age=31536000; SameSite=Lax`;
        if (account.key) {
            document.cookie = `kaggle_key=${encodeURIComponent(account.key)}; path=/; max-age=31536000; SameSite=Lax`;
        }
    }

    async function apiFetch(url, options = {}) {
        options.headers = options.headers || {};
        const active = getActiveAccount();
        if (active && active.username) {
            options.headers['X-Kaggle-Username'] = active.username;
            if (active.key) {
                options.headers['X-Kaggle-Key'] = active.key;
            }
        }
        return fetch(url, options);
    }

    function updateConnectionState(connected, text) {
        if (!connectionStatus) return;
        const dot = connectionStatus.querySelector('.dot');
        if (dot) dot.className = 'dot ' + (connected ? 'connected' : 'disconnected');
        if (connectionText) connectionText.textContent = text;
    }

    function renderAccountUI() {
        const accounts = getStoredAccounts();
        const active = getActiveAccount();
        const browserName = getBrowserName();
        const quickSwitcherBox = document.getElementById('quickSwitcherBox');

        if (browserSyncTag) {
            browserSyncTag.textContent = `🌐 ${browserName} Private`;
        }

        if (active && active.username) {
            if (activeUsernameDisplay) activeUsernameDisplay.textContent = `@${active.username}`;
            if (accountTagBadge) {
                accountTagBadge.textContent = 'Connected';
                accountTagBadge.className = 'tag-default';
                accountTagBadge.classList.remove('hidden');
            }
            if (browserCacheBadge) {
                browserCacheBadge.textContent = `Private to ${browserName}`;
            }
            if (accountSubtext) {
                accountSubtext.textContent = `All batch processing in ${browserName} will execute under @${active.username}. Keys are stored locally and never shared.`;
            }
            if (kaggleUsernameInput) kaggleUsernameInput.value = active.username;
            if (kaggleKeyInput) kaggleKeyInput.value = active.key || '';

            if (quickSwitcherBox) quickSwitcherBox.classList.remove('hidden');
            if (credsForm) credsForm.classList.add('hidden');
            if (toggleCredsBtn) toggleCredsBtn.textContent = '⚙️ Manage Account';
        } else {
            if (activeUsernameDisplay) activeUsernameDisplay.textContent = 'Not Connected';
            if (accountTagBadge) accountTagBadge.classList.add('hidden');
            if (browserCacheBadge) browserCacheBadge.textContent = 'No Account Saved';
            if (accountSubtext) {
                accountSubtext.textContent = 'Please enter your Kaggle credentials below. Saved securely ONLY in this browser.';
            }
            if (kaggleUsernameInput) kaggleUsernameInput.value = '';
            if (kaggleKeyInput) kaggleKeyInput.value = '';

            if (quickSwitcherBox) quickSwitcherBox.classList.add('hidden');
            if (credsForm) credsForm.classList.remove('hidden');
            if (toggleCredsBtn) toggleCredsBtn.textContent = '➕ Connect Kaggle Account';
        }

        // Render Quick Switcher dropdown
        if (quickAccountSelect) {
            quickAccountSelect.innerHTML = '';
            const userList = Object.keys(accounts);

            if (userList.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'No saved accounts in this browser';
                quickAccountSelect.appendChild(opt);
            } else {
                userList.forEach(u => {
                    const opt = document.createElement('option');
                    opt.value = u;
                    opt.textContent = `@${u}`;
                    if (active && active.username === u) {
                        opt.selected = true;
                    }
                    quickAccountSelect.appendChild(opt);
                });
            }
        }

        if (deleteAccountBtn) {
            deleteAccountBtn.classList.toggle('hidden', !active);
        }
    }

    async function initKaggleAccounts() {
        try {
            // Read ONLY from this browser's private localStorage
            const localAccounts = getStoredAccounts();
            let active = getActiveAccount();

            if (!active) {
                const keys = Object.keys(localAccounts);
                if (keys.length > 0) {
                    active = localAccounts[keys[0]];
                    setActiveAccount(active);
                }
            }

            renderAccountUI();

            if (active && active.username) {
                await verifyKaggleCreds(active.username, active.key);
            } else {
                updateConnectionState(false, 'Kaggle Account Required');
            }
        } catch (err) {
            console.error('Account init failed:', err);
            renderAccountUI();
        }
    }

    async function verifyKaggleCreds(username, key) {
        updateConnectionState(false, 'Verifying Kaggle API...');
        try {
            const res = await apiFetch('/api/verify_creds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, key })
            });
            const data = await res.json();
            if (data.success) {
                updateConnectionState(true, `Connected: @${username}`);
                checkCloudDatasetStatus();
            } else {
                updateConnectionState(false, data.error || 'Auth failed');
            }
        } catch (e) {
            updateConnectionState(false, 'Cannot reach server');
        }
    }

    // Toggle creds form
    if (toggleCredsBtn && credsForm) {
        toggleCredsBtn.addEventListener('click', () => {
            const isHidden = credsForm.classList.contains('hidden');
            credsForm.classList.toggle('hidden', !isHidden);
            toggleCredsBtn.textContent = isHidden ? '✖ Close Form' : '⚙️ Manage Account';
        });
    }

    // Save account (local to this browser only)
    if (credsForm) {
        credsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = kaggleUsernameInput.value.trim();
            const key = kaggleKeyInput.value.trim();
            if (!username) {
                alert('Please enter a Kaggle username.');
                return;
            }

            const accounts = getStoredAccounts();
            accounts[username] = {
                username,
                key,
                isDefault: false,
                updatedAt: new Date().toISOString()
            };
            saveStoredAccounts(accounts);
            setActiveAccount(accounts[username]);
            renderAccountUI();

            saveCredsBtn.textContent = 'Validating...';
            await verifyKaggleCreds(username, key);
            saveCredsBtn.textContent = '💾 Connect & Save in this Browser';
            credsForm.classList.add('hidden');
            toggleCredsBtn.textContent = '⚙️ Manage Account';
        });
    }

    // Quick switch account
    if (quickAccountSelect) {
        quickAccountSelect.addEventListener('change', async () => {
            const selectedUser = quickAccountSelect.value;
            const accounts = getStoredAccounts();
            if (selectedUser && accounts[selectedUser]) {
                const target = accounts[selectedUser];
                setActiveAccount(target);
                renderAccountUI();
                await verifyKaggleCreds(target.username, target.key);
            }
        });
    }

    // Delete account from this browser
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            const active = getActiveAccount();
            if (!active) return;
            if (confirm(`Remove @${active.username} from this browser?`)) {
                const accounts = getStoredAccounts();
                delete accounts[active.username];
                saveStoredAccounts(accounts);
                localStorage.removeItem(ACTIVE_KEY);
                document.cookie = 'kaggle_username=; path=/; max-age=0; SameSite=Lax';
                document.cookie = 'kaggle_key=; path=/; max-age=0; SameSite=Lax';

                const remaining = Object.keys(accounts);
                if (remaining.length > 0) {
                    setActiveAccount(accounts[remaining[0]]);
                }
                renderAccountUI();
                const newActive = getActiveAccount();
                if (newActive) {
                    verifyKaggleCreds(newActive.username, newActive.key);
                } else {
                    updateConnectionState(false, 'Kaggle Account Required');
                }
            }
        });
    }

    // --- Load Studio State ---
    async function loadStudioState() {
        try {
            const res = await apiFetch('/api/studio_state');
            const data = await res.json();

            studioData.globals = data.globals || { voice: null, bgm: null };
            studioData.videos = data.videos || [];
            studioData.outros = data.outros || [];

            renderGlobals();
            renderVideosQueue();
            renderOutrosQueue();

            if (data.app_state) {
                updateStatusDisplay(data.app_state);
                if (['running', 'syncing', 'pushing'].includes(data.app_state.status)) {
                    startPolling();
                }
            }
        } catch (err) {
            console.error('Failed to load studio state:', err);
        }
    }

    // --- Render Global Audio Dropzones (Voice, BGM) ---
    function renderGlobals() {
        ['voice', 'bgm'].forEach(type => {
            const container = document.getElementById(`${type}-content`);
            if (!container) return;
            const dz = container.closest('.upload-dropzone');
            const info = studioData.globals[type];

            if (info) {
                dz.classList.add('has-file');
                container.innerHTML = `
                    <div class="uploaded-chip">
                        <span class="chip-name" title="${info.original_name}">${info.original_name}</span>
                        <span class="chip-size">(${info.size_mb} MB)</span>
                        <button type="button" class="chip-del" data-type="global" data-asset="${type}" title="Remove file">✕</button>
                    </div>
                `;
            } else {
                dz.classList.remove('has-file');
                container.innerHTML = `<span class="dz-prompt">Click or drag ${type.toUpperCase()} audio</span>`;
            }
        });

        document.querySelectorAll('.chip-del[data-type="global"]').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const asset = btn.dataset.asset;
                await apiFetch('/api/delete_global', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kind: asset })
                });
                studioData.globals[asset] = null;
                renderGlobals();
            };
        });

        setupGlobalDropzones();
    }

    function setupGlobalDropzones() {
        document.querySelectorAll('.upload-dropzone[data-global]').forEach(dz => {
            const assetType = dz.dataset.global;
            const input = dz.querySelector('.file-input');

            dz.onclick = () => {
                if (!studioData.globals[assetType]) input.click();
            };

            input.onchange = () => {
                if (input.files.length > 0) {
                    uploadGlobalFile(assetType, input.files[0]);
                    input.value = '';
                }
            };

            ['dragenter', 'dragover'].forEach(evt => {
                dz.addEventListener(evt, (e) => {
                    e.preventDefault();
                    dz.classList.add('drag-over');
                });
            });

            ['dragleave', 'drop'].forEach(evt => {
                dz.addEventListener(evt, (e) => {
                    e.preventDefault();
                    dz.classList.remove('drag-over');
                });
            });

            dz.ondrop = (e) => {
                e.preventDefault();
                dz.classList.remove('drag-over');
                if (e.dataTransfer.files.length > 0) {
                    uploadGlobalFile(assetType, e.dataTransfer.files[0]);
                }
            };
        });
    }

    async function uploadGlobalFile(kind, file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('kind', kind);

        const container = document.getElementById(`${kind}-content`);
        if (container) container.innerHTML = `<span class="uploading-spinner">Uploading ${file.name}...</span>`;

        try {
            const res = await apiFetch('/api/upload_global', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            studioData.globals[kind] = {
                filename: file.name,
                original_name: data.original_name,
                size_mb: data.size_mb
            };
            renderGlobals();
        } catch (err) {
            alert('Upload failed: ' + err.message);
            renderGlobals();
        }
    }

    // ========================================================
    // --- Bulk Videos Queue (Drag as Many as You Want) ---
    // ========================================================

    function renderVideosQueue() {
        if (!queuedVideosList || !videoCountBadge) return;
        const total = studioData.videos.length;
        videoCountBadge.textContent = `${total} Video${total === 1 ? '' : 's'} Queued`;

        if (clearAllVideosBtn) {
            clearAllVideosBtn.classList.toggle('hidden', total === 0);
        }

        if (total === 0) {
            queuedVideosList.innerHTML = `
                <div class="empty-queue-msg">
                    No videos queued yet. Drag & drop 10, 15, 20+ short videos above!
                </div>
            `;
            return;
        }

        queuedVideosList.innerHTML = '';
        studioData.videos.forEach((vid, idx) => {
            const item = document.createElement('div');
            item.className = 'video-queue-item';
            item.innerHTML = `
                <div class="video-queue-left">
                    <span class="video-queue-idx">#${idx + 1}</span>
                    <div class="video-queue-meta">
                        <span class="video-queue-name" title="${vid.original_name}">🎬 ${vid.original_name}</span>
                        <span class="video-queue-size">(${vid.size_mb} MB)</span>
                    </div>
                </div>
                <button type="button" class="video-queue-del" data-filename="${vid.filename}" title="Remove this video">✕</button>
            `;
            queuedVideosList.appendChild(item);
        });

        queuedVideosList.querySelectorAll('.video-queue-del').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const fn = btn.dataset.filename;
                await deleteVideo(fn);
            };
        });
    }

    async function deleteVideo(filename) {
        try {
            const res = await apiFetch('/api/delete_video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            const data = await res.json();
            if (data.success) {
                studioData.videos = data.all_videos || [];
                renderVideosQueue();
            }
        } catch (err) {
            console.error('Delete video error:', err);
        }
    }

    if (clearAllVideosBtn) {
        clearAllVideosBtn.onclick = async () => {
            if (confirm('Clear all queued short videos?')) {
                try {
                    const res = await apiFetch('/api/clear_videos', { method: 'POST' });
                    const data = await res.json();
                    if (data.success) {
                        studioData.videos = [];
                        renderVideosQueue();
                    }
                } catch (err) {
                    console.error('Clear videos error:', err);
                }
            }
        };
    }

    function setupBulkVideosDropzone() {
        if (!bulkVideosDropzone || !bulkVideosInput) return;

        bulkVideosDropzone.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') {
                bulkVideosInput.click();
            }
        };

        if (browseVideosBtn) {
            browseVideosBtn.onclick = (e) => {
                e.stopPropagation();
                bulkVideosInput.click();
            };
        }

        bulkVideosInput.onchange = () => {
            if (bulkVideosInput.files.length > 0) {
                uploadBulkVideos(Array.from(bulkVideosInput.files));
                bulkVideosInput.value = '';
            }
        };

        ['dragenter', 'dragover'].forEach(evt => {
            bulkVideosDropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                bulkVideosDropzone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(evt => {
            bulkVideosDropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                bulkVideosDropzone.classList.remove('drag-over');
            });
        });

        bulkVideosDropzone.ondrop = (e) => {
            e.preventDefault();
            bulkVideosDropzone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                uploadBulkVideos(Array.from(e.dataTransfer.files));
            }
        };
    }

    async function uploadBulkVideos(files) {
        const videoFiles = files.filter(f => f.name.match(/\.(mp4|mov|mkv|webm)$/i));
        if (videoFiles.length === 0) {
            alert('Please select valid video files (.mp4, .mov, .mkv, .webm)');
            return;
        }

        // Deduplicate selection by file name
        const uniqueFiles = [];
        const seenNames = new Set();
        videoFiles.forEach(f => {
            if (!seenNames.has(f.name)) {
                seenNames.add(f.name);
                uniqueFiles.push(f);
            }
        });

        if (videosUploadProgress) {
            videosUploadProgress.classList.remove('hidden');
            videosUploadStatusText.textContent = `Uploading ${uniqueFiles.length} short video(s)...`;
        }

        const formData = new FormData();
        uniqueFiles.forEach(f => formData.append('files', f));

        try {
            const res = await apiFetch('/api/upload_bulk_videos', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            studioData.videos = data.all_videos || [];
            renderVideosQueue();
        } catch (err) {
            alert('Bulk upload error: ' + err.message);
        } finally {
            if (videosUploadProgress) videosUploadProgress.classList.add('hidden');
        }
    }

    // ========================================================
    // --- Bulk Outros Queue (Podcast Outros) ---
    // ========================================================

    function renderOutrosQueue() {
        if (!queuedOutrosList || !outroCountBadge) return;
        const total = studioData.outros.length;
        outroCountBadge.textContent = `${total} Outro${total === 1 ? '' : 's'}`;

        if (clearAllOutrosBtn) {
            clearAllOutrosBtn.classList.toggle('hidden', total === 0);
        }

        if (total === 0) {
            queuedOutrosList.innerHTML = `
                <div class="empty-queue-msg">
                    No podcast promo clips uploaded. (Optional — attached to every 3rd short if provided)
                </div>
            `;
            return;
        }

        queuedOutrosList.innerHTML = '';
        studioData.outros.forEach((out, idx) => {
            const item = document.createElement('div');
            item.className = 'video-queue-item';
            item.innerHTML = `
                <div class="video-queue-left">
                    <span class="video-queue-idx outro-queue-idx">Outro #${idx + 1}</span>
                    <div class="video-queue-meta">
                        <span class="video-queue-name" title="${out.original_name}">🎬 ${out.original_name}</span>
                        <span class="video-queue-size">(${out.size_mb} MB)</span>
                    </div>
                </div>
                <button type="button" class="video-queue-del" data-filename="${out.filename}" title="Remove this outro">✕</button>
            `;
            queuedOutrosList.appendChild(item);
        });

        queuedOutrosList.querySelectorAll('.video-queue-del').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const fn = btn.dataset.filename;
                await deleteOutro(fn);
            };
        });
    }

    async function deleteOutro(filename) {
        try {
            const res = await apiFetch('/api/delete_outro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            const data = await res.json();
            if (data.success) {
                studioData.outros = data.all_outros || [];
                renderOutrosQueue();
            }
        } catch (err) {
            console.error('Delete outro error:', err);
        }
    }

    if (clearAllOutrosBtn) {
        clearAllOutrosBtn.onclick = async () => {
            if (confirm('Clear all uploaded outro clips?')) {
                try {
                    const res = await apiFetch('/api/clear_outros', { method: 'POST' });
                    const data = await res.json();
                    if (data.success) {
                        studioData.outros = [];
                        renderOutrosQueue();
                    }
                } catch (err) {
                    console.error('Clear outros error:', err);
                }
            }
        };
    }

    function setupBulkOutrosDropzone() {
        if (!bulkOutrosDropzone || !bulkOutrosInput) return;

        bulkOutrosDropzone.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') {
                bulkOutrosInput.click();
            }
        };

        if (browseOutrosBtn) {
            browseOutrosBtn.onclick = (e) => {
                e.stopPropagation();
                bulkOutrosInput.click();
            };
        }

        bulkOutrosInput.onchange = () => {
            if (bulkOutrosInput.files.length > 0) {
                uploadBulkOutros(Array.from(bulkOutrosInput.files));
                bulkOutrosInput.value = '';
            }
        };

        ['dragenter', 'dragover'].forEach(evt => {
            bulkOutrosDropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                bulkOutrosDropzone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(evt => {
            bulkOutrosDropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                bulkOutrosDropzone.classList.remove('drag-over');
            });
        });

        bulkOutrosDropzone.ondrop = (e) => {
            e.preventDefault();
            bulkOutrosDropzone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                uploadBulkOutros(Array.from(e.dataTransfer.files));
            }
        };
    }

    async function uploadBulkOutros(files) {
        const videoFiles = files.filter(f => f.name.match(/\.(mp4|mov|mkv|webm)$/i));
        if (videoFiles.length === 0) {
            alert('Please select valid video files (.mp4, .mov, .mkv, .webm)');
            return;
        }

        // Deduplicate selection by file name
        const uniqueFiles = [];
        const seenNames = new Set();
        videoFiles.forEach(f => {
            if (!seenNames.has(f.name)) {
                seenNames.add(f.name);
                uniqueFiles.push(f);
            }
        });

        if (outrosUploadProgress) {
            outrosUploadProgress.classList.remove('hidden');
            outrosUploadStatusText.textContent = `Uploading ${uniqueFiles.length} outro clip(s)...`;
        }

        const formData = new FormData();
        uniqueFiles.forEach(f => formData.append('files', f));

        try {
            const res = await apiFetch('/api/upload_bulk_outros', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            studioData.outros = data.all_outros || [];
            renderOutrosQueue();
        } catch (err) {
            alert('Outro upload error: ' + err.message);
        } finally {
            if (outrosUploadProgress) outrosUploadProgress.classList.add('hidden');
        }
    }

    // ========================================================
    // --- Launch Execution & Log Polling ---
    // ========================================================

    if (launchBtn) {
        launchBtn.addEventListener('click', async () => {
            // Check reference voice
            if (!studioData.globals.voice) {
                alert('Please upload a Reference Voice sample in Section 2 (required for SeedVC voice conversion).');
                return;
            }

            // Check videos
            if (!studioData.videos || studioData.videos.length === 0) {
                alert('Please drag & drop at least one short video in Section 3.');
                return;
            }

            const active = getActiveAccount();
            if (!active || !active.username) {
                alert('Please configure your Kaggle Account in Section 1.');
                return;
            }

            const config = {
                kaggle_username: active.username,
                kaggle_key: active.key || '',
                outro_ratio: outroRatio ? outroRatio.value : 'every_3rd',
                zoom_factor: zoomFactor ? parseFloat(zoomFactor.value) : 1.08,
                cooldown_secs: cooldownSecs ? parseInt(cooldownSecs.value, 10) : 30,
                resolution: resolutionMode ? resolutionMode.value : '2k',
                ai_upscaling: resolutionMode ? (resolutionMode.value !== 'none') : true,
                auto_purge: autoPurgeCheckbox ? autoPurgeCheckbox.checked : true
            };

            if (!confirm(`Start batch processing for ${studioData.videos.length} short video(s) on Kaggle GPU under @${active.username}?`)) {
                return;
            }

            launchBtn.disabled = true;
            launchBtn.classList.add('btn-disabled');

            try {
                const res = await apiFetch('/api/launch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (parseErr) {
                    throw new Error(`Server error (${res.status}): ${text.substring(0, 120)}`);
                }
                if (!data.success) throw new Error(data.error || 'Pipeline launch failed');

                startPolling();
            } catch (err) {
                alert('Launch failed: ' + err.message);
                launchBtn.disabled = false;
                launchBtn.classList.remove('btn-disabled');
            }
        });
    }

    function updateStatusDisplay(state) {
        if (!statusBadge || !statusMessage || !progressBar) return;

        const st = (state.status || 'idle').toUpperCase();
        statusBadge.textContent = st;
        statusBadge.className = 'status-badge ' + st.toLowerCase();
        statusMessage.textContent = state.message || '';
        progressBar.style.width = (state.progress || 0) + '%';

        if (state.logs && state.logs.length > 0 && terminalLogs) {
            terminalLogs.textContent = state.logs.join('\n');
            terminalLogs.scrollTop = terminalLogs.scrollHeight;
        }

        if (downloadBtn) {
            if (state.status === 'complete' && state.output_file) {
                downloadBtn.classList.remove('hidden');
                downloadBtn.href = '/api/download';
            } else {
                downloadBtn.classList.add('hidden');
            }
        }

        if (['complete', 'error', 'idle'].includes(state.status)) {
            if (launchBtn) {
                launchBtn.disabled = false;
                launchBtn.classList.remove('btn-disabled');
            }
        }
    }

    function startPolling() {
        if (isPolling) return;
        isPolling = true;
        if (pollInterval) clearInterval(pollInterval);

        pollInterval = setInterval(async () => {
            try {
                const res = await apiFetch('/api/poll_status');
                const data = await res.json();
                updateStatusDisplay(data);

                if (['complete', 'error'].includes(data.status)) {
                    clearInterval(pollInterval);
                    isPolling = false;
                }
            } catch (e) {
                console.error('Polling error:', e);
            }
        }, 5000);
    }

    if (clearLogBtn) {
        clearLogBtn.onclick = () => {
            if (terminalLogs) terminalLogs.textContent = 'Logs cleared.';
        };
    }

    // --- Cloud Dataset Status & Purge Manager ---
    async function checkCloudDatasetStatus() {
        if (!cloudDatasetBadge) return;
        const active = getActiveAccount();
        if (!active || !active.username) {
            cloudDatasetBadge.className = 'dataset-sync-badge badge-checking';
            cloudDatasetBadge.textContent = 'Account Not Selected';
            if (cloudDatasetDesc) cloudDatasetDesc.textContent = 'Connect or select your Kaggle account in Section 1 to check cloud dataset.';
            if (btnDeleteCloudDataset) btnDeleteCloudDataset.disabled = true;
            return;
        }

        cloudDatasetBadge.className = 'dataset-sync-badge badge-checking';
        cloudDatasetBadge.textContent = 'Checking status...';

        try {
            const res = await apiFetch('/api/kaggle_dataset_status');
            const data = await res.json();
            if (data.exists) {
                cloudDatasetBadge.className = 'dataset-sync-badge badge-exists';
                cloudDatasetBadge.textContent = '⚠️ Dataset Synced on Cloud';
                if (cloudDatasetDesc) {
                    cloudDatasetDesc.innerHTML = `Previous batch dataset <code>${data.dataset}</code> is stored on Kaggle (<strong>${data.file_count || 0} files</strong>). Click "Delete Cloud Dataset" to wipe it before new runs.`;
                }
                if (btnDeleteCloudDataset) btnDeleteCloudDataset.disabled = false;
            } else {
                cloudDatasetBadge.className = 'dataset-sync-badge badge-clean';
                cloudDatasetBadge.textContent = '✅ Cloud Clean (No Old Dataset)';
                if (cloudDatasetDesc) {
                    cloudDatasetDesc.textContent = 'No old dataset on Kaggle cloud. Your next batch will be created 100% fresh with 0% risk of stale video mixing.';
                }
                if (btnDeleteCloudDataset) btnDeleteCloudDataset.disabled = true;
            }
        } catch (e) {
            console.error('Error checking cloud dataset:', e);
            cloudDatasetBadge.className = 'dataset-sync-badge badge-checking';
            cloudDatasetBadge.textContent = 'Status Unavailable';
            if (cloudDatasetDesc) cloudDatasetDesc.textContent = 'Could not reach Kaggle API to check dataset status.';
        }
    }

    if (btnDeleteCloudDataset) {
        btnDeleteCloudDataset.addEventListener('click', async () => {
            const active = getActiveAccount();
            if (!active || !active.username) {
                alert('No active Kaggle account selected.');
                return;
            }
            if (!confirm(`Are you sure you want to PERMANENTLY DELETE 'batch-shorts-dataset' from Kaggle cloud (@${active.username})?\n\nThis will wipe all previous videos from Kaggle server and stop any active GPU jobs, ensuring your next batch starts 100% clean.`)) {
                return;
            }

            btnDeleteCloudDataset.disabled = true;
            btnDeleteCloudDataset.textContent = '⏳ Deleting on Kaggle...';

            try {
                const res = await apiFetch('/api/delete_kaggle_dataset', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    alert('✅ Cloud Dataset deleted successfully from Kaggle server!');
                    if (terminalLogs) {
                        const ts = new Date().toLocaleTimeString();
                        terminalLogs.textContent += `\n[${ts}] 🗑️ Cloud dataset deleted from Kaggle server. Cloud is 100% clean.`;
                        terminalLogs.scrollTop = terminalLogs.scrollHeight;
                    }
                } else {
                    alert('Error deleting dataset: ' + (data.error || 'Unknown error'));
                }
            } catch (err) {
                alert('Request failed: ' + err.message);
            } finally {
                btnDeleteCloudDataset.textContent = '🗑️ Delete Cloud Dataset';
                await checkCloudDatasetStatus();
            }
        });
    }

    if (btnRefreshCloudDataset) {
        btnRefreshCloudDataset.addEventListener('click', async () => {
            btnRefreshCloudDataset.textContent = '⏳';
            await checkCloudDatasetStatus();
            setTimeout(() => { btnRefreshCloudDataset.textContent = '🔄 Refresh'; }, 500);
        });
    }

    // --- Init ---
    initKaggleAccounts();
    setupBulkVideosDropzone();
    setupBulkOutrosDropzone();
    loadStudioState();
    checkCloudDatasetStatus();
});
