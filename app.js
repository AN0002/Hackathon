// Global state
let currentPage = "dashboard";
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let notes = JSON.parse(localStorage.getItem("notes")) || [];
let calendarEvents = JSON.parse(localStorage.getItem("calendarEvents")) || {};
let scheduleEvents = JSON.parse(localStorage.getItem("scheduleEvents")) || {};
let flashcards = JSON.parse(localStorage.getItem("flashcards")) || [];
let currentNoteId = null;
let pomodoroInterval = null;
let pomodoroTime = 25 * 60;
let pomodoroIsRunning = false;
let pomodoroIsBreak = false;
let studyMaterial = "";
let testQuestions = [];
let currentQuestionIndex = 0;
let selectedAnswer = null;
let draggingNote = null;
let dragOffset = { x: 0, y: 0 };
let currentEventSlot = null;

// Google Gemini API Key (replace with your key from settings)
const GOOGLE_API_KEY = "AIzaSyDAkb9lgx7jwAvpvNY-9JnL58kU8s68nCo"; // Replace with your Google API key

// Initialize Google Generative AI
let genAI = null;
let model = null;

// Store conversation history for context
let conversationHistory = [];

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  initializeNavigation();
  initializeNotes();
  initializeCalendar();
  initializeSchedule();
  initializeStudyTools();
  initializeAI();
  loadSavedData();

  // Set up Enter key handler for AI input
  const aiInput = document.getElementById("ai-input");
  if (aiInput) {
    aiInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        askAI();
      }
    });
  }
});

// Navigation
function initializeNavigation() {
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.getAttribute("href").substring(1);
      switchPage(page);
    });
  });
}

function switchPage(page) {
  // Hide all sections
  document.querySelectorAll(".page-section").forEach((section) => {
    section.classList.remove("active");
  });

  // Show selected section
  const targetSection = document.getElementById(page);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  // Update nav links
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === `#${page}`) {
      link.classList.add("active");
    }
  });

  currentPage = page;

  // Initialize specific page features
  if (page === "dashboard") {
    renderCalendarWidget();
    renderNotesWorkspace();
    renderScheduleWidget();
  } else if (page === "study-tools") {
    renderFlashcards();
  } else if (page === "flappy-bird") {
    setTimeout(() => {
      if (window.initGame) {
        window.initGame();
      }
    }, 200);
  }
}

// AI Initialization
async function initializeAI() {
  const messagesDiv = document.getElementById("ai-messages");
  if (messagesDiv) {
    const welcomeMsg = document.createElement("div");
    welcomeMsg.className = "ai-message assistant";
    welcomeMsg.innerHTML = `
            <strong>Welcome to Lumina AI!</strong><br>
            I'm here to help with your studies. Ask me anything!
        `;
    messagesDiv.appendChild(welcomeMsg);
  }
}

// Local AI fallback - generates intelligent responses when API is unavailable
function generateLocalAIResponse(question) {
  const lowerQuestion = question.toLowerCase();
  const allNotes = notes.map((n) => n.content).join(" ");
  const allFlashcards = flashcards
    .map((c) => `${c.front}: ${c.back}`)
    .join(" ");

  // Check user's notes for context
  if (
    lowerQuestion.includes("note") ||
    lowerQuestion.includes("remember") ||
    lowerQuestion.includes("what did i write")
  ) {
    if (notes.length > 0) {
      const recentNotes = notes
        .slice(-3)
        .map((n) => n.content.substring(0, 100));
      return `Based on your notes, I can see you've been studying: ${recentNotes.join(
        "... "
      )}. Would you like me to help you review these topics or create flashcards from them?`;
    }
    return "You don't have any notes yet. Try creating some notes first by double-clicking on the notes workspace!";
  }

  if (lowerQuestion.includes("flashcard") || lowerQuestion.includes("card")) {
    if (flashcards.length > 0) {
      return `You have ${flashcards.length} flashcards! You can review them in the Study Tools section. Would you like me to help you create more flashcards from your notes?`;
    }
    return "You don't have any flashcards yet. Create some in the Study Tools section, or I can help you generate them from your notes!";
  }

  if (
    lowerQuestion.includes("study") ||
    lowerQuestion.includes("learn") ||
    lowerQuestion.includes("how to study")
  ) {
    return "Great question! Here are some effective study tips:\n\n1. Review your notes regularly - spaced repetition helps retention\n2. Use flashcards for memorization - they're great for key facts\n3. Take breaks with the Pomodoro timer - 25 min focus, 5 min break\n4. Test yourself with the quiz feature - active recall is powerful\n5. Create a study schedule - plan your time in the 3-day schedule\n\nWould you like help with any specific study technique?";
  }

  if (
    lowerQuestion.includes("schedule") ||
    lowerQuestion.includes("time") ||
    lowerQuestion.includes("plan")
  ) {
    return "I can help you manage your schedule! Check your 3-day schedule on the dashboard. You can add events by clicking on any hour slot (6 AM to 11 PM). This helps you plan your study sessions and stay organized!";
  }

  if (lowerQuestion.includes("pomodoro") || lowerQuestion.includes("timer")) {
    return "The Pomodoro Technique is great for focused studying! Go to Study Tools → Pomodoro Timer. Set your focus time (usually 25 min) and break time (usually 5 min). This helps maintain concentration and prevents burnout!";
  }

  if (
    lowerQuestion.includes("test") ||
    lowerQuestion.includes("quiz") ||
    lowerQuestion.includes("practice")
  ) {
    return "You can test yourself in two ways:\n\n1. Test Review - Generate questions from your study material\n2. Quick Quiz - Use your flashcards to test your knowledge\n\nBoth are in the Study Tools section. Would you like help creating study material for testing?";
  }

  if (
    lowerQuestion.includes("help") ||
    lowerQuestion.includes("what can you do")
  ) {
    return "I'm Lumina AI, your study assistant! I can help you with:\n\n📝 Notes - Create and organize study notes\n📅 Schedule - Plan your study time\n🎴 Flashcards - Memorize key concepts\n⏱️ Pomodoro Timer - Stay focused\n📊 Quizzes - Test your knowledge\n🎮 Study Game - Learn while playing\n\nWhat would you like help with?";
  }

  // Generic helpful response
  return "That's an interesting question! I'm here to help you study. Try asking about:\n\n• Your notes and what you've written\n• Study tips and techniques\n• Your schedule and time management\n• Creating flashcards or quizzes\n• Using the Pomodoro timer\n\nOr feel free to ask me anything about studying!";
}

