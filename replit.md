# Overview

REBEL AI is a web-based command-line manager that provides a secure interface for executing system commands through a Flask web application. The system combines command execution capabilities with OpenAI-powered error analysis and implements security measures to prevent dangerous operations. It features a terminal-style web interface, intelligent command optimization, and comprehensive logging functionality.

**Latest Update (September 14, 2025)**: Complete implementation with enhanced security, command optimization, and AI-powered error analysis. All security vulnerabilities addressed and production-ready for Replit deployment.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend uses a single-page web application built with HTML, CSS, and JavaScript. It features a terminal-inspired dark theme with green text on black background, mimicking classic command-line interfaces. The interface allows users to input commands and displays results in real-time.

## Backend Architecture
The backend is built with Flask, a lightweight Python web framework. The application follows a simple request-response pattern where commands are received via HTTP requests, processed securely, and results are returned as JSON responses.

**Key Security Features:**
- Token-based authentication using `REBEL_AUTH_TOKEN` environment variable
- Command allowlist system with 23 approved safe commands (ls, pwd, whoami, etc.)
- Explicit blocklist for dangerous operations (rm, sudo, chmod, etc.)
- Command validation before execution

**Command Processing:**
- Commands are parsed using `shlex` for secure shell command parsing
- Subprocess execution with timeout and security constraints
- Real-time output capture and error handling

## Logging System
All operations are logged to `rebel_log.txt` with timestamps, including:
- Command executions and their outputs
- Security violations and blocked commands
- Authentication attempts
- System startup events

## Error Analysis Integration
The system integrates with OpenAI's API for intelligent error analysis and solution suggestions when commands fail. This requires the `OPENAI_API_KEY` environment variable to be configured.

# External Dependencies

## Required Environment Variables
- `REBEL_AUTH_TOKEN`: Security token for authentication (required)
- `OPENAI_API_KEY`: OpenAI API key for error analysis (optional)

## Python Dependencies
- **Flask**: Web framework for HTTP server and routing
- **OpenAI**: Client library for OpenAI API integration
- **subprocess**: Built-in module for command execution
- **shlex**: Built-in module for secure command parsing

## System Dependencies
The application is designed to run in Linux environments (specifically tested on Replit) and relies on standard Unix/Linux command-line utilities for the allowed command set.