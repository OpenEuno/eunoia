# WhatsApp AI Coaching Bot

## Overview
This is a WhatsApp bot powered by Google's Gemini AI that provides AI-based coaching and mentoring through WhatsApp conversations. The bot features a complex personality system called "Eunoia" - a wise, casual mentor with deep knowledge across various domains.

## Current State
- **Status**: Fully functional WhatsApp bot with advanced AI integration
- **Last Updated**: October 25, 2025 - Emoji filtering enhancement
- **Dependencies**: Node.js, WhatsApp Web.js, Google Generative AI, emoji-regex, Express

## Project Architecture

### Core Components
1. **index.js** - Main bot logic with WhatsApp client integration
   - User management (registration, expiry, quota)
   - Owner commands (/add, /cek)
   - Message handling and AI response generation
   
2. **eunoia-personality.js** - Complex AI personality configuration
   - Defines Eunoia's identity, values, and communication style
   - Casual Indonesian/English mixed language
   - Human-like traits and response strategies
   
3. **memory.js** - Conversation memory system
   - Stores chat history per user
   - Unlimited conversation history
   - JSON-based storage in ./memory/ directory

### Data Storage
- **users.json** - User database with subscription info
- **memory/** - Individual user conversation histories

### Key Features
- Paid subscription system with expiry dates
- Quota management for users
- Conversation memory for context-aware responses
- Smart message chunking for natural responses
- Owner commands for user management
- QR code authentication for WhatsApp

## Environment Variables
- **GEMINI_API_KEY** - Google Gemini API key (required)

## User Preferences
None specified yet.

## Recent Changes
- **2025-10-25**: Initial setup in Replit environment
  - Removed hardcoded API key for security
  - Added proper .gitignore for Node.js and WhatsApp session data
  - Created project documentation
  - Configured workflow for bot execution
  - Installed system dependencies (chromium, glib, nss, atk, cups, gtk3, etc.)
  - Configured Puppeteer to use system Chromium

- **2025-10-25**: Feature enhancements and personality refinement
  - Added Express web server for keep-alive and monitoring (port 3000)
  - Added WhatsApp mention/tag detection with getMentions()
  - Added sticker detection (msg.type === 'sticker')
  - Added photo/media detection capability (hasMedia && type === 'image')
  - Removed all asterisk (*) symbols from responses (with regex cleaning)
  - Updated personality to be less emotional (logical 85%, emotional 5%)
  - Reduced excessive talking and "ngalor-ngidul" behavior
  - **Deterministic emoji enforcement**: Hard limit max 1 emoji per response, only allowed: 😂😎👌🤦🤷
    - Uses `emoji-regex` npm library for robust emoji detection
    - Handles all edge cases: skin-tone modifiers (🤦🏻), ZWJ sequences (🤦🏻‍♂️), multi-code-point clusters
    - Removes ALL emoji, then adds back max 1 allowed emoji at the end
  - **Smart chunking**: No chunking for responses ≤2 sentences or <100 chars
  - Reduced maxOutputTokens from 200 to 100 for concise responses
  - Lowered temperature from 0.7 to 0.6 for focused responses
  - CleanResponse saved to memory instead of raw response for consistency

## How It Works
1. Bot connects to WhatsApp using whatsapp-web.js (requires QR scan)
2. Users send messages to the WhatsApp number
3. Bot checks user subscription status and quota
4. Sends message to Gemini AI with Eunoia personality prompt
5. AI response is chunked and sent back naturally with typing indicators
6. Conversation history is saved for context

## Owner Number
6282229301962 - Has special access to admin commands