// Direct API call fallback function
async function callGeminiDirectAPI(question, messagesDiv, loadingMsg) {
  try {
    // Use direct REST API call - try gemini-2.0-flash-exp first, fallback to gemini-1.5-flash
    let modelName = "gemini-2.0-flash-exp";
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are Lumina AI, a helpful study assistant. Help students with their studies, answer questions about their notes, provide study tips, and assist with learning. Be friendly, encouraging, and educational.\n\n${conversationHistory
                    .map(
                      (msg) =>
                        `${msg.role === "user" ? "User" : "Assistant"}: ${
                          msg.content
                        }`
                    )
                    .join("\n")}\n\nUser: ${question}\nAssistant:`,
                },
              ],
            },
          ],
        }),
      }
    );

    // If model not found, try gemini-1.0-pro
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || "";

      if (
        errorMsg.includes("not found") &&
        modelName === "gemini-2.0-flash-exp"
      ) {
        console.log(
          "gemini-2.0-flash-exp not available, trying gemini-1.5-flash"
        );
        modelName = "gemini-1.5-flash";
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${GOOGLE_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are Lumina AI, a helpful study assistant. Help students with their studies, answer questions about their notes, provide study tips, and assist with learning. Be friendly, encouraging, and educational.\n\n${conversationHistory
                        .map(
                          (msg) =>
                            `${msg.role === "user" ? "User" : "Assistant"}: ${
                              msg.content
                            }`
                        )
                        .join("\n")}\n\nUser: ${question}\nAssistant:`,
                    },
                  ],
                },
              ],
            }),
          }
        );
      }

      if (!response.ok) {
        const retryErrorData = await response.json().catch(() => ({}));
        const retryErrorMsg = retryErrorData.error?.message || "";

        // If still not found, try v1beta endpoint
        if (retryErrorMsg.includes("not found")) {
          console.log("Trying v1beta endpoint with gemini-2.0-flash-exp");
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `You are Lumina AI, a helpful study assistant. Help students with their studies, answer questions about their notes, provide study tips, and assist with learning. Be friendly, encouraging, and educational.\n\n${conversationHistory
                          .map(
                            (msg) =>
                              `${msg.role === "user" ? "User" : "Assistant"}: ${
                                msg.content
                              }`
                          )
                          .join("\n")}\n\nUser: ${question}\nAssistant:`,
                      },
                    ],
                  },
                ],
              }),
            }
          );

          if (!response.ok) {
            const v1betaErrorData = await response.json().catch(() => ({}));
            throw new Error(
              v1betaErrorData.error?.message || `API error: ${response.status}`
            );
          }
        } else {
          throw new Error(
            retryErrorData.error?.message || `API error: ${response.status}`
          );
        }
      }
    }

    const data = await response.json();
    loadingMsg.remove();

    let answer = "";
    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0]
    ) {
      answer = data.candidates[0].content.parts[0].text;
    }

    if (answer && answer.trim()) {
      const aiMsg = document.createElement("div");
      aiMsg.className = "ai-message assistant";
      aiMsg.textContent = answer.trim();
      messagesDiv.appendChild(aiMsg);
      conversationHistory.push({ role: "assistant", content: answer.trim() });
    } else {
      throw new Error("No response from API");
    }
  } catch (error) {
    throw error; // Re-throw to be handled by main error handler
  }
}

