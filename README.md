# AI Chat Web App

A modern, full-featured AI chat web application with support for:
- **Chat with OpenAI GPT-4o** (text, multi-turn, chat history)
- **Image generation** (DALL·E)
- **Text-to-Speech** (TTS) for any message or input
- **Speech-to-Text** (voice input) for sending messages
- **User authentication** (local, demo)
- **Beautiful, responsive UI** with dark mode

---

## Screenshots

### Chatting with AI and TTS/Speech-to-Text
![Chat Example](Screenshot%202025-06-04%20222740.png)

### Image Generation
![Image Generation Example](Screenshot%202025-06-04%20223315.png)
### Upload Image Example
![Upload Image Example](Screenshot%202025-06-11%20135800.png)

---

## Features
- **Multi-session chat**: Save, view, and switch between chat histories.
- **Voice input**: Click the mic in the input to dictate your message.
- **TTS**: Click the mic on any message to hear it spoken aloud.
- **Image generation**: Use the "Generate Image" button to create images from prompts.
- **Authentication**: Simple local signup/login for demo purposes.
- **Mobile-friendly**: Responsive layout for desktop and mobile.

---

## Getting Started

1. **Clone the repository:**
   ```sh
   git clone <your-repo-url>
   cd AI_Chat
   ```
2. **Add your OpenAI API key:**
   - Create a file at `Scripts/api_key.js` with this content:
     ```js
     window.OPENAI_API_KEY = 'sk-...'; // your OpenAI API key
     ```
   - **Important:** This file is in `.gitignore` and will not be committed.
3. **Open `AI_Chat.html` in your browser.**

---

## Requirements
- Modern browser (Chrome recommended for speech recognition)
- OpenAI API key (for chat and image generation)

---

## Customization
- All styles are in `Styles/AI_Chat.css`.
- Main logic is in `Scripts/AI_Chat.js`.

---

## License
This project is for educational/demo purposes. Not for production use.

---

## Credits
- [OpenAI API](https://platform.openai.com/)
- UI inspired by ChatGPT and modern web apps.
