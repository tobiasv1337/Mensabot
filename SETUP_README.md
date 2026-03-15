# Mensabot Setup Wizard

The Mensabot Setup Wizard is a powerful, interactive command-line tool designed to make deploying, configuring, and updating Mensabot as easy as possible. It runs natively on Linux (optimized for Debian/Ubuntu) and handles everything from installing dependencies to managing Docker Compose stacks.

## Quick Start

To install and launch the Setup Wizard on a fresh Linux VM, run this single command:

```bash
curl -sSL https://raw.githubusercontent.com/tobiasv1337/Mensabot/main/install.sh | bash
```

This script will automatically:
1. Check for and install required system packages (like `git`, `python3`, `docker`).
2. Clone the Mensabot repository.
3. Set up a dedicated Python virtual environment for the interactive UI.
4. Launch the Setup Wizard (`setup.py`).

---

## Configuration Modes

The wizard uses your `.env.example` file to intelligently determine default settings. When you select **Configure Settings** from the main menu, you have two options:

### Express Setup
This is the fastest way to get Mensabot running. It will only prompt you for the absolutely mandatory and most common settings:
* **LLM API Provider & Key**: (e.g., OpenRouter URL, your API Key, and Model selection).
* **MapTiler Styles**: URLs for the Light and Dark map modes.
* **Basic Authentication**: Option to protect your deployment with Nginx basic authentication (username & password).
* **STT Model**: Choose the size of the Whisper speech-to-text model.

*All other settings will silently inherit safe default values from your `.env.example` file.*

### Advanced Setup
This mode allows you to granularly configure every possible Mensabot parameter. It walks you through logical categories:
* **Frontend & Map**: Base URLs and map styles.
* **API Backend**: Detailed LLM settings like `MAX_LLM_ITERATIONS`, Log Levels, and Debug flags.
* **Voice STT Service**: Threads, Language detection overrides, and download behavior.
* **MCP Server**: Internal openmensa endpoints and cache behavior.

---

## Deploying and Updating

The wizard is state-aware. When you launch it, it will detect if Mensabot is currently running, stopped, or unconfigured, and present a dynamic set of actions.

### Start / Restart
Easily build the Docker Compose stack and bring the services online. The tool will show a clean loading spinner while Docker does the heavy lifting. If you change your `.env` configuration, use the **Restart** option to apply the updates.

### Update Mensabot Version
Tired of manually running `.git` commands? The Update Manager fetches all available versions directly from GitHub and provides an interactive, scrollable list:
* **Stable Releases (Tags)**
* **Development Branches**

Select the version you want, and the wizard will securely check it out, pull the latest code, and immediately prompt you to rebuild and start the stack.

---

## SSL / HTTPS Guide

To serve Mensabot over a secure `https://` connection, the wizard provides an integrated guide for Let's Encrypt (`certbot`).

Mensabot's included Nginx reverse proxy expects its TLS files at `nginx/certs/selfsigned.crt` and `nginx/certs/selfsigned.key`. If those files are missing, the setup wizard automatically runs [`setup/create-dev-cert.sh`](setup/create-dev-cert.sh) before `docker compose up` so the nginx image can be built. To use a real certificate instead, replace those two files with your `fullchain.pem` and `privkey.pem` contents. See the **View SSL Certificate Guide** option in the Configuration menu for precise, step-by-step shell commands.