// AI Chat - Using Google Gemini API with local fallback
async function askAI() {
  const input = document.getElementById("ai-input");
  const question = input.value.trim();
  if (!question) return;

  const messagesDiv = document.getElementById("ai-messages");

  // Add user message to UI
  const userMsg = document.createElement("div");
  userMsg.className = "ai-message user";
  userMsg.textContent = question;
  messagesDiv.appendChild(userMsg);

  // Add to conversation history
  conversationHistory.push({ role: "user", content: question });

  // Clear input and show loading
  input.value = "";
  const loadingMsg = document.createElement("div");
  loadingMsg.className = "ai-message assistant";
  loadingMsg.textContent = "Thinking...";
  messagesDiv.appendChild(loadingMsg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  try {
    // Check if API key is set
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY === "YOUR_GOOGLE_API_KEY_HERE") {
      throw new Error("API_KEY_NOT_SET");
    }

    console.log("Calling Google Gemini API");

    // Try to use SDK, but fallback to direct API if not available
    let useSDK = false;

    // Check for SDK in different possible namespaces
    if (typeof google !== "undefined" && google.generativeai) {
      useSDK = true;
    } else if (typeof GoogleGenerativeAI !== "undefined") {
      // Alternative namespace
      google = { generativeai: GoogleGenerativeAI };
      useSDK = true;
    } else {
      // Wait a bit for SDK to load
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (typeof google !== "undefined" && google.generativeai) {
        useSDK = true;
      }
    }

    if (!useSDK) {
      // Use direct API call as fallback
      console.log("SDK not available, using direct API call");
      return await callGeminiDirectAPI(question, messagesDiv, loadingMsg);
    }

    // Initialize Google Generative AI if not already done
    if (!genAI) {
      try {
        genAI = new google.generativeai.GenerativeAI(GOOGLE_API_KEY);
        // Try gemini-2.0-flash-exp first, fallback to gemini-1.5-flash
        try {
          model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-" });
        } catch (e) {
          try {
            model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          } catch (e2) {
            model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
          }
        }
      } catch (initError) {
        console.error("Failed to initialize SDK:", initError);
        // Fallback to direct API
        return await callGeminiDirectAPI(question, messagesDiv, loadingMsg);
      }
    }

    // Build the prompt with conversation history
    const systemPrompt =
      "You are Lumina AI, a helpful study assistant. Help students with their studies, answer questions about their notes, provide study tips, and assist with learning. Be friendly, encouraging, and educational.";

    let fullPrompt = systemPrompt + "\n\n";
    conversationHistory.forEach((msg) => {
      fullPrompt += `${msg.role === "user" ? "User" : "Assistant"}: ${
        msg.content
      }\n`;
    });
    fullPrompt += `User: ${question}\nAssistant:`;

    // Generate content using the SDK
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const answer = response.text();

    console.log("Google API Success");

    // Remove loading message
    loadingMsg.remove();

    if (answer && answer.trim()) {
      // Add AI response to UI
      const aiMsg = document.createElement("div");
      aiMsg.className = "ai-message assistant";
      aiMsg.textContent = answer.trim();
      messagesDiv.appendChild(aiMsg);

      // Add to conversation history
      conversationHistory.push({ role: "assistant", content: answer.trim() });
    } else {
      // Fallback to local AI
      const localResponse = generateLocalAIResponse(question);
      const aiMsg = document.createElement("div");
      aiMsg.className = "ai-message assistant";
      aiMsg.textContent = localResponse;
      messagesDiv.appendChild(aiMsg);
      conversationHistory.push({ role: "assistant", content: localResponse });
    }
  } catch (error) {
    console.error("AI Error:", error);

    // Remove loading message
    loadingMsg.remove();

    // Use local AI fallback for errors
    const localResponse = generateLocalAIResponse(question);
    const aiMsg = document.createElement("div");
    aiMsg.className = "ai-message assistant";

    if (error.message === "API_KEY_NOT_SET") {
      aiMsg.innerHTML = `<strong>⚠️ Google API Key not set. Please add your API key in app.js (line 23).</strong><br><br>${localResponse}`;
    } else if (error.message === "SDK_NOT_LOADED") {
      aiMsg.innerHTML = `<strong>⚠️ Google Generative AI SDK not loaded. Please refresh the page.</strong><br><br>${localResponse}`;
    } else if (
      error.message === "API_KEY_INVALID" ||
      error.message.includes("API key") ||
      error.message.includes("API_KEY")
    ) {
      aiMsg.innerHTML = `<strong>⚠️ Invalid Google API Key. Please check your API key.</strong><br><br>${localResponse}`;
    } else if (
      error.message === "QUOTA_EXCEEDED" ||
      error.message.includes("quota") ||
      error.message.includes("rate limit")
    ) {
      aiMsg.innerHTML = `<strong>⚠️ API quota exceeded, using local mode:</strong><br><br>${localResponse}`;
    } else {
      aiMsg.innerHTML = `<strong>⚠️ API error: ${error.message}. Using local mode:</strong><br><br>${localResponse}`;
    }

    messagesDiv.appendChild(aiMsg);
    conversationHistory.push({ role: "assistant", content: localResponse });
  }

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Notes - Directly editable and draggable
function initializeNotes() {
  renderNotesWorkspace();
}

function renderNotesWorkspace() {
  const workspace = document.getElementById("notes-workspace");
  if (!workspace) return;

  workspace.innerHTML = "";

  // Add "Add Sticky Note" button (always visible, but smaller when notes exist)
  const addButton = document.createElement("button");
  addButton.className = "add-note-button";
  addButton.innerHTML =
    notes.length === 0 ? "📝 Add Sticky Note" : "➕ Add Note";
  if (notes.length > 0) {
    addButton.style.fontSize = "1rem";
    addButton.style.padding = "0.75rem 1.5rem";
    addButton.style.top = "20px";
    addButton.style.left = "20px";
    addButton.style.transform = "none";
  }
  addButton.onclick = () => {
    const x = notes.length === 0 ? 50 : Math.random() * 200 + 50;
    const y = notes.length === 0 ? 50 : Math.random() * 200 + 50;
    createNewNoteSticky(x, y);
  };
  workspace.appendChild(addButton);

  // Load notes with positions
  notes.forEach((note, index) => {
    createNoteSticky(note, index);
  });
}

function createNoteSticky(note, index) {
  const workspace = document.getElementById("notes-workspace");
  if (!workspace) return;

  const sticky = document.createElement("div");
  sticky.className = "note-sticky";
  sticky.style.left = (note.x || Math.random() * 200) + "px";
  sticky.style.top = (note.y || Math.random() * 200) + "px";
  sticky.style.backgroundColor = note.color || "#ffd700";
  sticky.style.fontFamily = note.fontFamily || "Arial";
  sticky.dataset.index = index;

  sticky.innerHTML = `
        <div class="note-toolbar">
            <div class="note-controls">
                <div class="color-picker">
                    <span class="tool-label">Color:</span>
                    <div class="color-options">
                        <div class="color-option" style="background: #ffd700" onclick="changeNoteColor(${index}, '#ffd700')" title="Yellow"></div>
                        <div class="color-option" style="background: #ff6b6b" onclick="changeNoteColor(${index}, '#ff6b6b')" title="Red"></div>
                        <div class="color-option" style="background: #4ecdc4" onclick="changeNoteColor(${index}, '#4ecdc4')" title="Teal"></div>
                        <div class="color-option" style="background: #45b7d1" onclick="changeNoteColor(${index}, '#45b7d1')" title="Blue"></div>
                        <div class="color-option" style="background: #f7b731" onclick="changeNoteColor(${index}, '#f7b731')" title="Orange"></div>
                        <div class="color-option" style="background: #a55eea" onclick="changeNoteColor(${index}, '#a55eea')" title="Purple"></div>
                        <div class="color-option" style="background: #26de81" onclick="changeNoteColor(${index}, '#26de81')" title="Green"></div>
                        <div class="color-option" style="background: #fff" onclick="changeNoteColor(${index}, '#fff')" title="White"></div>
                    </div>
                </div>
                <div class="font-picker">
                    <span class="tool-label">Font:</span>
                    <select class="font-select" id="font-select-${index}" data-index="${index}">
                        <option value="Arial" ${
                          note.fontFamily === "Arial" ? "selected" : ""
                        }>Arial</option>
                        <option value="Georgia" ${
                          note.fontFamily === "Georgia" ? "selected" : ""
                        }>Georgia</option>
                        <option value="Times New Roman" ${
                          note.fontFamily === "Times New Roman"
                            ? "selected"
                            : ""
                        }>Times New Roman</option>
                        <option value="Courier New" ${
                          note.fontFamily === "Courier New" ? "selected" : ""
                        }>Courier New</option>
                        <option value="Verdana" ${
                          note.fontFamily === "Verdana" ? "selected" : ""
                        }>Verdana</option>
                        <option value="Comic Sans MS" ${
                          note.fontFamily === "Comic Sans MS" ? "selected" : ""
                        }>Comic Sans</option>
                        <option value="Impact" ${
                          note.fontFamily === "Impact" ? "selected" : ""
                        }>Impact</option>
                        <option value="Trebuchet MS" ${
                          note.fontFamily === "Trebuchet MS" ? "selected" : ""
                        }>Trebuchet</option>
                    </select>
                </div>
            </div>
            <button class="note-delete" onclick="deleteNoteSticky(${index})" title="Delete">×</button>
        </div>
        <textarea placeholder="Type your note here..." oninput="saveNoteContent(${index}, this.value)" style="font-family: ${
    note.fontFamily || "Arial"
  }">${note.content || ""}</textarea>
    `;

  // Make draggable
  makeDraggable(sticky, index);

  workspace.appendChild(sticky);

  // Set up font selector event listener
  const fontSelect = sticky.querySelector(`#font-select-${index}`);
  if (fontSelect) {
    fontSelect.addEventListener("change", (e) => {
      changeNoteFont(index, e.target.value);
    });
  }
}

function changeNoteColor(index, color) {
  notes[index].color = color;
  localStorage.setItem("notes", JSON.stringify(notes));
  const sticky = document.querySelector(`[data-index="${index}"]`);
  if (sticky) {
    sticky.style.backgroundColor = color;
  }
}

function changeNoteFont(index, fontFamily) {
  notes[index].fontFamily = fontFamily;
  localStorage.setItem("notes", JSON.stringify(notes));
  const sticky = document.querySelector(`[data-index="${index}"]`);
  if (sticky) {
    sticky.style.fontFamily = fontFamily;
    const textarea = sticky.querySelector("textarea");
    if (textarea) {
      textarea.style.fontFamily = fontFamily;
    }
  }
}

function makeDraggable(element, index) {
  let isDragging = false;
  let startX, startY, initialX, initialY;
  const workspace = element.parentElement;

  // Add drag handle - the toolbar area
  const toolbar = element.querySelector(".note-toolbar");
  if (toolbar) {
    toolbar.style.cursor = "move";
  }

  const handleMouseDown = (e) => {
    // Don't drag if clicking on interactive elements
    const target = e.target;
    if (
      target.tagName === "TEXTAREA" ||
      target.tagName === "BUTTON" ||
      target.tagName === "SELECT" ||
      target.tagName === "OPTION" ||
      target.closest("select") ||
      target.closest("button") ||
      target.closest(".color-option")
    ) {
      return;
    }

    isDragging = true;
    element.classList.add("dragging");
    element.style.zIndex = "10000";
    element.style.cursor = "grabbing";

    const rect = element.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    initialX = rect.left;
    initialY = rect.top;

    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const newX = initialX + dx;
    const newY = initialY + dy;

    // Use fixed positioning to allow dragging outside workspace
    element.style.position = "fixed";
    element.style.left = newX + "px";
    element.style.top = newY + "px";

    e.preventDefault();
  };

  const handleMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      element.classList.remove("dragging");
      element.style.cursor = "";

      // Get current position
      const currentX = parseFloat(element.style.left);
      const currentY = parseFloat(element.style.top);

      // Convert back to absolute positioning relative to workspace
      const workspaceRect = workspace.getBoundingClientRect();
      const relativeX = currentX - workspaceRect.left;
      const relativeY = currentY - workspaceRect.top;

      element.style.position = "absolute";
      element.style.left = relativeX + "px";
      element.style.top = relativeY + "px";
      element.style.zIndex = "1";

      // Save position
      notes[index].x = relativeX;
      notes[index].y = relativeY;
      localStorage.setItem("notes", JSON.stringify(notes));
    }
  };

  // Attach event listeners to the entire note element
  element.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  // Store handlers for cleanup if needed
  element._dragHandlers = { handleMouseDown, handleMouseMove, handleMouseUp };
}

