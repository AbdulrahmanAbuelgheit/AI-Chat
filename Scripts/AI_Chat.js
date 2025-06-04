let chatHistory = [];

const chatHistoryDiv = document.getElementById('chatHistory');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const chatList = document.getElementById('chatList');
const generateImageBtn = document.getElementById('generateImageBtn');

let chatSessions = JSON.parse(localStorage.getItem('chatSessions') || '{}');
let currentChatId = null;

function saveCurrentChatSession() {
    if (!currentChatId) return;
    chatSessions[currentChatId] = chatHistory;
    localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
}

function renderChatList() {
    chatList.innerHTML = '';
    Object.keys(chatSessions).forEach(chatId => {
        const li = document.createElement('li');
        li.textContent = chatSessions[chatId][0]?.content?.slice(0, 20) || 'New Chat';
        li.className = chatId === currentChatId ? 'active' : '';
        li.onclick = () => loadChatSession(chatId);
        chatList.appendChild(li);
    });
}

function loadChatSession(chatId) {
    saveCurrentChatSession();
    currentChatId = chatId;
    chatHistory = chatSessions[chatId] ? [...chatSessions[chatId]] : [];
    renderChat();
    renderChatList();
}

function startNewChat() {
    saveCurrentChatSession();
    currentChatId = 'chat_' + Date.now();
    chatHistory = [];
    chatSessions[currentChatId] = chatHistory;
    renderChat();
    renderChatList();
    userInput.value = '';
    userInput.focus();
}

function renderChat() {
    chatHistoryDiv.innerHTML = '';
    chatHistory.forEach((msg, idx) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ' + msg.role;
        msgDiv.textContent = msg.content;
        const micBtn = document.createElement('button');
        micBtn.className = 'mic-btn message-mic';
        micBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#066a36" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v14a4 4 0 0 0 4-4V5a4 4 0 0 0-8 0v6a4 4 0 0 0 4 4V1z"></path><line x1="19" y1="10" x2="19" y2="14"></line><line x1="5" y1="10" x2="5" y2="14"></line><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
        micBtn.title = 'Play/Stop message';
        micBtn.onclick = () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            } else {
                const utterance = new SpeechSynthesisUtterance(msg.content);
                speechSynthesis.speak(utterance);
            }
        };
        msgDiv.appendChild(micBtn);
        chatHistoryDiv.appendChild(msgDiv);
    });
    chatHistoryDiv.style.overflowY = 'auto';
    const inputMicBtn = document.getElementById('inputMicBtn');
    let isRecording = false;
    let recognition;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = function() {
            isRecording = true;
            inputMicBtn.classList.add('recording');
        };
        recognition.onend = function() {
            isRecording = false;
            inputMicBtn.classList.remove('recording');
        };
        recognition.onerror = function(event) {
            isRecording = false;
            inputMicBtn.classList.remove('recording');
            alert('Speech recognition error: ' + event.error);
        };
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            userInput.focus();
        };
    }

    if (inputMicBtn) {
        inputMicBtn.onclick = () => {
            const text = userInput.value.trim();
            if (isRecording) {
                recognition && recognition.stop();
                return;
            }
            if (text) {
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.cancel();
                } else {
                    const utterance = new SpeechSynthesisUtterance(text);
                    speechSynthesis.speak(utterance);
                }
            } else if (recognition) {
                recognition.start();
            } else {
                alert('Speech recognition is not supported in this browser.');
            }
        };
    }
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    chatHistory.push({ role: 'user', content: message });
    renderChat();
    userInput.value = '';
    sendBtn.disabled = true;
    chatHistory.push({ role: 'assistant', content: '...typing' });
    renderChat();
    saveCurrentChatSession();
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + OPENAI_API_KEY
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: chatHistory.filter(m => m.role !== 'assistant' || m.content !== '...typing').map(m => ({ role: m.role, content: m.content }))
            })
        });
        const data = await response.json();
        if (chatHistory[chatHistory.length - 1].role === 'assistant' && chatHistory[chatHistory.length - 1].content === '...typing') {
            chatHistory.pop();
        }
        const assistantMsg = data.choices?.[0]?.message?.content || 'No response.';
        chatHistory.push({ role: 'assistant', content: assistantMsg });
        saveCurrentChatSession();
        renderChat();
    } catch (err) {
        if (chatHistory[chatHistory.length - 1].role === 'assistant' && chatHistory[chatHistory.length - 1].content === '...typing') {
            chatHistory.pop();
        }
        chatHistory.push({ role: 'assistant', content: 'Error: ' + err.message });
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

async function generateImage() {
    const prompt = userInput.value.trim();
    if (!prompt) {
        alert('Please enter a prompt to generate an image.');
        return;
    }
    chatHistory.push({ role: 'user', content: prompt });
    renderChat();
    userInput.value = '';
    sendBtn.disabled = true;
    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + OPENAI_API_KEY
            },
            body: JSON.stringify({
                prompt: prompt,
                n: 1,
                size: '512x512'
            })
        });
        const data = await response.json();
        const imageUrl = data.data?.[0]?.url;
        if (imageUrl) {
            chatHistory.push({ role: 'assistant', content: '[Image generated]', imageUrl });
            appendImage(imageUrl);
            saveCurrentChatSession();
        } else {
            chatHistory.push({ role: 'assistant', content: '⚠️ Failed to generate image.' });
            renderChat();
        }
    } catch (error) {
        chatHistory.push({ role: 'assistant', content: '⚠️ Failed to generate image.' });
        renderChat();
    } finally {
        sendBtn.disabled = false;
    }
}

const navbarRight = document.getElementById('navbarRight');
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const closeLogin = document.getElementById('closeLogin');
const closeSignup = document.getElementById('closeSignup');
const loginSubmit = document.getElementById('loginSubmit');
const signupSubmit = document.getElementById('signupSubmit');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');

function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '{}');
}
function setUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}
function getCurrentUser() {
    return localStorage.getItem('currentUser');
}
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
    if (!username || !email || !password || !confirmPassword) {
        signupError.textContent = 'Please fill all fields.';
        return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        signupError.textContent = 'Invalid email address.';
        return;
    }
    if (password !== confirmPassword) {
        signupError.textContent = 'Passwords do not match.';
        return;
    }
    let users = getUsers();
    if (users[username]) {
        signupError.textContent = 'Username already exists.';
        return;
    }
    if (Object.values(users).some(u => u.email === email)) {
        signupError.textContent = 'Email already registered.';
        return;
    }
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
    if (!users[username] || users[username].password !== password) {
        loginError.textContent = 'Invalid username or password.';
        return;
    }
    setCurrentUser(username);
    loginModal.style.display = 'none';
    renderNavbar();
};

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMessage();
});

newChatBtn.addEventListener('click', startNewChat);
generateImageBtn.addEventListener('click', generateImage);

let OPENAI_API_KEY = '';
try {
    const script = document.createElement('script');
    script.src = '/Scripts/api_key.js';
    script.onload = () => {
        if (typeof window.OPENAI_API_KEY !== 'undefined') {
            OPENAI_API_KEY = window.OPENAI_API_KEY;
        } else if (typeof OPENAI_API_KEY !== 'undefined') {
        }
    };
    document.head.appendChild(script);
} catch (e) {
    console.error('Failed to load API key:', e);
}

renderNavbar();
(function init() {
    if (Object.keys(chatSessions).length === 0) {
        startNewChat();
    } else {
        currentChatId = Object.keys(chatSessions)[0];
        chatHistory = [...chatSessions[currentChatId]];
        renderChat();
        renderChatList();
    }
})();