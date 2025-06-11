import { OpenAI } from "openai";
import { configDotenv } from "dotenv";
import { exec, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

configDotenv();

const client = new OpenAI({
    baseURL: 'https://api.studio.nebius.com/v1/',
    apiKey: process.env.NEBIUS_API_KEY,
});

// Detect platform for cross-platform compatibility
const isWindows = os.platform() === 'win32';

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        console.log(`🔧 Executing: ${command}`);
        
        // Handle special commands that create files with content
        const createFileMatch = command.match(/^createFile\s+"([^"]+)"\s+"([\s\S]*)"$/i);
        if (createFileMatch) {
            const filePath = createFileMatch[1];
            const content = createFileMatch[2]
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'")
                .replace(/\\t/g, '\t');
            
            try {
                // Ensure directory exists
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                fs.writeFileSync(filePath, content, 'utf8');
                resolve(`stdout: File created successfully: ${filePath}\nstderr:`);
            } catch (err) {
                reject(new Error(`Failed to create file: ${err.message}`));
            }
            return;
        }

        // Enhanced file creation handling with better regex patterns
        const fileCreationPatterns = [
            /^(?:echo|cat)\s+"([^"]*?)"\s*>\s*"([^"]+)"$/i,
            /^(?:echo|cat)\s+'([^']*?)'\s*>\s*'([^']+)'$/i,
            /^(?:echo|cat)\s+"([^"]*?)"\s*>\s*([^\s]+)$/i,
            /^(?:echo|cat)\s+'([^']*?)'\s*>\s*([^\s]+)$/i,
            /^(?:echo|cat)\s+([^>]+?)\s*>\s*"([^"]+)"$/i,
            /^(?:echo|cat)\s+([^>]+?)\s*>\s*([^\s]+)$/i
        ];

        let fileCreationMatch = null;
        for (const pattern of fileCreationPatterns) {
            fileCreationMatch = command.match(pattern);
            if (fileCreationMatch) break;
        }
        
        if (fileCreationMatch) {
            const content = fileCreationMatch[1].trim();
            const filePath = fileCreationMatch[2].trim();
            
            try {
                // Ensure directory exists
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                // Clean up content
                const processedContent = content
                    .replace(/^["']|["']$/g, '') // Remove outer quotes
                    .replace(/\\n/g, '\n')
                    .replace(/\\"/g, '"')
                    .replace(/\\'/g, "'")
                    .replace(/\\t/g, '\t');
                
                fs.writeFileSync(filePath, processedContent, 'utf8');
                resolve(`stdout: File created successfully: ${filePath}\nstderr:`);
            } catch (err) {
                reject(new Error(`Failed to create file: ${err.message}`));
            }
            return;
        }

        // Handle directory creation
        const mkdirPatterns = [
            /^mkdir\s+"([^"]+)"$/i,
            /^mkdir\s+'([^']+)'$/i,
            /^mkdir\s+([^\s]+)$/i
        ];

        let mkdirMatch = null;
        for (const pattern of mkdirPatterns) {
            mkdirMatch = command.match(pattern);
            if (mkdirMatch) break;
        }

        if (mkdirMatch) {
            const dirPath = mkdirMatch[1].trim();
            try {
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                    resolve(`stdout: Directory created: ${dirPath}\nstderr:`);
                } else {
                    resolve(`stdout: Directory already exists: ${dirPath}\nstderr:`);
                }
            } catch (err) {
                reject(new Error(`Failed to create directory: ${err.message}`));
            }
            return;
        }

        // Handle list commands
        if (command.match(/^ls$/i) || command.match(/^dir$/i)) {
            try {
                const files = fs.readdirSync('.').join('\n');
                resolve(`stdout: ${files}\nstderr:`);
            } catch (err) {
                reject(new Error(`Failed to list directory: ${err.message}`));
            }
            return;
        }

        // Handle pwd/cd commands
        if (command.match(/^pwd$/i)) {
            resolve(`stdout: ${process.cwd()}\nstderr:`);
            return;
        }

        // Handle simple navigation
        const cdMatch = command.match(/^cd\s+"?([^"]*)"?$/i);
        if (cdMatch) {
            const targetDir = cdMatch[1].trim();
            try {
                if (fs.existsSync(targetDir)) {
                    process.chdir(targetDir);
                    resolve(`stdout: Changed directory to: ${process.cwd()}\nstderr:`);
                } else {
                    reject(new Error(`Directory not found: ${targetDir}`));
                }
            } catch (err) {
                reject(new Error(`Failed to change directory: ${err.message}`));
            }
            return;
        }

        // For other commands, try to execute them normally
        // But avoid complex shell operations on Windows
        if (isWindows && (command.includes('|') || command.includes('&') || command.includes('>'))) {
            reject(new Error(`Complex shell operations not supported on Windows. Use direct file operations instead.`));
            return;
        }

        // Execute regular commands
        const shell = isWindows ? 'cmd.exe' : '/bin/bash';
        const shellFlag = isWindows ? '/c' : '-c';
        
        const child = spawn(shell, [shellFlag, command], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            cwd: process.cwd()
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(`stdout: ${stdout}\nstderr: ${stderr}`);
            } else {
                reject(new Error(`Command failed with code ${code}:\nstdout: ${stdout}\nstderr: ${stderr}`));
            }
        });

        child.on('error', (err) => {
            reject(new Error(`Failed to execute command: ${err.message}`));
        });

        // Set timeout to prevent hanging
        setTimeout(() => {
            child.kill();
            reject(new Error('Command timeout'));
        }, 30000);
    });
}

