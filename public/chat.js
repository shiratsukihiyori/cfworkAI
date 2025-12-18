/**
 * LLM Chat App Frontend
 *
 * Handles the chat UI interactions and communication with the backend API.
 */

// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");
const clearButton = document.getElementById("clear-button");
const langSwitch = document.getElementById("lang-switch");
const titleText = document.getElementById("title-text");
const taglineText = document.getElementById("tagline-text");
// Note: placeholder will be set on the textarea (#user-input) directly

// Language support
const LOCALES = ["ja", "zh", "en"];
const FALLBACK_LOCALE = "ja";

// Localized strings
const STRINGS = {
  ja: {
    pageTitle: "白月日和 AI チャット",
    title: "白月日和 AI チャット",
    tagline: "やさしく、そばにいるよ。",
    clear: "会話をリセット",
    clearTitle: "会話をクリアします",
    send: "送信",
    placeholder: "メッセージを入力...",
    thinking: "考え中...",
    initialMessage: "こんにちは。白月日和だよ。今日も、ゆっくり話そうね。",
    error: "ごめんね、少し調子がよくないみたい。もう一度試してみてくれる？",
  },
  zh: {
    pageTitle: "白月日和 AI 陪伴聊天",
    title: "白月日和 AI 陪伴聊天",
    tagline: "温柔地，在你身边。",
    clear: "清空对话",
    clearTitle: "清空当前对话",
    send: "发送",
    placeholder: "输入消息...",
    thinking: "思考中...",
    initialMessage: "你好呀，我是白月日和。今天也请多指教呢。",
    error: "抱歉，刚刚遇到一点小状况，可以再试一次吗？",
  },
  en: {
    pageTitle: "Hiyori AI Chat",
    title: "Hiyori AI Chat",
    tagline: "Gently by your side.",
    clear: "Clear Chat",
    clearTitle: "Clear current conversation",
    send: "Send",
    placeholder: "Type a message...",
    thinking: "Thinking...",
    initialMessage: "Hello, I'm Hiyori. Let's have a nice chat today.",
    error: "I'm sorry, something felt off. Could we try once more?",
  },
};

// Helper functions for language support
function getBrowserLocale() {
  try {
    const saved = localStorage.getItem("locale");
    if (saved && LOCALES.includes(saved)) return saved;
  } catch {}
  const browserLang = navigator.language || navigator.userLanguage || "en";
  if (browserLang.startsWith("ja")) return "ja";
  if (browserLang.startsWith("zh")) return "zh";
  if (browserLang.startsWith("en")) return "en";
  return FALLBACK_LOCALE;
}

function updateUIForLocale(locale) {
  const strings = STRINGS[locale] || STRINGS[FALLBACK_LOCALE];

  // Update document language and title
  document.documentElement.lang = locale;
  document.title = strings.pageTitle;

  // Update UI elements if they exist
  if (titleText) titleText.textContent = strings.title;
  if (taglineText) taglineText.textContent = strings.tagline;
  if (clearButton) {
    clearButton.textContent = strings.clear;
    clearButton.title = strings.clearTitle;
  }
  if (typingIndicator) typingIndicator.textContent = strings.thinking;
  if (userInput) userInput.placeholder = strings.placeholder;
  if (sendButton) {
    sendButton.title = strings.send;
    sendButton.setAttribute("aria-label", strings.send);
  }

  // Update active language button
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    if (btn.dataset.locale === locale) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Update chat history if it's the initial message
  if (chatHistory.length === 0) {
    addInitialMessage();
  }
}

function addInitialMessage() {
  const strings = STRINGS[currentLocale] || STRINGS[FALLBACK_LOCALE];
  const initialMessage = {
    role: "assistant",
    content: strings.initialMessage,
  };
  chatHistory = [initialMessage];

  // Clear and re-render messages
  const chatMessages = document.getElementById("chat-messages");
  if (chatMessages) {
    chatMessages.innerHTML = "";
    addMessageToChat("assistant", strings.initialMessage);
  }
}

// Chat state
const MAX_LOCAL_HISTORY = 16;

// Initialize with default language
let currentLocale = getBrowserLocale();
let chatHistory = [];
let isProcessing = false;

// Initialize language
updateUIForLocale(currentLocale);