function createNewNoteSticky(x, y) {
  const newNote = {
    content: "",
    x: x,
    y: y,
    date: new Date().toISOString(),
  };

  notes.push(newNote);
  localStorage.setItem("notes", JSON.stringify(notes));
  createNoteSticky(newNote, notes.length - 1);
}

function saveNoteContent(index, content) {
  notes[index].content = content;
  notes[index].date = new Date().toISOString();
  localStorage.setItem("notes", JSON.stringify(notes));
}

function deleteNoteSticky(index) {
  if (confirm("Delete this note?")) {
    notes.splice(index, 1);
    localStorage.setItem("notes", JSON.stringify(notes));
    renderNotesWorkspace();
  }
}

// Calendar Widget
function initializeCalendar() {
  renderCalendarWidget();
}

function renderCalendarWidget() {
  const monthYear = document.getElementById("calendar-month-year-widget");
  const grid = document.getElementById("calendar-grid-widget");

  if (!monthYear || !grid) return;

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  monthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;

  grid.innerHTML = "";

  // Day headers
  const dayHeaders = ["S", "M", "T", "W", "T", "F", "S"];
  dayHeaders.forEach((day) => {
    const header = document.createElement("div");
    header.className = "calendar-day-widget";
    header.style.fontWeight = "bold";
    header.style.color = "var(--gold)";
    header.textContent = day;
    grid.appendChild(header);
  });

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();

  // Previous month days
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = document.createElement("div");
    day.className = "calendar-day-widget other-month";
    day.textContent = prevMonthDays - i;
    grid.appendChild(day);
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const day = document.createElement("div");
    const isToday =
      today.getDate() === i &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear;
    day.className = `calendar-day-widget ${isToday ? "today" : ""}`;
    day.textContent = i;
    grid.appendChild(day);
  }

  // Next month days
  const remainingDays = 42 - (firstDay + daysInMonth);
  for (let i = 1; i <= remainingDays; i++) {
    const day = document.createElement("div");
    day.className = "calendar-day-widget other-month";
    day.textContent = i;
    grid.appendChild(day);
  }
}

function previousMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendarWidget();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendarWidget();
}

// Schedule Widget - 3 Day
function initializeSchedule() {
  renderScheduleWidget();
}

