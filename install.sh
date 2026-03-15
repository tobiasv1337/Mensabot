#!/usr/bin/env bash

# Mensabot Bootstrap Setup Script
# This orchestrates the dependencies and launches the interactive python setup wizard.

set -e

REPO_URL="https://github.com/tobiasv1337/Mensabot.git"
CLONE_DIR="Mensabot"
BRANCH="feat/devops/further-streamline-deployment"
PRIMARY_USER="${SUDO_USER:-$(id -un)}"

# Function to print informational messages
info() {
    echo -e "\033[1;36m[i]\033[0m $1"
}

success() {
    echo -e "\033[1;32m[✓]\033[0m $1"
}

error() {
    echo -e "\033[1;31m[x]\033[0m $1"
    exit 1
}

run_privileged() {
    if [ "$EUID" -ne 0 ]; then
        if command -v sudo &> /dev/null; then
            sudo "$@"
        else
            error "sudo is required to install dependencies and configure Docker."
        fi
    else
        "$@"
    fi
}

# Verify base dependencies exist or attempt to install them via apt
info "Checking system requirements..."

if ! command -v apt-get &> /dev/null; then
    info "Warning: This automated script is optimized for Debian/Ubuntu (apt)."
    info "It appears you are running a different operating system."
    read -p "Do you want to continue anyway? Ensure git, python3, python3-venv, and docker are installed manually. (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Setup aborted by user."
    fi
else
    # Check if we need to install on debian systems
    deps_to_install=""
    for cmd in curl git python3 python3-venv; do
        if ! command -v $cmd &> /dev/null; then
            deps_to_install="$deps_to_install $cmd"
        fi
    done
    
    if [ -n "$deps_to_install" ]; then
        info "Installing missing dependencies:$deps_to_install"
        run_privileged apt-get update
        run_privileged apt-get install -y $deps_to_install
    fi
fi

# Install Docker if missing
if ! command -v docker &> /dev/null; then
    info "Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    run_privileged sh get-docker.sh
    rm get-docker.sh
    success "Docker installed successfully."
else
    success "Docker is already installed."
fi

# Clone the Mensabot repository or update it if it already exists
info "Preparing Mensabot repository..."
if [ -d "$CLONE_DIR/.git" ]; then
    info "Directory $CLONE_DIR already exists. Updating branch $BRANCH..."
    cd "$CLONE_DIR"
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
elif [ -d "$CLONE_DIR" ]; then
    error "Directory $CLONE_DIR exists but is not a git repository. Please remove it or rename it."
else
    info "Cloning Mensabot repository..."
    git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$CLONE_DIR"
    cd "$CLONE_DIR"
fi

[ -f setup/requirements.txt ] || error "Expected file setup/requirements.txt not found. Wrong branch or repository layout?"
[ -f setup/setup.py ] || error "Expected file setup/setup.py not found."

success "Repository ready."

# Create a dedicated python virtual environment for the setup tools
info "Setting up Python environment for the Setup Wizard..."
VENV_DIR=".setup-venv"
SETUP_PYTHON="$PWD/$VENV_DIR/bin/python"

if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi

"$SETUP_PYTHON" -m pip install --upgrade pip -q
"$SETUP_PYTHON" -m pip install -r setup/requirements.txt -q

success "Python environment ready."

launch_setup_wizard() {
    if [ -t 0 ] && [ -t 1 ]; then
        exec "$SETUP_PYTHON" setup/setup.py
    fi

    if [ -t 1 ] && [ -r /dev/tty ]; then
        info "Reconnecting the Setup Wizard to your terminal..."
        exec "$SETUP_PYTHON" setup/setup.py < /dev/tty
    fi

    error "No interactive terminal is available for the Setup Wizard. Run the installer from a terminal session and try again."
}

# Launch the interactive setup wizard
info "Launching Mensabot Setup Wizard..."
if ! docker info &> /dev/null; then
    info "Ensuring Docker service is running..."
    if command -v systemctl &> /dev/null; then
        run_privileged systemctl enable --now docker &> /dev/null || true
    fi

    if ! docker info &> /dev/null && command -v service &> /dev/null; then
        run_privileged service docker start &> /dev/null || true
    fi

    if ! id -nG "$PRIMARY_USER" 2>/dev/null | grep -qw docker; then
        info "Granting $PRIMARY_USER access to the Docker socket..."
        run_privileged usermod -aG docker "$PRIMARY_USER"
    fi
fi

if docker info &> /dev/null; then
    launch_setup_wizard
fi

if run_privileged docker info &> /dev/null && command -v sg &> /dev/null; then
    info "Refreshing docker group membership for this run..."
    if [ -t 1 ] && [ -r /dev/tty ]; then
        exec sg docker -c "cd \"$PWD\" && \"$SETUP_PYTHON\" setup/setup.py < /dev/tty"
    fi

    exec sg docker -c "cd \"$PWD\" && \"$SETUP_PYTHON\" setup/setup.py"
fi

error "Docker is installed, but this shell cannot access it yet. Open a new shell or run 'newgrp docker' and rerun the installer."