// Language switch handler
if (langSwitch) {
  langSwitch.addEventListener("click", (e) => {
    const button = e.target.closest(".lang-btn");
    if (!button) return;

    const newLocale = button.dataset.locale;
    if (newLocale && newLocale !== currentLocale && LOCALES.includes(newLocale)) {
      currentLocale = newLocale;
      try { localStorage.setItem("locale", currentLocale); } catch {}
      updateUIForLocale(currentLocale);
    }
  });
}

// Clear chat handler
if (clearButton) {
  clearButton.addEventListener("click", () => {
    chatHistory = [];
    const chatMessages = document.getElementById("chat-messages");
    if (chatMessages) {
      chatMessages.innerHTML = "";
    }
    addInitialMessage();
  });
}

// Auto-resize textarea as user types
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

// Send message on Enter (without Shift)
userInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Send button click handler
sendButton.addEventListener("click", sendMessage);

// Send message to the API
async function sendMessage() {
  const userInput = document.getElementById("user-input");
  const message = userInput.value.trim();

  if (!message || isProcessing) return;

  // Add user message to chat and history
  addMessageToChat("user", message);
  chatHistory.push({
    role: "user",
    content: message,
  });

  userInput.value = "";

  // Show typing indicator and disable input
  typingIndicator.classList.add("visible");
  isProcessing = true;
  userInput.disabled = true;
  sendButton.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: chatHistory,
        locale: currentLocale, // Send current locale to backend
      }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    // Handle SSE streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let responseText = "";

    // Prepare assistant message container
    const messageElement = addMessageToChat("assistant", "");
    const flush = () => {
      const contentElement = messageElement?.querySelector(".bubble p");
      if (contentElement) {
        contentElement.textContent = responseText;
        contentElement.scrollIntoView({ behavior: "smooth" });
      }
    };

    let done = false;
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      if (readerDone) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = consumeSseEvents(buffer);
      buffer = parsed.buffer;
      for (const data of parsed.events) {
        if (data === "[DONE]") { done = true; break; }
        try {
          const json = JSON.parse(data);
          let content = "";
          if (typeof json.response === "string" && json.response.length > 0) {
            content = json.response;
          } else if (json.choices?.[0]?.delta?.content) {
            content = json.choices[0].delta.content;
          }
          if (content) {
            responseText += content;
            flush();
          }
        } catch (e) {
          console.error("SSE JSON parse error:", e, data);
        }
      }
    }

    // finalize
    if (responseText.length > 0) {
      chatHistory.push({ role: "assistant", content: responseText });
      if (chatHistory.length > MAX_LOCAL_HISTORY) {
        chatHistory = chatHistory.slice(-MAX_LOCAL_HISTORY);
      }
    }
  } catch (error) {
    console.error("Error:", error);
    typingIndicator.classList.remove("visible");
    addMessageToChat(
      "assistant",
      STRINGS[currentLocale]?.error || "Sorry, something went wrong."
    );
  } finally {
    // Hide typing indicator and re-enable input
    typingIndicator.classList.remove("visible");
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

/**
 * Render a chat message bubble
 */
function addMessageToChat(role, content) {
  const container = document.getElementById("chat-messages");
  if (!container) return null;

  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}-message`;

  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.innerHTML = '<img src="/img/AI聊天使用头像.png" alt="Hiyori" onerror="this.style.display=\'none\'" />';

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = `<p>${content}</p>`;

    messageEl.appendChild(avatar);
    messageEl.appendChild(bubble);
  } else {
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = `<p>${content}</p>`;
    messageEl.appendChild(bubble);
  }

  container.appendChild(messageEl);
  container.scrollTop = container.scrollHeight;
  return messageEl;
}

function consumeSseEvents(buffer) {
  let normalized = buffer.replace(/\r/g, "");
  const events = [];
  let eventEndIndex;
  
  while ((eventEndIndex = normalized.indexOf("\n\n")) !== -1) {
    const rawEvent = normalized.slice(0, eventEndIndex);
    normalized = normalized.slice(eventEndIndex + 2);

    const lines = rawEvent.split("\n");
    const dataLines = [];
    
    for (const line of lines) {
      if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trimStart());
      }
    }
    
    if (dataLines.length === 0) continue;
    events.push(dataLines.join("\n"));
  }
  
  return { events, buffer: normalized };
}
