
# 🖱️ Mini-Cursor — AI-Powered Command Line Assistant

Mini-Cursor is an intelligent terminal assistant powered by LLMs (like DeepSeek via Nebius API). It mimics natural human thinking to perform tasks such as executing shell commands, managing files, retrieving weather info, and more — step-by-step with reasoning!

---

## 🚀 Features

- 🤖 Natural language query handling
- 🔧 Executes system commands cross-platform
- 📁 File and directory operations
- ☁️ Weather info lookup (mocked)
- 🔁 Follows a structured AI reasoning loop (`THINK > ACTION > OBSERVE > OUTPUT`)
- 💬 JSON-based response format for AI reasoning
- 🧠 Uses Nebius LLM API (DeepSeek model)

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/1mansri/mini-cursor.git
cd mini-cursor
````

### 2. Install Dependencies

Make sure you have [`pnpm`](https://pnpm.io/) installed (or use npm/yarn if preferred):

```bash
pnpm install
```

### 3. Add Environment Variables

Create a `.env` file in the root directory and add your Nebius API key:

```
NEBIUS_API_KEY='your-nebius-api-key'
```

> 🔑 You can get your API key from [Nebius AI Studio](https://studio.nebius.com/)).

---

## 🧠 How It Works

Mini-Cursor uses an AI prompt system that follows a deterministic step-by-step workflow:

### 🧩 Prompt Structure

The assistant always works in phases:

* `START`: User enters a query
* `THINK`: AI reasons the steps needed
* `ACTION`: AI selects a tool (`executeCommand`, `getWeatherInfo`)
* `OBSERVE`: AI processes the tool’s output
* `OUTPUT`: Final answer to user

### 🔧 Available Tools

| Tool                              | Description                        |
| --------------------------------- | ---------------------------------- |
| `executeCommand(command: string)` | Runs shell commands cross-platform |
| `getWeatherInfo(city: string)`    | Returns mock weather for a city    |

---

## 🧪 Usage

Run the assistant using:

```bash
pnpm dev
```

You’ll see a prompt like:

```text
🤖 AI Assistant Started
Type your query and press Enter. Type "exit" to quit.

👤 You:
```

Now, ask anything like:

```text
Create a folder called "MyProject" and inside it, create an index.html file with Hello World content.
```

The AI will break it down into steps and perform actions using tools.

---

## 🧰 Command Syntax Guide

### ✅ Supported Commands

* 📂 **Create Directory**:
  `mkdir "MyFolder"`

* 📄 **Create File with Content**:
  `createFile "path/to/file.txt" "This is the content"`

* ✍️ **Echo Content to File**:
  `echo "Hello" > "hello.txt"`

* 📁 **List Files**:
  `ls` (or `dir` on Windows)

* 📍 **Navigate Folders**:
  `cd "MyFolder"`

* 📌 **Current Directory**:
  `pwd`

### 🛡 Special Notes

* Always use **double quotes** around file paths and content.
* Use **escaped characters** in content like:

  * `\\n` → newline
  * `\\"` → escaped quotes

---

## 🛠 Tech Stack

* Node.js (ESM)
* OpenAI SDK
* Nebius AI API
* dotenv
* readline CLI interface

---

## 📁 Project Structure

```
mini-cursor/
│
├── index.js           # Main program logic
├── .env               # Environment variables (API key)
├── package.json       # Project metadata & scripts
└── README.md          # You're here!
```

---

## 🧩 Example Query

> 👤 You: Build a TODO app folder and generate an `index.html` file inside it with basic HTML structure.

### Expected Tool Actions:

```json
{
  "step": "action",
  "tool": "executeCommand",
  "input": "mkdir \"TODO App\""
}
```

```json
{
  "step": "action",
  "tool": "executeCommand",
  "input": "createFile \"TODO App/index.html\" \"<!DOCTYPE html>\\n<html>...\""
}
```

---

## 🧯 Error Handling

* If a command fails, it will show clear error messages.
* Timeout for each shell command is **30 seconds**.
* Windows shell limitations are handled (e.g., no piping `|` or redirection `>` in raw shell).

---

## 🧪 Future Improvements

* Real weather API integration
* Support for more command tools (Git, Curl, etc.)
* GUI frontend
* Command history saving
* Better natural language understanding

---