function renderScheduleWidget() {
  const today = new Date();

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);

    const dayLabel = document.getElementById(`day-${dayOffset}-label`);
    const dayHours = document.getElementById(`day-${dayOffset}-hours`);

    if (!dayLabel || !dayHours) continue;

    // Set day label
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    dayLabel.textContent = `${dayNames[date.getDay()]}, ${
      monthNames[date.getMonth()]
    } ${date.getDate()}`;

    // Create hour boxes
    dayHours.innerHTML = "";
    const dateKey = date.toISOString().split("T")[0];

    for (let hour = 6; hour <= 23; hour++) {
      const hourBox = document.createElement("div");
      hourBox.className = "hour-box";
      hourBox.onclick = () => openEventModal(dateKey, hour);

      const timeStr = `${String(hour).padStart(2, "0")}:00`;
      const eventKey = `${dateKey} ${timeStr}`;
      const events = scheduleEvents[eventKey] || [];

      hourBox.innerHTML = `
                <div class="hour-time">${timeStr}</div>
                <div class="hour-event ${events.length === 0 ? "empty" : ""}">
                    ${
                      events.length > 0
                        ? events.map((e) => e.title).join(", ")
                        : "Click to add event"
                    }
                </div>
            `;

      dayHours.appendChild(hourBox);
    }
  }
}

function openEventModal(dateKey, hour) {
  currentEventSlot = { dateKey, hour };
  const modal = document.getElementById("event-modal");
  document.getElementById("event-title").value = "";
  document.getElementById("event-time").value = `${String(hour).padStart(
    2,
    "0"
  )}:00`;
  modal.classList.add("active");
}

function closeEventModal() {
  document.getElementById("event-modal").classList.remove("active");
  currentEventSlot = null;
}

function saveEvent() {
  if (!currentEventSlot) return;

  const title = document.getElementById("event-title").value.trim();
  const time = document.getElementById("event-time").value;

  if (!title) {
    alert("Please enter an event title");
    return;
  }

  const eventKey = `${currentEventSlot.dateKey} ${time}`;
  if (!scheduleEvents[eventKey]) {
    scheduleEvents[eventKey] = [];
  }

  scheduleEvents[eventKey].push({ title, time });
  localStorage.setItem("scheduleEvents", JSON.stringify(scheduleEvents));

  closeEventModal();
  renderScheduleWidget();
}

// Test Review - Use AI to generate better questions
async function generateTest() {
  const topicInput = document.getElementById("review-topic");
  const materialInput = document.getElementById("review-material");
  const container = document.getElementById("test-questions");

  let topic = topicInput.value;
  let material = materialInput.value;

  // Auto-fill from notes if not provided
  if (!material && notes.length > 0) {
    material = notes
      .map((n) => n.content)
      .filter((c) => c.trim())
      .join("\n\n");
    materialInput.value = material;
  }

  if (!topic && notes.length > 0) {
    topic = "Study Material";
    topicInput.value = topic;
  }

  if (!material) {
    alert("Please enter study material or create some notes first");
    return;
  }

  studyMaterial = material;

  // Show loading
  container.innerHTML =
    '<div class="loading-message">🤖 AI is generating high-quality questions from your material...</div>';

  // Generate questions using AI
  try {
    testQuestions = await generateQuestionsWithAI(
      topic || "Study Material",
      material
    );
    currentQuestionIndex = 0;
    renderTestQuestions();
  } catch (error) {
    console.error("Error generating questions:", error);
    // Fallback to local generation
    testQuestions = generateQuestionsFromNotes(
      topic || "Study Material",
      material
    );
    currentQuestionIndex = 0;
    renderTestQuestions();
  }
}

