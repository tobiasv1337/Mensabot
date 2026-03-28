#!/usr/bin/env bash

# Mensabot Bootstrap Setup Script
# This orchestrates the dependencies and launches the interactive python setup wizard.

set -e

REPO_URL="https://github.com/tobiasv1337/Mensabot.git"
CLONE_DIR="Mensabot"
DEFAULT_REF="main"
SELECTED_REF="${MENSABOT_REF:-$DEFAULT_REF}"
SELECTED_REF_TYPE="branch"
PRIMARY_USER="${SUDO_USER:-$(id -un)}"
CURRENT_USER="$(id -un)"

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

prompt_tty() {
    if [ -r /dev/tty ] && [ -w /dev/tty ]; then
        printf "%b" "$1" > /dev/tty
        return 0
    fi
    return 1
}

read_from_tty() {
    local __resultvar="$1"
    local input
    if ! [ -r /dev/tty ]; then
        return 1
    fi
    IFS= read -r input < /dev/tty || return 1
    printf -v "$__resultvar" '%s' "$input"
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

run_as_primary_user() {
    if [ "$EUID" -eq 0 ] && [ "$PRIMARY_USER" != "$CURRENT_USER" ]; then
        if command -v sudo &> /dev/null; then
            sudo -H -u "$PRIMARY_USER" "$@"
        else
            error "sudo is required to switch back to $PRIMARY_USER for user-owned repository files."
        fi
    else
        "$@"
    fi
}

validate_selected_ref() {
    if git ls-remote --exit-code --heads "$REPO_URL" "refs/heads/$SELECTED_REF" &> /dev/null; then
        SELECTED_REF_TYPE="branch"
        return 0
    fi

    if git ls-remote --exit-code --tags --refs "$REPO_URL" "refs/tags/$SELECTED_REF" &> /dev/null; then
        SELECTED_REF_TYPE="tag"
        return 0
    fi

    return 1
}

select_repository_ref() {
    local remote_refs tags_output branches_output selection selection_index ref_name
    local -a tags branches option_refs option_types

    if [ -n "${MENSABOT_REF:-}" ]; then
        validate_selected_ref || error "Requested ref '$SELECTED_REF' from MENSABOT_REF was not found on GitHub."
        info "Using requested Mensabot ref from MENSABOT_REF: $SELECTED_REF"
        return
    fi

    if ! [ -r /dev/tty ] || ! [ -w /dev/tty ]; then
        info "No interactive terminal available for version selection. Using default ref '$SELECTED_REF'."
        return
    fi

    info "Fetching available Mensabot versions..."
    if ! remote_refs="$(git ls-remote --heads --tags --refs "$REPO_URL" 2>/dev/null)"; then
        info "Could not retrieve versions from GitHub. Continuing with default ref '$SELECTED_REF'."
        return
    fi

    while read -r _ ref_name; do
        [ -n "$ref_name" ] || continue
        case "$ref_name" in
            refs/tags/*)
                tags+=("${ref_name#refs/tags/}")
                ;;
            refs/heads/*)
                branches+=("${ref_name#refs/heads/}")
                ;;
        esac
    done <<< "$remote_refs"

    if [ ${#tags[@]} -gt 0 ]; then
        tags_output="$(printf '%s\n' "${tags[@]}" | sort -rV)"
        mapfile -t tags <<< "$tags_output"
    fi

    if [ ${#branches[@]} -gt 0 ]; then
        branches_output="$(printf '%s\n' "${branches[@]}" | sort)"
        mapfile -t branches <<< "$branches_output"
    fi

    prompt_tty "\nSelect the Mensabot version before configuration and deployment.\n"
    prompt_tty "Press Enter to keep the default (${SELECTED_REF}), choose a number, or type a ref name manually.\n\n"

    local i=1
    if [ ${#tags[@]} -gt 0 ]; then
        prompt_tty "Stable releases:\n"
        for ref_name in "${tags[@]}"; do
            prompt_tty "  $i) $ref_name [tag]\n"
            option_refs+=("$ref_name")
            option_types+=("tag")
            i=$((i + 1))
        done
        prompt_tty "\n"
    fi

    if [ ${#branches[@]} -gt 0 ]; then
        prompt_tty "Development branches:\n"
        for ref_name in "${branches[@]}"; do
            prompt_tty "  $i) $ref_name [branch]\n"
            option_refs+=("$ref_name")
            option_types+=("branch")
            i=$((i + 1))
        done
        prompt_tty "\n"
    fi

    while true; do
        prompt_tty "Install ref [${SELECTED_REF}]: "
        read_from_tty selection || break

        if [ -z "$selection" ]; then
            validate_selected_ref || error "Default ref '$SELECTED_REF' was not found on GitHub."
            break
        fi

        if [[ "$selection" =~ ^[0-9]+$ ]]; then
            selection_index=$((selection - 1))
            if [ "$selection_index" -ge 0 ] && [ "$selection_index" -lt "${#option_refs[@]}" ]; then
                SELECTED_REF="${option_refs[$selection_index]}"
                SELECTED_REF_TYPE="${option_types[$selection_index]}"
                break
            fi
        else
            SELECTED_REF="$selection"
            if validate_selected_ref; then
                break
            fi
        fi

        SELECTED_REF="$DEFAULT_REF"
        prompt_tty "Invalid selection. Enter a listed number, a branch name, a tag, or press Enter for '${DEFAULT_REF}'.\n"
    done

    info "Selected Mensabot ref: $SELECTED_REF"
}

checkout_selected_ref() {
    if [ "$SELECTED_REF_TYPE" = "branch" ]; then
        if git show-ref --verify --quiet "refs/heads/$SELECTED_REF"; then
            git checkout "$SELECTED_REF"
        else
            git checkout -b "$SELECTED_REF" --track "origin/$SELECTED_REF"
        fi
        git pull --ff-only origin "$SELECTED_REF"
    else
        git checkout "$SELECTED_REF"
    fi
}

# Verify base dependencies exist or attempt to install them via apt
info "Checking system requirements..."

if ! command -v apt-get &> /dev/null; then
    info "Warning: This automated script is optimized for Debian/Ubuntu (apt)."
    info "It appears you are running a different operating system."
    prompt_tty "Do you want to continue anyway? Ensure git, python3, python3-venv, and docker are installed manually. (y/N) "
    read_from_tty continue_anyway || error "Setup aborted because no interactive terminal was available."
    prompt_tty "\n"
    if [[ ! "$continue_anyway" =~ ^[Yy]$ ]]; then
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

select_repository_ref

# Clone the Mensabot repository or update it if it already exists
info "Preparing Mensabot repository..."
if [ -d "$CLONE_DIR/.git" ]; then
    info "Directory $CLONE_DIR already exists. Updating ref $SELECTED_REF..."
    cd "$CLONE_DIR"
    git fetch origin "+refs/heads/*:refs/remotes/origin/*" --tags --prune
    checkout_selected_ref
elif [ -d "$CLONE_DIR" ]; then
    error "Directory $CLONE_DIR exists but is not a git repository. Please remove it or rename it."
else
    info "Cloning Mensabot repository at ref $SELECTED_REF..."
    git clone --branch "$SELECTED_REF" --single-branch "$REPO_URL" "$CLONE_DIR"
    cd "$CLONE_DIR"
fi

if [ "$EUID" -eq 0 ] && [ "$PRIMARY_USER" != "$CURRENT_USER" ]; then
    info "Ensuring repository files are owned by $PRIMARY_USER..."
    chown -R "$PRIMARY_USER":"$PRIMARY_USER" "$PWD"
fi

[ -f setup/requirements.txt ] || error "Expected file setup/requirements.txt not found. Wrong branch or repository layout?"
[ -f setup/setup.py ] || error "Expected file setup/setup.py not found."

success "Repository ready."

# Create a dedicated python virtual environment for the setup tools
info "Setting up Python environment for the Setup Wizard..."
VENV_DIR=".setup-venv"
SETUP_PYTHON="$PWD/$VENV_DIR/bin/python"

if [ ! -d "$VENV_DIR" ]; then
    run_as_primary_user python3 -m venv "$VENV_DIR"
fi

run_as_primary_user "$SETUP_PYTHON" -m pip install --upgrade pip -q
run_as_primary_user "$SETUP_PYTHON" -m pip install -r setup/requirements.txt -q

success "Python environment ready."

launch_setup_wizard() {
    if [ -t 0 ] && [ -t 1 ]; then
        run_as_primary_user "$SETUP_PYTHON" setup/setup.py
        exit $?
    fi

    if [ -t 1 ] && [ -r /dev/tty ]; then
        info "Reconnecting the Setup Wizard to your terminal..."
        run_as_primary_user "$SETUP_PYTHON" setup/setup.py < /dev/tty
        exit $?
    fi

    error "No interactive terminal is available for the Setup Wizard. Run the installer from a terminal session and try again."
}

launch_setup_wizard_with_docker_group() {
    if [ -t 1 ] && [ -r /dev/tty ]; then
        run_as_primary_user sg docker -c "cd \"$PWD\" && \"$SETUP_PYTHON\" setup/setup.py < /dev/tty"
        exit $?
    fi

    run_as_primary_user sg docker -c "cd \"$PWD\" && \"$SETUP_PYTHON\" setup/setup.py"
    exit $?
}

# Launch the interactive setup wizard
info "Launching Mensabot Setup Wizard..."
if ! run_privileged docker info &> /dev/null; then
    info "Ensuring Docker service is running..."
    if command -v systemctl &> /dev/null; then
        run_privileged systemctl enable --now docker &> /dev/null || true
    fi

    if ! run_privileged docker info &> /dev/null && command -v service &> /dev/null; then
        run_privileged service docker start &> /dev/null || true
    fi

fi

if ! run_as_primary_user docker info &> /dev/null && ! id -nG "$PRIMARY_USER" 2>/dev/null | grep -qw docker; then
    info "Granting $PRIMARY_USER access to the Docker socket..."
    run_privileged usermod -aG docker "$PRIMARY_USER"
fi

if run_as_primary_user docker info &> /dev/null; then
    launch_setup_wizard
fi

if run_privileged docker info &> /dev/null && command -v sg &> /dev/null && id -nG "$PRIMARY_USER" 2>/dev/null | grep -qw docker; then
    info "Refreshing docker group membership for this run..."
    launch_setup_wizard_with_docker_group
fi

error "Docker is installed, but this shell cannot access it yet. Open a new shell or run 'newgrp docker' and rerun the installer."
