#!/usr/bin/env python3

import os
import sys
import subprocess
from pathlib import Path
from typing import Tuple, List, Dict, Any

try:
    import rich
    from rich.console import Console
    from rich.panel import Panel
    from rich.text import Text
    from rich.markdown import Markdown
    import questionary
    from questionary import Choice
    import dotenv
except ImportError:
    print("Required packages not found. Please install them using: pip install -r setup-requirements.txt")
    sys.exit(1)

console = Console()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(BASE_DIR, ".env")
ENV_EXAMPLE_FILE = os.path.join(BASE_DIR, ".env.example")

def run_cmd(cmd: str, shell: bool = True) -> Tuple[int, str, str]:
    """Runs a shell command and returns the exit code, stdout, and stderr."""
    process = subprocess.Popen(
        cmd,
        shell=shell,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, stderr = process.communicate()
    return process.returncode, stdout.strip(), stderr.strip()

def check_prerequisites():
    """Checks if Docker and Docker Compose are installed and running."""
    code, out, err = run_cmd("docker info", shell=True)
    if code != 0:
        console.print(Panel("[bold red]Docker is not running or not installed.[/bold red]\nPlease start Docker and try again.", title="Error"))
        sys.exit(1)
        
    code, out, err = run_cmd("docker compose version", shell=True)
    if code != 0:
        console.print(Panel("[bold red]Docker Compose plugin is not installed.[/bold red]\nPlease install it and try again.", title="Error"))
        sys.exit(1)

def get_deployment_state() -> int:
    """
    Returns the current state:
    1: Initial Setup (No .env file)
    2: Configured, but Stopped
    3: Currently Running
    """
    if not os.path.exists(ENV_FILE):
        return 1
        
    code, out, err = run_cmd("docker compose ps --services --filter 'status=running'")
    if code == 0 and out.strip() != "":
        # Some services are running
        return 3
        
    return 2

def display_header():
    subprocess.call("clear" if os.name == "posix" else "cls", shell=True)
    console.print(Panel("[bold blue]Mensabot Setup Wizard[/bold blue]\n[dim]Interactive configuration and deployment manager[/dim]", expand=False))

def load_env_defaults(file_path: str) -> dict:
    """Loads a .env file into a dictionary for easy default lookups."""
    if not os.path.exists(file_path):
        return {}
    return dotenv.dotenv_values(file_path)

def load_env_descriptions(file_path: str) -> dict:
    """Parses a .env file and extracts the preceding comment block for each variable."""
    descriptions = {}
    if not os.path.exists(file_path):
        return descriptions
        
    current_comment = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                current_comment = []
                continue
            if line.startswith("#"):
                cleaned = line.lstrip("# ").strip()
                if cleaned and not cleaned.startswith("======="):
                    current_comment.append(cleaned)
            elif "=" in line:
                key = line.split("=", 1)[0].strip()
                if current_comment:
                    descriptions[key] = " ".join(current_comment)
                current_comment = []
    return descriptions

def load_env_categories(file_path: str) -> List[Dict[str, Any]]:
    """Parses a .env file to dynamically extract categories and their associated keys."""
    categories: List[Dict[str, Any]] = []
    if not os.path.exists(file_path):
        return categories
    
    current_category = None
    current_keys = []
    
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line.startswith("# [CATEGORY]"):
                if current_category and current_keys:
                    categories.append({"name": current_category, "keys": current_keys})
                current_category = line.replace("# [CATEGORY]", "").strip()
                current_keys = []
            elif "=" in line and not line.startswith("#") and "=======" not in line:
                key = line.split("=", 1)[0].strip()
                if current_category:
                    current_keys.append(key)
                    
    if current_category and current_keys:
        categories.append({"name": current_category, "keys": current_keys})
        
    return categories

def save_env_var(key: str, value: str):
    """Saves a variable to .env, preserving comments and structure using python-dotenv."""
    if not os.path.exists(ENV_FILE) and os.path.exists(ENV_EXAMPLE_FILE):
        import shutil
        shutil.copy(ENV_EXAMPLE_FILE, ENV_FILE)
    elif not os.path.exists(ENV_FILE):
        Path(ENV_FILE).touch()
    
    # We must explicitly quote values if they might contain spaces or specials, but python-dotenv handles this mostly.
    dotenv.set_key(ENV_FILE, key, value, quote_mode="always")

def guide_ssl_certificate():
    """Displays instructions on handling Let's Encrypt SSL certificates."""
    console.print(Panel(
        "[bold green]SSL / HTTPS Configuration Guide[/bold green]\n\n"
        "To enable HTTPS, you need to provide SSL certificates. The simplest way is using Let's Encrypt (`certbot`).\n\n"
        "1. Generate your certificates on your server:\n"
        "   [dim]sudo certbot certonly --standalone -d yourdomain.com[/dim]\n\n"
        "2. Copy the resulting certificates to the Mensabot nginx directory:\n"
        "   [dim]cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/certs/[/dim]\n"
        "   [dim]cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/certs/[/dim]\n\n"
        "Mensabot's NGINX is configured to automatically pick up these certificates.",
        expand=False
    ))
    questionary.text("Press Enter to continue...").ask()

def flow_express_setup():
    """Walks the user through mandatory and critical fields only."""
    console.print("\n[bold cyan]Express Setup[/bold cyan]")
    console.print("We will configure the most important settings. Other settings will inherit defaults.")
    
    current_env = load_env_defaults(ENV_FILE)
    example_env = load_env_defaults(ENV_EXAMPLE_FILE)
    example_desc = load_env_descriptions(ENV_EXAMPLE_FILE)
    
    def get_default(key: str, fallback: str = "") -> str:
        return current_env.get(key) or example_env.get(key) or fallback
        
    def prompt_with_desc(key: str, prompt_text: str, default_val: str, hide=False) -> str:
        if key in example_desc:
            console.print(f"\n[dim]{example_desc[key]}[/dim]")
        if hide:
            return questionary.password(prompt_text).ask()
        return questionary.text(prompt_text, default=default_val).ask()

    # LLM Settings
    console.print("\n[bold]1. LLM Settings[/bold]")
    llm_base = prompt_with_desc("API_BACKEND_LLM_BASE_URL", "LLM API Base URL:", get_default("API_BACKEND_LLM_BASE_URL", "https://openrouter.ai/api/v1"))
    if llm_base is None: return
    save_env_var("API_BACKEND_LLM_BASE_URL", llm_base)
    
    llm_model = prompt_with_desc("API_BACKEND_LLM_MODEL", "LLM Model:", get_default("API_BACKEND_LLM_MODEL", "qwen/qwen-2.5-72b-instruct"))
    if llm_model is None: return
    save_env_var("API_BACKEND_LLM_MODEL", llm_model)
    
    llm_key = prompt_with_desc("API_BACKEND_LLM_API_KEY", "LLM API Key (hidden):", "", hide=True)
    if llm_key is None: return
    if llm_key: # Only save if they typed something, otherwise keep existing
        save_env_var("API_BACKEND_LLM_API_KEY", llm_key)
        
    # Map Settings
    console.print("\n[bold]2. Map Settings[/bold]")
    map_light = prompt_with_desc("VITE_MAPTILER_STYLE_URL_LIGHT", "MapTiler Light Style URL (leave empty to skip):", get_default("VITE_MAPTILER_STYLE_URL_LIGHT"))
    if map_light is None: return
    save_env_var("VITE_MAPTILER_STYLE_URL_LIGHT", map_light)
    
    map_dark = prompt_with_desc("VITE_MAPTILER_STYLE_URL_DARK", "MapTiler Dark Style URL (leave empty to skip):", get_default("VITE_MAPTILER_STYLE_URL_DARK"))
    if map_dark is None: return
    save_env_var("VITE_MAPTILER_STYLE_URL_DARK", map_dark)
    
    # Nginx Auth
    console.print("\n[bold]3. Security[/bold]")
    if "BASIC_AUTH_USER" in example_desc:
        console.print(f"\n[dim]{example_desc['BASIC_AUTH_USER']}[/dim]")
    enable_auth = questionary.confirm("Enable Nginx Basic Auth?", default=bool(get_default("BASIC_AUTH_USER"))).ask()
    if enable_auth:
        user = questionary.text("Username:", default=get_default("BASIC_AUTH_USER", "admin")).ask()
        if user is None: return
        pwd = questionary.password("Password:").ask()
        if pwd is None: return
        save_env_var("BASIC_AUTH_USER", user)
        if pwd: save_env_var("BASIC_AUTH_PASS", pwd)
    else:
        save_env_var("BASIC_AUTH_USER", "")
        save_env_var("BASIC_AUTH_PASS", "")
        
    # STT Settings
    console.print("\n[bold]4. Voice / STT Settings[/bold]")
    if "STT_MODEL" in example_desc:
        console.print(f"\n[dim]{example_desc['STT_MODEL']}[/dim]")
    stt_model = questionary.select(
        "Whisper STT Model Size:",
        choices=["tiny", "base", "small", "medium"],
        default=get_default("STT_MODEL", "small")
    ).ask()
    if stt_model is None: return
    save_env_var("STT_MODEL", stt_model)

def flow_advanced_setup():
    """Walks through categories of settings for deep configuration."""
    console.print("\n[bold cyan]Advanced Setup[/bold cyan]")
    
    current_env = load_env_defaults(ENV_FILE)
    example_env = load_env_defaults(ENV_EXAMPLE_FILE)
    example_desc = load_env_descriptions(ENV_EXAMPLE_FILE)
    
    def get_default(key: str, fallback: str = "") -> str:
        return current_env.get(key) or example_env.get(key) or fallback
        
    categories = load_env_categories(ENV_EXAMPLE_FILE)
    if not categories:
        categories = [
            {"name": "Frontend & Map", "keys": ["VITE_API_BASE_URL", "VITE_MAPTILER_STYLE_URL_LIGHT", "VITE_MAPTILER_STYLE_URL_DARK"]},
            {"name": "API Backend (LLM & Behavior)", "keys": ["API_BACKEND_LLM_BASE_URL", "API_BACKEND_LLM_MODEL", "API_BACKEND_LLM_API_KEY", "API_BACKEND_MAX_LLM_ITERATIONS", "API_BACKEND_LOG_LEVEL", "API_BACKEND_ENABLE_DEBUG_ENDPOINTS"]},
            {"name": "Voice STT Service", "keys": ["STT_MODEL", "STT_LANGUAGE", "STT_AUTO_DOWNLOAD_MODEL", "STT_THREADS"]},
            {"name": "MCP Server (OpenMensa / Overpass)", "keys": ["MENSA_MCP_OPENMENSA_BASE_URL", "MENSA_MCP_OVERPASS_URL", "MENSA_MCP_TIMEZONE"]},
            {"name": "Security (Basic Auth)", "keys": ["BASIC_AUTH_USER", "BASIC_AUTH_PASS"]}
        ]
    
    for cat in categories:
        if questionary.confirm(f"Configure '{cat['name']}'?", default=True).ask():
            console.print(f"\n[bold]{cat['name']}[/bold]")
            for key in cat["keys"]:
                key_str = str(key)
                if key_str in example_desc:
                    console.print(f"\n[dim]{example_desc[key_str]}[/dim]")
                if "API_KEY" in key_str or "PASS" in key_str:
                    val = questionary.password(f"{key_str} (hidden):").ask()
                    if val: save_env_var(key_str, val)
                elif "ENABLE" in key_str or "AUTO" in key_str:
                    current_bool = str(get_default(key_str)).lower() == "true"
                    val = questionary.confirm(f"{key_str}?", default=current_bool).ask()
                    if val is not None: save_env_var(key_str, "true" if val else "false")
                else:
                    val = questionary.text(f"{key_str}:", default=get_default(key_str)).ask()
                    if val is not None: save_env_var(key_str, val)

def action_configure():
    """Runs the interactive .env configuration flow."""
    console.print("\n[yellow]Starting configuration...[/yellow]")
    mode = questionary.select(
        "Select setup mode:",
        choices=[
            Choice("Express Setup (Mandatory fields only)", value="express"),
            Choice("Advanced Setup (Walk through all categories)", value="advanced"),
            Choice("View SSL Certificate Guide", value="ssl"),
            Choice("Cancel", value="cancel")
        ]
    ).ask()
    
    if mode == "express":
        flow_express_setup()
        guide_ssl_certificate()
    elif mode == "advanced":
        flow_advanced_setup()
        guide_ssl_certificate()
    elif mode == "ssl":
        guide_ssl_certificate()
    
    if mode in ["express", "advanced"]:
        console.print("[green]Configuration saved![/green]")

def action_start():
    """Builds and starts the docker compose stack."""
    console.print("\n[bold cyan]Deploying Mensabot[/bold cyan]")
    with console.status("Starting Docker Compose stack (this might take a few minutes)...", spinner="dots"):
        code, out, err = run_cmd("docker compose up -d --build")
    
    if code == 0:
        console.print("[bold green]Mensabot started successfully![/bold green]")
        console.print("It might take a minute for all services to become fully healthy.")
    else:
        console.print("[bold red]Error bringing up the stack:[/bold red]")
        console.print(err)
    questionary.text("Press Enter to continue...").ask()

def action_restart():
    """Stops and restarts the docker compose stack to apply config changes."""
    console.print("\n[bold cyan]Restarting Mensabot[/bold cyan]")
    with console.status("Stopping current stack...", spinner="dots"):
        run_cmd("docker compose down")
    
    with console.status("Starting Docker Compose stack...", spinner="dots"):
        code, out, err = run_cmd("docker compose up -d --build")
        
    if code == 0:
        console.print("[bold green]Mensabot restarted successfully![/bold green]")
    else:
        console.print("[bold red]Error restarting the stack:[/bold red]")
        console.print(err)
    questionary.text("Press Enter to continue...").ask()

def action_update():
    """Fetches updates from git, allows version selection, and pulls code."""
    console.print("\n[bold cyan]Mensabot Update Manager[/bold cyan]")
    
    with console.status("Fetching latest available versions from GitHub...", spinner="dots"):
        run_cmd("git fetch --tags --all")
        code_tags, tags, _ = run_cmd("git tag -l --sort=-v:refname")
        code_branches, branches_raw, _ = run_cmd("git branch -r --sort=-committerdate")
    
    branch_list = []
    if code_branches == 0:
        for b in branches_raw.split("\n"):
            b_clean = b.strip()
            if "->" in b_clean or not b_clean: continue
            if b_clean.startswith("origin/"):
                branch_list.append(b_clean[7:])
            else:
                branch_list.append(b_clean)
                
    tag_list = tags.split("\n") if code_tags == 0 and tags else []
    
    choices = []
    if tag_list and tag_list[0]:
        choices.append(Choice("--- Stable Releases (Tags) ---", value=None, disabled="Section Header"))
        choices.extend([Choice(f"{t}", value=t) for t in tag_list if t])
        
    if branch_list:
        choices.append(Choice("--- Development Branches ---", value=None, disabled="Section Header"))
        choices.extend([Choice(f"{b}", value=b) for b in branch_list if b])
        
    choices.append(Choice("Cancel", value="cancel"))
    
    if len(choices) <= 1:
        console.print("[red]Could not retrieve versions from Git.[/red]")
        questionary.text("Press Enter to continue...").ask()
        return

    selected_ref = questionary.select(
        "Select the version / branch you want to checkout/update to:",
        choices=choices,
        use_indicator=True
    ).ask()
    
    if selected_ref == "cancel" or selected_ref is None:
        return
        
    with console.status(f"Checking out {selected_ref}...", spinner="dots"):
        code, out, err = run_cmd(f"git checkout {selected_ref} && git pull")
        if code != 0:
            run_cmd(f"git checkout {selected_ref}")
            
    console.print(f"[bold green]Successfully switched Mensabot to version: {selected_ref}[/bold green]")
    
    if get_deployment_state() == 3:
        if questionary.confirm("Mensabot is currently running. Do you want to restart it now to apply the update?").ask():
            action_restart()
    else:
        if questionary.confirm("Do you want to start Mensabot now?").ask():
            action_start()

def action_stop():
    """Stops the docker compose stack."""
    console.print("\n[bold cyan]Stopping Mensabot[/bold cyan]")
    with console.status("Stopping current stack...", spinner="dots"):
        code, out, err = run_cmd("docker compose down")
        
    if code == 0:
        console.print("[bold green]Mensabot stopped successfully.[/bold green]")
    else:
        console.print("[bold red]Error stopping the stack:[/bold red]")
        console.print(err)
    questionary.text("Press Enter to continue...").ask()

def main_menu():
    while True:
        display_header()
        state = get_deployment_state()
        
        choices = []
        
        if state == 1:
            console.print("[yellow]State: Initial Setup (Not Configured)[/yellow]\n")
            choices = [
                Choice("Initial Configuration", value="config"),
                Choice("Start / Deploy Mensabot (Disabled - Requires Configuration)", value=None, disabled="Requires Configuration"),
                Choice("Restart Mensabot (Disabled - Not Running)", value=None, disabled="Not Running"),
                Choice("Update Mensabot Version (Disabled - Requires Configuration)", value=None, disabled="Requires Configuration"),
                Choice("Stop Mensabot (Disabled - Not Running)", value=None, disabled="Not Running"),
                Choice("Exit", value="exit")
            ]
        elif state == 2:
            console.print("[green]State: Configured, Stopped[/green]\n")
            choices = [
                Choice("Start / Deploy Mensabot", value="start"),
                Choice("Reconfigure Settings", value="config"),
                Choice("Restart Mensabot (Disabled - Not Running)", value=None, disabled="Not Running"),
                Choice("Update Mensabot Version", value="update"),
                Choice("Stop Mensabot (Disabled - Not Running)", value=None, disabled="Not Running"),
                Choice("Exit", value="exit")
            ]
        elif state == 3:
            console.print("[bold green]State: Running[/bold green]\n")
            choices = [
                Choice("Start / Deploy Mensabot (Disabled - Already Running)", value=None, disabled="Already Running"),
                Choice("Reconfigure Settings (Requires restart to apply)", value="config"),
                Choice("Restart Mensabot", value="restart"),
                Choice("Update Mensabot Version", value="update"),
                Choice("Stop Mensabot", value="stop"),
                Choice("Exit", value="exit")
            ]
            
        action = questionary.select(
            "Select an action:",
            choices=choices,
            use_indicator=True,
        ).ask()
        
        if action == "config":
            action_configure()
        elif action == "start":
            action_start()
        elif action == "restart":
            action_restart()
        elif action == "update":
            action_update()
        elif action == "stop":
            action_stop()
        elif action == "exit" or action is None:
            console.print("[green]Exiting...[/green]")
            sys.exit(0)

if __name__ == "__main__":
    check_prerequisites()
    main_menu()