// Generate questions using AI
async function generateQuestionsWithAI(topic, material) {
  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === "YOUR_GOOGLE_API_KEY_HERE") {
    // Fallback to local generation
    return generateQuestionsFromNotes(topic, material);
  }

  try {
    // Initialize AI if needed
    if (!genAI) {
      if (typeof google !== "undefined" && google.generativeai) {
        genAI = new google.generativeai.GenerativeAI(GOOGLE_API_KEY);
        try {
          model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-" });
        } catch (e) {
          try {
            model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          } catch (e2) {
            model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
          }
        }
      } else {
        return generateQuestionsFromNotes(topic, material);
      }
    }

    const prompt = `You are an expert educator creating test questions. Based on the following study material about "${topic}", generate 5 high-quality multiple-choice questions.

Study Material:
${material.substring(0, 3000)}

Requirements:
1. Create 5 diverse, well-written questions that test understanding
2. Each question should have 4 answer options (A, B, C, D)
3. Make questions clear and educational, not just snippets
4. Include a brief summary/context for each question
5. Make wrong answers plausible but clearly incorrect
6. Format your response as JSON with this exact structure:
{
  "questions": [
    {
      "summary": "Brief context about what this question tests",
      "question": "The actual question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0
    }
  ]
}

Return ONLY valid JSON, no other text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let jsonText = text.trim();
    // Remove markdown code blocks if present
    jsonText = jsonText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const data = JSON.parse(jsonText);

    if (data.questions && Array.isArray(data.questions)) {
      // Randomize correct answer positions
      data.questions.forEach((q) => {
        if (q.correct !== undefined && q.options && q.options.length === 4) {
          const correctAnswer = q.options[q.correct];
          // Shuffle options
          const shuffled = [...q.options].sort(() => Math.random() - 0.5);
          q.correct = shuffled.indexOf(correctAnswer);
          q.options = shuffled;
        }
      });
      return data.questions;
    }
  } catch (error) {
    console.error("AI question generation error:", error);
  }

  // Fallback to local generation
  return generateQuestionsFromNotes(topic, material);
}

function generateQuestionsFromNotes(topic, material) {
  const sentences = material
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 20);
  const questions = [];

  // Generate 5 questions from the material with better formatting
  for (let i = 0; i < Math.min(5, sentences.length); i++) {
    const sentence = sentences[i].trim();
    if (sentence.length < 20) continue;

    // Extract key terms
    const words = sentence.split(" ").filter((w) => w.length > 4);
    const keyWord =
      words[Math.floor(Math.random() * words.length)] || "concept";

    // Create better question format
    const questionText = `According to your study material on ${topic}, which of the following best describes "${keyWord}"?`;
    const correctAnswer = sentence.trim();

    // Create plausible wrong answers
    const wrongAnswers = [
      `This concept is not directly addressed in the material about ${topic}`,
      `The material presents a different perspective on this concept`,
      `This information is only partially covered in your notes`,
    ];

    // Shuffle options
    const allOptions = [correctAnswer, ...wrongAnswers];
    const shuffled = [...allOptions].sort(() => Math.random() - 0.5);
    const correctIndex = shuffled.indexOf(correctAnswer);

    questions.push({
      summary: `This question tests your understanding of key concepts related to ${keyWord} in your ${topic} study material.`,
      question: questionText,
      options: shuffled,
      correct: correctIndex,
    });
  }

  // If not enough questions, add generic ones with better formatting
  while (questions.length < 5) {
    const keyPoint = material.substring(0, 100).trim();
    const wrongAnswers = [
      "This information is not found in your study material",
      "The material presents conflicting information",
      "This concept is mentioned but not explained in detail",
    ];

    const allOptions = [keyPoint, ...wrongAnswers];
    const shuffled = [...allOptions].sort(() => Math.random() - 0.5);
    const correctIndex = shuffled.indexOf(keyPoint);

    questions.push({
      summary: `This question evaluates your recall of important information from your ${topic} notes.`,
      question: `What is a key point or main idea from your study material about ${topic}?`,
      options: shuffled,
      correct: correctIndex,
    });
  }

  return questions;
}

function renderTestQuestions() {
  const container = document.getElementById("test-questions");
  if (!container) return;

  container.innerHTML = "";

  if (testQuestions.length === 0) {
    container.innerHTML =
      '<p>No questions generated yet. Click "Generate Test Questions" to start.</p>';
    return;
  }

  testQuestions.forEach((q, index) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "test-question";
    questionDiv.id = `question-${index}`;

    const optionsHtml = q.options
      .map(
        (opt, optIndex) => `
            <div class="test-option" onclick="selectAnswer(${index}, ${optIndex})" id="opt-${index}-${optIndex}">
                ${opt}
            </div>
        `
      )
      .join("");

    questionDiv.innerHTML = `
            <h3>Question ${index + 1}</h3>
            <p>${q.question}</p>
            <div class="test-options">${optionsHtml}</div>
            <div id="result-${index}" class="test-result" style="display: none;"></div>
        `;

    container.appendChild(questionDiv);
  });
}

function selectAnswer(questionIndex, optionIndex) {
  document
    .querySelectorAll(`#question-${questionIndex} .test-option`)
    .forEach((opt) => {
      opt.classList.remove("selected");
    });

  document
    .getElementById(`opt-${questionIndex}-${optionIndex}`)
    .classList.add("selected");

  const question = testQuestions[questionIndex];
  const resultDiv = document.getElementById(`result-${questionIndex}`);

  if (optionIndex === question.correct) {
    resultDiv.className = "test-result correct";
    resultDiv.textContent = "✓ Correct!";
    resultDiv.style.display = "block";
  } else {
    resultDiv.className = "test-result incorrect";
    resultDiv.textContent = `✗ Incorrect. The correct answer is: ${
      question.options[question.correct]
    }`;
    resultDiv.style.display = "block";
  }
}

// Study Tools
function initializeStudyTools() {
  renderFlashcards();
}

function switchTool(tool) {
  document
    .querySelectorAll(".tool-tab")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".tool-content")
    .forEach((content) => content.classList.remove("active"));

  const tabs = document.querySelectorAll(".tool-tab");
  tabs.forEach((tab) => {
    const tabText = tab.textContent.toLowerCase();
    if (
      (tool === "flashcards" && tabText.includes("flashcard")) ||
      (tool === "pomodoro" && tabText.includes("pomodoro")) ||
      (tool === "quiz" && tabText.includes("quiz"))
    ) {
      tab.classList.add("active");
    }
  });

  const content = document.getElementById(`${tool}-tool`);
  if (content) {
    content.classList.add("active");
  }
}

function renderFlashcards() {
  const list = document.getElementById("flashcards-list");
  if (!list) return;

  list.innerHTML = "";

  flashcards.forEach((card, index) => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "flashcard";
    cardDiv.onclick = () => flipFlashcard(index);
    cardDiv.innerHTML = `
            <div class="flashcard-label">${index + 1}</div>
            <div class="flashcard-front">${card.front}</div>
            <div class="flashcard-back">${card.back}</div>
        `;
    list.appendChild(cardDiv);
  });

  // Update quiz status
  const quizStatus = document.getElementById("quiz-status");
  if (quizStatus) {
    if (flashcards.length > 0) {
      quizStatus.textContent = `You have ${flashcards.length} flashcards ready for quiz!`;
    } else {
      quizStatus.textContent =
        "Create flashcards first, then use them for quizzes!";
    }
  }
}

function flipFlashcard(index) {
  const card = document.querySelectorAll(".flashcard")[index];
  card.classList.toggle("flipped");
}

async function addFlashcard() {
  const front = prompt(
    "Enter front of card (or type 'AI' to generate from notes):"
  );
  if (!front) return;

  if (front.toLowerCase() === "ai" || front.toLowerCase() === "'ai'") {
    // Generate flashcards from notes using AI
    if (notes.length === 0) {
      alert("You need to create some notes first!");
      return;
    }

    const allNotes = notes.map((n) => n.content).join("\n\n");
    await generateFlashcardsFromNotes(allNotes);
    return;
  }

  const back = prompt("Enter back of card:");
  if (back) {
    flashcards.push({ front, back });
    localStorage.setItem("flashcards", JSON.stringify(flashcards));
    renderFlashcards();
  }
}

function shuffleFlashcards() {
  for (let i = flashcards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flashcards[i], flashcards[j]] = [flashcards[j], flashcards[i]];
  }
  localStorage.setItem("flashcards", JSON.stringify(flashcards));
  renderFlashcards();
}

