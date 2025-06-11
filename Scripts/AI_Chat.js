// Global variables for chat state and DOM elements
    let chatHistory = [];
    let chatSessions = JSON.parse(localStorage.getItem('chatSessions') || '{}');
    let currentChatId = null;
    let currentAttachment = null; // To store the attached file or image

    // DOM Element References
    const chatHistoryDiv = document.getElementById('chatHistory');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    const chatList = document.getElementById('chatList');
    const generateImageBtn = document.getElementById('generateImageBtn');
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');
    const attachmentPreview = document.getElementById('attachmentPreview');
    const navbarRight = document.getElementById('navbarRight');
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const closeLogin = document.getElementById('closeLogin');
    const closeSignup = document.getElementById('closeSignup');
    const loginSubmit = document.getElementById('loginSubmit');
    const signupSubmit = document.getElementById('signupSubmit');
    const loginError = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');

    // --- CHAT SESSION MANAGEMENT ---

    /**
     * Creates a "savable" version of the chat history by removing large data like local blob URLs.
     * This prevents localStorage quota errors.
     * @param {Array} history - The full chat history for the current session.
     * @returns {Array} A sanitized version of the history suitable for localStorage.
     */
    function createSavableHistory(history) {
        return history.map(msg => {
            // Deep copy to avoid modifying the live chatHistory object
            const savableMsg = JSON.parse(JSON.stringify(msg));
            if (savableMsg.role === 'user' && Array.isArray(savableMsg.content)) {
                savableMsg.content.forEach(part => {
                    // Replace temporary blob URLs with a placeholder for storage
                    if (part.type === 'image_url' && part.image_url.url.startsWith('blob:')) {
                        part.image_url.url = '[Image Uploaded]';
                    }
                });
            }
            return savableMsg;
        });
    }

    /**
     * Saves the current chat history to localStorage after sanitizing it.
     */
    function saveCurrentChatSession() {
        if (!currentChatId) return;
        try {
            const savableHistory = createSavableHistory(chatHistory);
            chatSessions[currentChatId] = savableHistory;
            localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
        } catch (e) {
            console.error("Failed to save session, possibly still over quota:", e);
        }
    }

    /**
     * Renders the list of chat sessions in the sidebar.
     */
    function renderChatList() {
        chatList.innerHTML = '';
        Object.keys(chatSessions).forEach(chatId => {
            const li = document.createElement('li');
            const firstMessage = chatSessions[chatId]?.[0];
            let chatTitle = 'New Chat';
            
            if (firstMessage) {
                if (firstMessage.attachment) {
                    chatTitle = `File: ${firstMessage.attachment.name}`;
                } else if (typeof firstMessage.content === 'string') {
                    chatTitle = firstMessage.content.slice(0, 25) + (firstMessage.content.length > 25 ? '...' : '');
                } else if (Array.isArray(firstMessage.content)) {
                    const textPart = firstMessage.content.find(p => p.type === 'text');
                    chatTitle = textPart?.text.slice(0, 25) || 'Image Q&A';
                }
            }
            
            li.textContent = chatTitle;
            li.className = chatId === currentChatId ? 'active' : '';
            li.onclick = () => loadChatSession(chatId);
            chatList.appendChild(li);
        });
    }

    /**
     * Loads a selected chat session from the sidebar.
     */
    function loadChatSession(chatId) {
        if (currentChatId) {
            saveCurrentChatSession();
        }
        currentChatId = chatId;
        chatHistory = chatSessions[chatId] ? [...chatSessions[chatId]] : [];
        clearAttachment();
        renderChat();
        renderChatList();
    }

    /**
     * Starts a new, empty chat session.
     */
    function startNewChat() {
        saveCurrentChatSession();
        currentChatId = 'chat_' + Date.now();
        chatHistory = [];
        chatSessions[currentChatId] = [];
        renderChat();
        renderChatList();
        userInput.value = '';
        clearAttachment();
        userInput.focus();
    }

    // --- CORE CHAT FUNCTIONALITY ---

    /**
     * Renders the entire chat history to the main chat window.
     */
    function renderChat() {
        chatHistoryDiv.innerHTML = '';
        chatHistory.forEach((msg) => {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message ' + msg.role;
            const contentContainer = document.createElement('div');
            
            if (msg.role === 'user') {
                if (msg.attachment) {
                    contentContainer.innerHTML = `
                        <div class="file-attachment-display">
                            <p>File Attached: <strong>${msg.attachment.name}</strong></p>
                        </div>
                        <p>${msg.content}</p>
                    `;
                } else if (Array.isArray(msg.content)) {
                    msg.content.forEach(part => {
                        if (part.type === 'text') {
                            const textNode = document.createElement('p');
                            textNode.textContent = part.text;
                            contentContainer.appendChild(textNode);
                        } else if (part.type === 'image_url') {
                            if (part.image_url.url.startsWith('blob:')) {
                                const img = document.createElement('img');
                                img.src = part.image_url.url;
                                img.alt = 'User Uploaded Image';
                                img.style.maxWidth = '250px';
                                img.style.borderRadius = '8px';
                                img.style.margin = '8px 0';
                                contentContainer.appendChild(img);
                            } else {
                                const placeholder = document.createElement('p');
                                placeholder.textContent = part.image_url.url; // Displays "[Image Uploaded]"
                                placeholder.className = 'image-placeholder';
                                contentContainer.appendChild(placeholder);
                            }
                        }
                    });
                } else {
                    contentContainer.textContent = msg.content || "";
                }
            } else {
                contentContainer.textContent = msg.content || "";
            }
            msgDiv.appendChild(contentContainer);

            if (msg.role === 'assistant' && msg.content && msg.content !== '...typing') {
                const micBtn = document.createElement('button');
                micBtn.className = 'mic-btn message-mic';
                micBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#066a36" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v14a4 4 0 0 0 4-4V5a4 4 0 0 0-8 0v6a4 4 0 0 0 4 4V1z"></path><line x1="19" y1="10" x2="19" y2="14"></line><line x1="5" y1="10" x2="5" y2="14"></line><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
                micBtn.title = 'Play/Stop message';
                micBtn.onclick = () => {
                    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
                    else speechSynthesis.speak(new SpeechSynthesisUtterance(msg.content));
                };
                msgDiv.appendChild(micBtn);
            }

            // Check if the message has an imageUrl (for generated images)
            if (msg.imageUrl) {
                const img = document.createElement('img');
                img.src = msg.imageUrl;
                img.alt = 'Generated Image';
                img.style.maxWidth = '100%';
                img.style.borderRadius = '8px';
                img.style.margin = '8px 0';
                contentContainer.appendChild(img);
            }

            chatHistoryDiv.appendChild(msgDiv);
        });
        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
        setupSpeechRecognition();
    }


    /**
     * Sends the user's message (text, image, or file) to the AI.
     */
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message && !currentAttachment) return;

        // --- Prepare messages for UI and API separately ---
        const isImage = currentAttachment && currentAttachment.type.startsWith('image/');
        const isTextFile = currentAttachment && !isImage;
        
        // This will hold the message object pushed to the live chatHistory for the UI
        let userMessageForUI; 
        // This will hold the version of the message sent to the API
        let apiMessagePayload; 

        if (isImage) {
            // For UI: Use a temporary blob URL to display the image without storing it.
            const blobUrl = URL.createObjectURL(currentAttachment);
            userMessageForUI = {
                role: 'user',
                content: [{ type: 'text', text: message }, { type: 'image_url', image_url: { url: blobUrl } }]
            };
            // For API: Convert the image to Base64. This is what gets sent.
            const base64Image = await toBase64(currentAttachment);
            apiMessagePayload = {
                role: 'user',
                content: [{ type: 'text', text: message }, { type: 'image_url', image_url: { url: base64Image } }]
            };
        } else if (isTextFile) {
            // For UI: Show a clean file attachment representation.
            userMessageForUI = {
                role: 'user',
                content: message,
                attachment: { name: currentAttachment.name }
            };
            // For API: Combine file content with the user's prompt.
            const fileContent = await currentAttachment.text();
            const combinedMessage = `Based on the file "${currentAttachment.name}", answer the following:\n\n---\n${fileContent}\n---\n\nQuestion: ${message}`;
            apiMessagePayload = { role: 'user', content: combinedMessage };
        } else {
            // For standard text messages, UI and API payloads are the same.
            userMessageForUI = { role: 'user', content: message };
            apiMessagePayload = { role: 'user', content: message };
        }

        // Update UI immediately
        chatHistory.push(userMessageForUI);
        renderChat();
        userInput.value = '';
        clearAttachment();
        sendBtn.disabled = true;
        chatHistory.push({ role: 'assistant', content: '...typing' });
        renderChat();
        
        // Construct the final list of messages for the API call
        // It includes the sanitized history PLUS the new API-ready payload
        const apiHistory = [...createSavableHistory(chatHistory.slice(0, -2)), apiMessagePayload];

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_API_KEY },
                body: JSON.stringify({ model: 'gpt-4o-mini', messages: apiHistory })
            });

            chatHistory.pop(); // Remove "...typing" from the UI history
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = `API Error: ${response.status}. ${errorData.error?.message || 'Check console.'}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const assistantMsg = data.choices?.[0]?.message?.content || 'Sorry, I encountered an error.';
            chatHistory.push({ role: 'assistant', content: assistantMsg });

        } catch (err) {
            if (chatHistory.at(-1)?.content === '...typing') chatHistory.pop();
            chatHistory.push({ role: 'assistant', content: err.message });
            console.error("SendMessage Error:", err);
        } finally {
            renderChat();
            saveCurrentChatSession(); // Save the sanitized history
            renderChatList();
            sendBtn.disabled = false;
        }
    }


    // --- ATTACHMENT & FILE HANDLING ---

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        currentAttachment = file;
        attachmentPreview.innerHTML = ''; 

        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-item';

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.height = 40;
            img.onload = () => URL.revokeObjectURL(img.src);
            previewContainer.appendChild(img);
        } 
        
        const fileNameSpan = document.createElement('span');
        fileNameSpan.textContent = file.name;
        previewContainer.appendChild(fileNameSpan);
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove attachment';
        removeBtn.onclick = clearAttachment;
        previewContainer.appendChild(removeBtn);

        attachmentPreview.appendChild(previewContainer);
        attachmentPreview.style.display = 'flex';
    }

    function clearAttachment() {
        currentAttachment = null;
        fileInput.value = '';
        attachmentPreview.innerHTML = '';
        attachmentPreview.style.display = 'none';
    }

    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // --- IMAGE GENERATION ---
    // This function remains unchanged as requested.

    async function generateImage() {
        const prompt = userInput.value.trim();
        if (!prompt) {
            alert('Please enter a prompt to generate an image.');
            return;
        }
        chatHistory.push({ role: 'user', content: `Generate an image of: ${prompt}` });
        renderChat();
        userInput.value = '';
        sendBtn.disabled = true;

        try {
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_API_KEY },
                body: JSON.stringify({ prompt, n: 1, size: '512x512' })
            });
            const data = await response.json();
            const imageUrl = data.data?.[0]?.url;
            if (imageUrl) {
                // Add the image as a message in chatHistory and render
                chatHistory.push({ role: 'assistant', content: '', imageUrl });
                renderChat();
                saveCurrentChatSession();
            } else {
                chatHistory.push({ role: 'assistant', content: '⚠️ Failed to generate image.' });
                renderChat();
            }
        } catch (error) {
            chatHistory.push({ role: 'assistant', content: '⚠️ Error generating image.' });
            renderChat();
        } finally {
            sendBtn.disabled = false;
        }
    }

    function appendImage(url) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message assistant';
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Generated Image';
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.margin = '8px 0';
        msgDiv.appendChild(img);
        chatHistoryDiv.appendChild(msgDiv);
        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    }


    // --- SPEECH RECOGNITION & SYNTHESIS ---

    function setupSpeechRecognition() {
        const inputMicBtn = document.getElementById('inputMicBtn');
        if (!inputMicBtn) return;
        
        let isRecording = false;
        let recognition;

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.onstart = () => { isRecording = true; inputMicBtn.classList.add('recording'); };
            recognition.onend = () => { isRecording = false; inputMicBtn.classList.remove('recording'); };
            recognition.onerror = (event) => { console.error('Speech recognition error:', event.error); };
            recognition.onresult = (event) => {
                userInput.value = event.results[0][0].transcript;
                userInput.focus();
            };
        }

        inputMicBtn.onclick = () => {
            const text = userInput.value.trim();
            if (isRecording) {
                recognition?.stop();
                return;
            }
            if (text) { // If there's text, use TTS
                if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
                else speechSynthesis.speak(new SpeechSynthesisUtterance(text));
            } else if (recognition) { // If no text, use STT
                recognition.start();
            } else {
                alert('Speech recognition is not supported in this browser.');
            }
        };
    }


    // --- USER AUTHENTICATION & UI ---

    function getUsers() { return JSON.parse(localStorage.getItem('users') || '{}'); }
    function setUsers(users) { localStorage.setItem('users', JSON.stringify(users)); }
    function getCurrentUser() { return localStorage.getItem('currentUser'); }
    function setCurrentUser(username) {
        if (username) localStorage.setItem('currentUser', username);
        else localStorage.removeItem('currentUser');
    }

    function renderNavbar() {
        const user = getCurrentUser();
        navbarRight.innerHTML = '';
        if (user) {
            const hello = document.createElement('span');
            hello.textContent = `Hello, ${user}`;
            hello.style.marginRight = '12px';
            navbarRight.appendChild(hello);
            const logoutBtn = document.createElement('button');
            logoutBtn.textContent = 'Logout';
            logoutBtn.onclick = () => {
                setCurrentUser(null);
                renderNavbar();
            };
            navbarRight.appendChild(logoutBtn);
        } else {
            const loginBtn = document.createElement('button');
            loginBtn.textContent = 'Login';
            loginBtn.onclick = () => { loginModal.style.display = 'flex'; };
            navbarRight.appendChild(loginBtn);
            const signupBtn = document.createElement('button');
            signupBtn.textContent = 'Sign Up';
            signupBtn.onclick = () => { signupModal.style.display = 'flex'; };
            navbarRight.appendChild(signupBtn);
        }
    }

    closeLogin.onclick = () => { loginModal.style.display = 'none'; loginError.textContent = ''; };
    closeSignup.onclick = () => { signupModal.style.display = 'none'; signupError.textContent = ''; };
    window.onclick = function(event) {
        if (event.target === loginModal) loginModal.style.display = 'none';
        if (event.target === signupModal) signupModal.style.display = 'none';
    };

    signupSubmit.onclick = function() {
        const username = document.getElementById('signupUsername').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        if (!username || !email || !password || !confirmPassword) { signupError.textContent = 'Please fill all fields.'; return; }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { signupError.textContent = 'Invalid email address.'; return; }
        if (password !== confirmPassword) { signupError.textContent = 'Passwords do not match.'; return; }
        let users = getUsers();
        if (users[username]) { signupError.textContent = 'Username already exists.'; return; }
        if (Object.values(users).some(u => u.email === email)) { signupError.textContent = 'Email already registered.'; return; }
        users[username] = { password, email };
        setUsers(users);
        setCurrentUser(username);
        signupModal.style.display = 'none';
        renderNavbar();
    };

    loginSubmit.onclick = function() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        let users = getUsers();
        if (!users[username] || users[username].password !== password) { loginError.textContent = 'Invalid username or password.'; return; }
        setCurrentUser(username);
        loginModal.style.display = 'none';
        renderNavbar();
    };

    // --- INITIALIZATION ---

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
    newChatBtn.addEventListener('click', startNewChat);
    generateImageBtn.addEventListener('click', generateImage);
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    let OPENAI_API_KEY = '';
    try {
        const script = document.createElement('script');
        script.src = '/Scripts/api_key.js';
        script.onload = () => { OPENAI_API_KEY = window.OPENAI_API_KEY || ''; };
        script.onerror = () => console.error("Could not load API key.");
        document.head.appendChild(script);
    } catch (e) {
        console.error('Failed to create script tag for API key:', e);
    }

    (function init() {
        renderNavbar();
        if (Object.keys(chatSessions).length === 0) {
            startNewChat();
        } else {
            const firstChatId = Object.keys(chatSessions)[0];
            loadChatSession(firstChatId);
        }
    })();