function getWeatherInfo(cityName) {
    return `${cityName} has 25°C with partly cloudy skies`;
}

const TOOL_MAP = {
    getWeatherInfo: getWeatherInfo,
    executeCommand: executeCommand,
};

const SYSTEM_PROMPT = `
You are a helpful AI Assistant designed to resolve user queries through a structured approach.
You work in START, THINK, ACTION, OBSERVE, and OUTPUT phases.

WORKFLOW:
1. START: User provides a query
2. THINK: Analyze the query and plan your approach (repeat 2-4 times as needed)
3. ACTION: Execute tools when necessary with proper parameters
4. OBSERVE: Process tool outputs
5. OUTPUT: Provide final response or repeat the cycle

RULES:
- Always output exactly one step at a time and wait for the next
- Output must be valid JSON format
- Only use available tools
- Think through problems step by step
- Handle errors gracefully
- Be specific and clear in your actions

AVAILABLE TOOLS:
- getWeatherInfo(city: string): Returns weather information for a city
- executeCommand(command: string): Executes cross-platform commands

COMMAND GUIDELINES FOR FILE OPERATIONS:
- For creating directories: mkdir "folder name"
- For creating files with content: createFile "path/filename" "content here"
- For simple file creation: echo "content" > "filename"
- For listing files: ls (Unix) or dir (Windows)
- For navigation: cd "directory"
- For current directory: pwd

SPECIAL COMMANDS:
- createFile "TODO App/index.html" "<!DOCTYPE html>..." - Creates file with full content
- mkdir "TODO App" - Creates directory
- ls - Lists current directory contents

IMPORTANT NOTES:
- Use createFile command for complex HTML/CSS/JS content
- Always use double quotes around file paths and content
- For multi-line content, use \\n for line breaks
- Escape quotes in content with \\"
- Commands are executed in current working directory

OUTPUT FORMAT:
- Each response must be valid JSON with one of these structures:
  {"step": "think", "content": "your reasoning"}
  {"step": "action", "tool": "executeCommand", "input": "command here"}
  {"step": "observe", "content": "tool output analysis"}
  {"step": "output", "content": "final response to user"}

EXAMPLE FOR FILE CREATION:
{"step": "action", "tool": "executeCommand", "input": "createFile \\"app.js\\" \\"function hello() {\\n  console.log('Hello World');\\n}\\""}
`;