// Generate flashcards from notes using AI
async function generateFlashcardsFromNotes(notesText) {
  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === "YOUR_GOOGLE_API_KEY_HERE") {
    alert("AI features require an API key. Creating flashcards manually...");
    return;
  }

  try {
    // Initialize AI if needed
    if (!genAI) {
      if (typeof google !== "undefined" && google.generativeai) {
        genAI = new google.generativeai.GenerativeAI(GOOGLE_API_KEY);
        try {
          model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-" });
        } catch (e) {
          try {
            model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          } catch (e2) {
            model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
          }
        }
      } else {
        alert("AI not available. Please create flashcards manually.");
        return;
      }
    }

    const prompt = `Based on the following study notes, create 5-10 high-quality flashcards. Each flashcard should have:
- Front: A clear question or term to study
- Back: A concise, educational answer

Notes:
${notesText.substring(0, 2000)}

Format your response as JSON:
{
  "flashcards": [
    {"front": "Question or term", "back": "Answer or definition"}
  ]
}

Return ONLY valid JSON, no other text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Remove markdown code blocks if present
    text = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const data = JSON.parse(text);

    if (data.flashcards && Array.isArray(data.flashcards)) {
      flashcards.push(...data.flashcards);
      localStorage.setItem("flashcards", JSON.stringify(flashcards));
      renderFlashcards();
      alert(`Generated ${data.flashcards.length} flashcards from your notes!`);
    }
  } catch (error) {
    console.error("Error generating flashcards:", error);
    alert("Failed to generate flashcards. Please create them manually.");
  }
}

// Summarize notes using AI
async function summarizeNotesWithAI() {
  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === "YOUR_GOOGLE_API_KEY_HERE") {
    const messagesDiv = document.getElementById("ai-messages");
    if (messagesDiv) {
      const msg = document.createElement("div");
      msg.className = "ai-message assistant";
      msg.textContent =
        "AI summarization requires an API key. Here's a quick overview of your notes:\n\n" +
        notes
          .slice(0, 5)
          .map((n, i) => `Note ${i + 1}: ${n.content.substring(0, 150)}...`)
          .join("\n\n");
      messagesDiv.appendChild(msg);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    return;
  }

  try {
    // Initialize AI if needed
    if (!genAI) {
      if (typeof google !== "undefined" && google.generativeai) {
        genAI = new google.generativeai.GenerativeAI(GOOGLE_API_KEY);
        try {
          model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-" });
        } catch (e) {
          try {
            model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          } catch (e2) {
            model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
          }
        }
      } else {
        return;
      }
    }

    const allNotes = notes.map((n) => n.content).join("\n\n");
    const prompt = `Summarize the following study notes in a clear, organized way. Provide:
1. Main topics covered
2. Key concepts and definitions
3. Important points to remember
4. Study recommendations

Notes:
${allNotes.substring(0, 3000)}

Create a comprehensive but concise summary that helps the student review effectively.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    const messagesDiv = document.getElementById("ai-messages");
    if (messagesDiv) {
      const msg = document.createElement("div");
      msg.className = "ai-message assistant";
      msg.innerHTML = `<strong>📋 Summary of Your ${
        notes.length
      } Notes:</strong><br><br>${summary.replace(/\n/g, "<br>")}`;
      messagesDiv.appendChild(msg);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  } catch (error) {
    console.error("Error summarizing notes:", error);
  }
}

// Quiz functionality
let currentQuizCard = 0;
let quizScore = 0;
let quizTotal = 0;

function startQuiz() {
  if (flashcards.length === 0) {
    document.getElementById("quiz-status").textContent =
      "Please create flashcards first!";
    return;
  }

  currentQuizCard = 0;
  quizScore = 0;
  quizTotal = flashcards.length;

  document.getElementById("quiz-setup").style.display = "none";
  document.getElementById("quiz-question").style.display = "block";

  showQuizQuestion();
}

function showQuizQuestion() {
  if (currentQuizCard >= flashcards.length) {
    showQuizResults();
    return;
  }

  const card = flashcards[currentQuizCard];
  const questionDiv = document.getElementById("quiz-question");

  // Randomly show front or back
  const showFront = Math.random() > 0.5;
  const question = showFront ? card.front : card.back;
  const answer = showFront ? card.back : card.front;

  // Generate wrong answers
  const wrongAnswers = flashcards
    .filter((c, i) => i !== currentQuizCard)
    .map((c) => (showFront ? c.back : c.front))
    .slice(0, 3);

  const allAnswers = [answer, ...wrongAnswers].sort(() => Math.random() - 0.5);
  const correctIndex = allAnswers.indexOf(answer);

  // Format question better with summary
  const questionText = showFront
    ? `What is the answer to: "${question}"?`
    : `What is the question for: "${question}"?`;

  // Ensure we have enough wrong answers
  while (wrongAnswers.length < 3) {
    wrongAnswers.push("This is not the correct answer");
  }

  questionDiv.innerHTML = `
        <div class="question-header">
            <h3>Question ${currentQuizCard + 1} of ${quizTotal}</h3>
            <p class="question-summary">This question tests your recall of flashcard ${
              currentQuizCard + 1
            }.</p>
        </div>
        <div class="question-content">
            <p class="question-text" style="font-size: 1.2rem; margin: 1rem 0; color: var(--gold);">${questionText}</p>
            <div class="test-options">
                ${allAnswers
                  .map(
                    (ans, idx) => `
                    <div class="test-option" onclick="selectQuizAnswer(${idx}, ${correctIndex})">
                        ${ans}
                    </div>
                `
                  )
                  .join("")}
            </div>
            <div id="quiz-result" style="margin-top: 1rem;"></div>
        </div>
    `;
}

function selectQuizAnswer(selectedIndex, correctIndex) {
  const resultDiv = document.getElementById("quiz-result");
  const options = document.querySelectorAll("#quiz-question .test-option");

  options.forEach((opt) => opt.classList.remove("selected"));
  options[selectedIndex].classList.add("selected");

  if (selectedIndex === correctIndex) {
    quizScore++;
    resultDiv.innerHTML = '<div class="test-result correct">✓ Correct!</div>';
  } else {
    resultDiv.innerHTML = `<div class="test-result incorrect">✗ Incorrect. The correct answer is: ${options[correctIndex].textContent}</div>`;
  }

  setTimeout(() => {
    currentQuizCard++;
    showQuizQuestion();
  }, 1500);
}

async function showQuizResults() {
  const questionDiv = document.getElementById("quiz-question");
  const percentage = ((quizScore / quizTotal) * 100).toFixed(0);

  questionDiv.innerHTML = `
        <h3>Quiz Complete!</h3>
        <p style="font-size: 1.5rem; margin: 1rem 0; color: var(--gold);">
            Score: ${quizScore} / ${quizTotal}
        </p>
        <p style="font-size: 1.2rem; margin: 1rem 0;">
            ${percentage}% Correct
        </p>
        <div id="quiz-ai-summary" style="margin: 1.5rem 0; padding: 1rem; background: var(--black-lighter); border-radius: 8px;">
            <p style="color: var(--text-gray);">🤖 Generating AI study recommendations...</p>
        </div>
        <button onclick="startQuiz()" class="btn-primary" style="margin-top: 1rem;">Try Again</button>
        <button onclick="resetQuiz()" class="btn-secondary" style="margin-top: 1rem;">Back to Setup</button>
    `;

  // Generate AI summary of quiz performance
  await generateQuizSummary(quizScore, quizTotal, percentage);
}

// Generate AI summary of quiz performance
async function generateQuizSummary(score, total, percentage) {
  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === "YOUR_GOOGLE_API_KEY_HERE") {
    const summaryDiv = document.getElementById("quiz-ai-summary");
    if (summaryDiv) {
      summaryDiv.innerHTML = `
        <p><strong>Quick Feedback:</strong></p>
        <p>You scored ${score} out of ${total} (${percentage}%). ${
        percentage >= 80
          ? "Excellent work! Keep reviewing to maintain this level."
          : percentage >= 60
          ? "Good effort! Consider reviewing the flashcards you missed."
          : "Keep practicing! Review all flashcards and try again."
      }</p>
      `;
    }
    return;
  }

  try {
    // Initialize AI if needed
    if (!genAI) {
      if (typeof google !== "undefined" && google.generativeai) {
        genAI = new google.generativeai.GenerativeAI(GOOGLE_API_KEY);
        try {
          model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-" });
        } catch (e) {
          try {
            model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          } catch (e2) {
            model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
          }
        }
      } else {
        return;
      }
    }

    const prompt = `A student just completed a flashcard quiz with a score of ${score} out of ${total} (${percentage}%). 

Provide:
1. A brief congratulatory or encouraging message
2. Specific study recommendations based on their performance
3. Tips for improving their score next time
4. Suggestions for which flashcards to focus on

Keep it concise, friendly, and actionable (2-3 short paragraphs).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    const summaryDiv = document.getElementById("quiz-ai-summary");
    if (summaryDiv) {
      summaryDiv.innerHTML = `<strong>📊 AI Study Recommendations:</strong><br><br>${summary.replace(
        /\n/g,
        "<br>"
      )}`;
    }
  } catch (error) {
    console.error("Error generating quiz summary:", error);
    const summaryDiv = document.getElementById("quiz-ai-summary");
    if (summaryDiv) {
      summaryDiv.innerHTML = `<p><strong>Quick Feedback:</strong> You scored ${score}/${total} (${percentage}%). ${
        percentage >= 80
          ? "Excellent work!"
          : percentage >= 60
          ? "Good effort! Keep practicing."
          : "Keep reviewing your flashcards!"
      }</p>`;
    }
  }
}

function resetQuiz() {
  document.getElementById("quiz-setup").style.display = "block";
  document.getElementById("quiz-question").style.display = "none";
  document.getElementById(
    "quiz-status"
  ).textContent = `You have ${flashcards.length} flashcards ready for quiz!`;
}

// Pomodoro Timer
function startPomodoro() {
  if (pomodoroIsRunning) return;

  pomodoroIsRunning = true;
  const focusTime = parseInt(document.getElementById("focus-time").value) * 60;
  const breakTime = parseInt(document.getElementById("break-time").value) * 60;

  pomodoroTime = pomodoroIsBreak ? breakTime : focusTime;

  pomodoroInterval = setInterval(() => {
    pomodoroTime--;
    updatePomodoroDisplay();

    if (pomodoroTime <= 0) {
      clearInterval(pomodoroInterval);
      pomodoroIsRunning = false;
      pomodoroIsBreak = !pomodoroIsBreak;

      if (pomodoroIsBreak) {
        alert("Break time!");
      } else {
        alert("Focus time!");
      }
    }
  }, 1000);
}

function pausePomodoro() {
  clearInterval(pomodoroInterval);
  pomodoroIsRunning = false;
}

function resetPomodoro() {
  clearInterval(pomodoroInterval);
  pomodoroIsRunning = false;
  pomodoroIsBreak = false;
  pomodoroTime = parseInt(document.getElementById("focus-time").value) * 60;
  updatePomodoroDisplay();
}

function updatePomodoroDisplay() {
  const minutes = Math.floor(pomodoroTime / 60);
  const seconds = pomodoroTime % 60;
  const timer = document.getElementById("pomodoro-timer");
  if (timer) {
    timer.textContent = `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }
}

// Load saved data
function loadSavedData() {
  if (notes.length === 0 && flashcards.length === 0) {
    flashcards.push(
      {
        front: "What is JavaScript?",
        back: "A programming language for web development",
      },
      { front: "What is HTML?", back: "HyperText Markup Language" }
    );
    localStorage.setItem("flashcards", JSON.stringify(flashcards));
  }
}

// Export functions for HTML onclick handlers
window.switchPage = switchPage;
window.previousMonth = previousMonth;
window.nextMonth = nextMonth;
window.saveEvent = saveEvent;
window.closeEventModal = closeEventModal;
window.deleteNoteSticky = deleteNoteSticky;
window.saveNoteContent = saveNoteContent;
window.generateTest = generateTest;
window.selectAnswer = selectAnswer;
window.switchTool = switchTool;
window.addFlashcard = addFlashcard;
window.shuffleFlashcards = shuffleFlashcards;
window.startPomodoro = startPomodoro;
window.pausePomodoro = pausePomodoro;
window.resetPomodoro = resetPomodoro;
window.askAI = askAI;
window.changeNoteColor = changeNoteColor;
window.changeNoteFont = changeNoteFont;
window.startQuiz = startQuiz;
window.selectQuizAnswer = selectQuizAnswer;
window.resetQuiz = resetQuiz;