async function init() {
    console.log('🤖 AI Assistant Started');
    console.log('Type your query and press Enter. Type "exit" to quit.\n');

    const readline = await import('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = (question) => {
        return new Promise((resolve) => {
            rl.question(question, resolve);
        });
    };

    while (true) {
        try {
            const userQuery = await askQuestion('👤 You: ');
            
            if (userQuery.toLowerCase().trim() === 'exit') {
                console.log('👋 Goodbye!');
                rl.close();
                break;
            }

            if (!userQuery.trim()) {
                console.log('⚠️ Please enter a valid query.\n');
                continue;
            }

            console.log(`\n🚀 Processing: ${userQuery}\n`);

            await processQuery(userQuery);
            
            console.log('\n' + '='.repeat(50) + '\n');

        } catch (error) {
            console.log(`❌ Error: ${error.message}\n`);
        }
    }
}

async function processQuery(userQuery) {
    const messages = [
        {
            role: 'system',
            content: SYSTEM_PROMPT,
        },
    ];
    
    messages.push({ 'role': 'user', 'content': userQuery });
    
    let stepCount = 0;
    const maxSteps = 20; // Prevent infinite loops
    
    while (stepCount < maxSteps) {
        try {
            const response = await client.chat.completions.create({
                "model": "deepseek-ai/DeepSeek-R1-0528",
                "max_tokens": 4000,
                "temperature": 0.3,
                "top_p": 0.9,
                response_format: { type: 'json_object' },
                messages: messages
            });

            const assistantResponse = response.choices[0].message.content;
            messages.push({
                'role': 'assistant', 
                'content': assistantResponse
            });

            let parsed_response;
            try {
                parsed_response = JSON.parse(assistantResponse);
            } catch (parseError) {
                console.log(`❌ JSON Parse Error: ${parseError.message}`);
                console.log(`Raw response: ${assistantResponse}`);
                break;
            }

            stepCount++;

            if (parsed_response.step === 'think') {
                console.log(`🧠 Thinking: ${parsed_response.content}`);
                continue;
            }

            if (parsed_response.step === 'output') {
                console.log(`🤖 Assistant: ${parsed_response.content}`);
                break;
            }

            if (parsed_response.step === 'action') {
                const tool = parsed_response.tool;
                const input = parsed_response.input;

                if (!TOOL_MAP[tool]) {
                    console.log(`❌ Unknown tool: ${tool}`);
                    break;
                }

                try {
                    const result = await TOOL_MAP[tool](input);
                    console.log(`🔨 Tool ${tool}("${input.length > 50 ? input.substring(0, 50) + '...' : input}") executed successfully`);
                    
                    messages.push({
                        'role': "assistant",
                        "content": JSON.stringify({
                            "step": "observe",
                            "content": result
                        })
                    });
                } catch (toolError) {
                    console.log(`❌ Tool execution failed: ${toolError.message}`);
                    
                    messages.push({
                        'role': "assistant",
                        "content": JSON.stringify({
                            "step": "observe",
                            "content": `Error: ${toolError.message}`
                        })
                    });
                }
                continue;
            }

            if (parsed_response.step === 'observe') {
                console.log(`👁️ Observing: ${parsed_response.content}`);
                continue;
            }

            // Unknown step
            console.log(`❓ Unknown step: ${parsed_response.step}`);
            break;

        } catch (error) {
            console.log(`❌ API Error: ${error.message}`);
            break;
        }
    }

    if (stepCount >= maxSteps) {
        console.log(`⚠️ Maximum steps (${maxSteps}) reached. Stopping execution.`);
    }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.log(`💥 Uncaught Exception: ${error.message}`);
    process.exit(1);
});

init().catch(error => {
    console.log(`🚨 Fatal Error: ${error.message}`);
    process.exit(1);
});