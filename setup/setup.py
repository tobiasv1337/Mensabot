#!/usr/bin/env python3

import os
import sys
import subprocess
import ipaddress
from pathlib import Path
from typing import Tuple, List, Dict, Sequence, Optional

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.text import Text
    import questionary
    from questionary import Choice
    import dotenv
except ImportError:
    print("Required setup dependencies are missing. Run `bash install.sh` from the repository root to bootstrap the setup wizard.")
    sys.exit(1)

console = Console()

BASE_DIR = str(Path(__file__).resolve().parent.parent)
ENV_FILE = os.path.join(BASE_DIR, ".env")
ENV_EXAMPLE_FILE = os.path.join(BASE_DIR, ".env.example")
TLS_CERT_FILE = os.path.join(BASE_DIR, "nginx", "certs", "selfsigned.crt")
TLS_KEY_FILE = os.path.join(BASE_DIR, "nginx", "certs", "selfsigned.key")
DEV_CERT_SCRIPT = os.path.join(BASE_DIR, "setup", "create-dev-cert.sh")
TLS_CN_ENV_KEY = "MENSABOT_TLS_CN"
TLS_SANS_ENV_KEY = "MENSABOT_TLS_SANS"
DEFAULT_TLS_SAN_ENTRIES = ["DNS:localhost", "IP:127.0.0.1"]

def run_cmd(cmd: Sequence[str], cwd: str = BASE_DIR, env: Optional[Dict[str, str]] = None) -> Tuple[int, str, str]:
    """Runs a command and returns the exit code, stdout, and stderr."""
    if isinstance(cmd, str):
        raise TypeError("run_cmd expects an argv sequence, not a shell string.")
    process_env = os.environ.copy()
    if env:
        process_env.update(env)
    process = subprocess.Popen(
        list(cmd),
        cwd=cwd,
        env=process_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, stderr = process.communicate()
    return process.returncode, stdout.strip(), stderr.strip()


def run_cmd_live(cmd: Sequence[str], cwd: str = BASE_DIR, env: Optional[Dict[str, str]] = None) -> int:
    """Runs a command attached to the current terminal for live output."""
    if isinstance(cmd, str):
        raise TypeError("run_cmd_live expects an argv sequence, not a shell string.")
    process_env = os.environ.copy()
    if env:
        process_env.update(env)
    process = subprocess.Popen(list(cmd), cwd=cwd, env=process_env)
    return process.wait()

def check_prerequisites():
    """Checks if Docker and Docker Compose are installed and running."""
    code, out, err = run_cmd(["docker", "info"])
    if code != 0:
        console.print(Panel("[bold red]Docker is not running or not installed.[/bold red]\nPlease start Docker and try again.", title="Error"))
        details = "\n".join(part for part in (out, err) if part)
        if details:
            console.print(f"[dim]Docker details:[/dim] {details}")
        sys.exit(1)
        
    code, out, err = run_cmd(["docker", "compose", "version"])
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
        
    code, out, err = run_cmd(["docker", "compose", "ps", "--services", "--filter", "status=running"])
    if code == 0 and out.strip() != "":
        # Some services are running
        return 3
        
    return 2

def display_header():
    subprocess.call("clear" if os.name == "posix" else "cls", shell=True)
    console.print(Panel(
        "[bold blue]Mensabot Setup Wizard[/bold blue]\n"
        "[dim]Interactive configuration, deployment, and update manager[/dim]\n"
        "[dim]Re-run ./install.sh from this repository any time to reopen this menu.[/dim]",
        expand=False
    ))

def load_env_defaults(file_path: str) -> Dict:
    """Loads a .env file into a dictionary for easy default lookups."""
    if not os.path.exists(file_path):
        return {}
    return dotenv.dotenv_values(file_path)

def format_comment_block(comment_lines: List[str]) -> str:
    """Normalizes comment blocks while preserving paragraph breaks."""
    normalized: List[str] = []
    for line in comment_lines:
        if not line.strip():
            if normalized and normalized[-1] != "":
                normalized.append("")
            continue
        normalized.append(line.rstrip())

    while normalized and normalized[0] == "":
        normalized.pop(0)
    while normalized and normalized[-1] == "":
        normalized.pop()

    return "\n".join(normalized)


def load_env_descriptions(file_path: str) -> Dict:
    """Parses a .env file and extracts the preceding comment block for each variable."""
    descriptions = {}
    if not os.path.exists(file_path):
        return descriptions
        
    current_comment = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            raw_line = line.rstrip("\n")
            stripped_line = raw_line.strip()

            if not stripped_line:
                if current_comment:
                    current_comment.append("")
                continue

            if raw_line.lstrip().startswith("#"):
                comment_start = raw_line.index("#") + 1
                cleaned = raw_line[comment_start:]
                if cleaned.startswith(" "):
                    cleaned = cleaned[1:]

                marker = cleaned.strip()
                if not marker:
                    if current_comment:
                        current_comment.append("")
                    continue

                if marker.startswith("=======") or marker.startswith("[CATEGORY]"):
                    continue

                current_comment.append(cleaned.rstrip())
                continue

            if "=" in raw_line:
                key = raw_line.split("=", 1)[0].strip()
                description = format_comment_block(current_comment)
                if description:
                    descriptions[key] = description
                current_comment = []

    return descriptions


def print_description(description: str) -> None:
    """Render a variable description as dim text while preserving newlines."""
    if not description:
        return
    console.print()
    console.print(Text(description, style="dim"))

def load_env_categories(file_path: str) -> List:
    """Parses a .env file to dynamically extract categories and their associated keys."""
    categories: List = []
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

def get_config_default(key: str, current_env: Dict, example_env: Dict) -> str:
    """Safely retrieves a default value, prioritizing existing .env over .env.example."""
    if key in current_env and current_env[key] is not None:
        return current_env[key]
    if key in example_env and example_env[key] is not None:
        return example_env[key]
    return ""


def parse_host_list(value: str) -> List[str]:
    """Parse a comma/newline-separated hostname or IP list."""
    if not value:
        return []

    normalized = value.replace("\n", ",")
    hosts: List[str] = []
    seen = set()

    for part in normalized.split(","):
        host = part.strip()
        if not host or host in seen:
            continue
        seen.add(host)
        hosts.append(host)

    return hosts


def build_tls_sans(hosts: List[str]) -> str:
    """Build the SAN list for the generated development certificate."""
    entries = list(DEFAULT_TLS_SAN_ENTRIES)
    for host in hosts:
        try:
            ipaddress.ip_address(host)
            entry = f"IP:{host}"
        except ValueError:
            entry = f"DNS:{host}"
        if entry not in entries:
            entries.append(entry)
    return ",".join(entries)


def strip_default_tls_sans(san_value: str) -> str:
    """Drop built-in localhost SAN entries before persisting custom SAN config."""
    entries: List[str] = []
    for raw_part in san_value.split(","):
        entry = raw_part.strip()
        if not entry or entry in DEFAULT_TLS_SAN_ENTRIES or entry in entries:
            continue
        entries.append(entry)
    return ",".join(entries)


def configured_tls_san_entries(env_values: Dict) -> List[str]:
    """Return the SAN entries that should be present for the configured TLS hosts."""
    entries = list(DEFAULT_TLS_SAN_ENTRIES)

    cn = (env_values.get(TLS_CN_ENV_KEY) or "").strip()
    if cn:
        try:
            ipaddress.ip_address(cn)
            entry = f"IP:{cn}"
        except ValueError:
            entry = f"DNS:{cn}"
        if entry not in entries:
            entries.append(entry)

    sans = (env_values.get(TLS_SANS_ENV_KEY) or "").strip()
    for raw_part in sans.replace("\n", ",").split(","):
        part = raw_part.strip()
        if not part:
            continue
        if part.startswith("IP:"):
            entry = f"IP:{part.split(':', 1)[1].strip()}"
        elif part.startswith("DNS:"):
            entry = f"DNS:{part.split(':', 1)[1].strip()}"
        else:
            continue
        if entry not in entries:
            entries.append(entry)

    return entries


def current_certificate_san_entries() -> Tuple[int, List[str], str]:
    """Read SAN entries from the current certificate."""
    code, out, err = run_cmd(["openssl", "x509", "-in", TLS_CERT_FILE, "-noout", "-ext", "subjectAltName"])
    if code != 0:
        return code, [], err or out

    entries: List[str] = []
    seen = set()

    for raw_part in out.replace("\n", ",").split(","):
        part = raw_part.strip()
        if part.startswith("DNS:"):
            entry = f"DNS:{part.split(':', 1)[1].strip()}"
        elif part.startswith("IP Address:"):
            entry = f"IP:{part.split(':', 1)[1].strip()}"
        elif part.startswith("IP:"):
            entry = f"IP:{part.split(':', 1)[1].strip()}"
        else:
            continue

        if entry and entry not in seen:
            seen.add(entry)
            entries.append(entry)

    return 0, entries, ""


def certificate_regeneration_reasons() -> List[str]:
    """Return reasons why the current self-signed certificate should be regenerated."""
    if not (os.path.exists(TLS_CERT_FILE) and os.path.exists(TLS_KEY_FILE)):
        return []

    reasons: List[str] = []

    expired_code, _, _ = run_cmd(["openssl", "x509", "-in", TLS_CERT_FILE, "-checkend", "0", "-noout"])
    if expired_code != 0:
        reasons.append("it has expired")

    expected_entries = configured_tls_san_entries(load_env_defaults(ENV_FILE))
    san_code, actual_entries, _ = current_certificate_san_entries()
    if san_code != 0:
        reasons.append("its configured hostnames/IPs could not be checked")
    else:
        missing_entries = [entry for entry in expected_entries if entry not in actual_entries]
        if missing_entries:
            formatted = ", ".join(missing_entries)
            reasons.append(f"it does not contain the configured hostnames/IPs ({formatted})")

    return reasons


def generate_self_signed_certificate() -> Tuple[int, str, str]:
    """Run the development certificate script with the configured TLS host settings."""
    env_values = load_env_defaults(ENV_FILE)
    env = {}
    cn = (env_values.get(TLS_CN_ENV_KEY) or "").strip()
    sans = (env_values.get(TLS_SANS_ENV_KEY) or "").strip()

    if cn:
        env[TLS_CN_ENV_KEY] = cn
    if sans:
        env[TLS_SANS_ENV_KEY] = sans

    return run_cmd(["sh", DEV_CERT_SCRIPT], env=env)


def configure_tls_hosts(current_env: Dict, example_env: Dict) -> None:
    """Ask for optional public HTTPS hostnames/IPs and persist the derived TLS config."""
    current_cn = get_config_default(TLS_CN_ENV_KEY, current_env, example_env).strip()
    current_hosts: List[str] = []

    if current_cn and current_cn != "localhost":
        current_hosts.append(current_cn)

    current_sans = get_config_default(TLS_SANS_ENV_KEY, current_env, example_env).strip()
    for entry in [part.strip() for part in current_sans.split(",") if part.strip()]:
        if entry in DEFAULT_TLS_SAN_ENTRIES:
            continue
        if entry.startswith("DNS:") or entry.startswith("IP:"):
            host = entry.split(":", 1)[1].strip()
            if host and host not in current_hosts:
                current_hosts.append(host)

    console.print()
    console.print(
        "[dim]Optional: If users open Mensabot via a public domain or IP instead of localhost, "
        "enter it here so the self-signed certificate matches.[/dim]"
    )

    default_hosts = ", ".join(current_hosts)
    raw_hosts = questionary.text(
        "Public domain or IP for HTTPS (comma-separated, optional):",
        default=default_hosts,
    ).ask()
    if raw_hosts is None:
        return

    hosts = parse_host_list(raw_hosts)
    if not hosts:
        save_env_var(TLS_CN_ENV_KEY, "")
        save_env_var(TLS_SANS_ENV_KEY, "")
        current_env[TLS_CN_ENV_KEY] = ""
        current_env[TLS_SANS_ENV_KEY] = ""
        return

    primary_host = hosts[0]
    san_value = strip_default_tls_sans(build_tls_sans(hosts))

    save_env_var(TLS_CN_ENV_KEY, primary_host)
    save_env_var(TLS_SANS_ENV_KEY, san_value)
    current_env[TLS_CN_ENV_KEY] = primary_host
    current_env[TLS_SANS_ENV_KEY] = san_value


def reconnect_stdin_to_terminal() -> bool:
    """Rebind stdin to the controlling terminal when the launcher was piped into bash."""
    if sys.stdin.isatty() and sys.stdout.isatty():
        return True

    if not sys.stdout.isatty():
        return False

    try:
        tty_in = open("/dev/tty", "r", encoding="utf-8", errors="ignore")
    except OSError:
        return False

    sys.stdin = tty_in
    return sys.stdin.isatty() and sys.stdout.isatty()


def ensure_interactive_terminal():
    """Abort early with a clear error when the setup wizard has no usable terminal."""
    if reconnect_stdin_to_terminal():
        return

    console.print(Panel(
        "[bold red]The setup wizard requires an interactive terminal.[/bold red]\n\n"
        "This usually happens when the installer was started without a controlling TTY.\n"
        "Run it from a normal shell session and try again.",
        title="Interactive Terminal Required",
        expand=False
    ))
    sys.exit(1)


def pause(message: str = "Press Enter to continue..."):
    """Wait for user acknowledgment without crashing when stdin is unavailable."""
    if sys.stdin.isatty() and sys.stdout.isatty():
        questionary.text(message).ask()
        return
    console.print(f"[dim]{message}[/dim]")


def ensure_ssl_certificates() -> bool:
    """Generate the development TLS certificate if no certificate pair exists yet."""
    if os.path.exists(TLS_CERT_FILE) and os.path.exists(TLS_KEY_FILE):
        maybe_regenerate_self_signed_certificate()
        return True

    console.print(
        "[yellow]TLS certificate files not found. Generating a local development certificate...[/yellow]"
    )
    code, out, err = generate_self_signed_certificate()
    if code == 0 and os.path.exists(TLS_CERT_FILE) and os.path.exists(TLS_KEY_FILE):
        return True

    console.print("[bold red]Failed to generate TLS certificate files.[/bold red]")
    details = "\n".join(part for part in (out, err) if part)
    if details:
        console.print(details)
    return False


def guide_ssl_certificate():
    """Displays instructions on handling Let's Encrypt SSL certificates."""
    console.print(Panel(
        "[bold green]SSL / HTTPS Configuration Guide[/bold green]\n\n"
        "Mensabot expects its TLS certificate files at `nginx/certs/selfsigned.crt` and "
        "`nginx/certs/selfsigned.key`.\n\n"
        "If those files are missing, the setup wizard generates a local self-signed certificate "
        "automatically before Docker Compose starts. That fallback certificate only covers "
        "`localhost` and `127.0.0.1` unless you configure matching hostnames/IPs in the wizard "
        "or regenerate it with those hostnames/IPs.\n\n"
        "If a self-signed certificate already exists, regenerate it after changing the TLS host "
        "settings so the new names are embedded into the certificate.\n\n"
        "To use trusted certificates instead, the simplest way is Let's Encrypt (`certbot`).\n\n"
        "1. Generate your certificates on your server:\n"
        "   [dim]sudo certbot certonly --standalone -d yourdomain.com[/dim]\n\n"
        "2. Replace the development certificate files in the Mensabot nginx directory:\n"
        "   [dim]cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/certs/selfsigned.crt[/dim]\n"
        "   [dim]cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/certs/selfsigned.key[/dim]\n\n"
        "Mensabot's NGINX image uses exactly these two file paths during the build.",
        expand=False
    ))
    pause()


def maybe_regenerate_self_signed_certificate() -> None:
    """Optionally regenerate an existing self-signed certificate after TLS config changes."""
    if not (os.path.exists(TLS_CERT_FILE) and os.path.exists(TLS_KEY_FILE)):
        return

    reasons = certificate_regeneration_reasons()
    if not reasons:
        return

    reason_lines = "\n".join(f"- {reason}" for reason in reasons)
    regenerate = questionary.confirm(
        "The existing self-signed certificate should be regenerated.\n"
        f"{reason_lines}\n\n"
        "Regenerate it now using the configured hostnames/IPs?",
        default=True,
    ).ask()
    if not regenerate:
        return

    code, out, err = generate_self_signed_certificate()
    if code == 0:
        console.print("[green]Self-signed certificate regenerated successfully.[/green]")
        return

    console.print("[bold red]Failed to regenerate the self-signed certificate.[/bold red]")
    details = "\n".join(part for part in (out, err) if part)
    if details:
        console.print(details)

def flow_express_setup(current_env: Dict, example_env: Dict, example_desc: Dict):
    """Walks the user through mandatory and critical fields only."""
    console.print("\n[bold cyan]Express Setup[/bold cyan]")
    console.print("We will configure the most important settings. Other settings will inherit defaults.")
    
    def get_default(key: str) -> str:
        return get_config_default(key, current_env, example_env)
        
    def prompt_with_desc(key: str, prompt_text: str, default_val: str, hide=False) -> str:
        desc = example_desc.get(key, "")
        print_description(desc)
        if hide:
            return questionary.password(prompt_text).ask()
        return questionary.text(prompt_text, default=default_val).ask()

    # LLM Settings
    console.print("\n[bold]1. LLM Settings[/bold]")
    llm_base = prompt_with_desc("API_BACKEND_LLM_BASE_URL", "LLM API Base URL:", get_default("API_BACKEND_LLM_BASE_URL"))
    if llm_base is None: return
    save_env_var("API_BACKEND_LLM_BASE_URL", llm_base)
    
    llm_model = prompt_with_desc("API_BACKEND_LLM_MODEL", "LLM Model:", get_default("API_BACKEND_LLM_MODEL"))
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
    desc_user = example_desc.get("BASIC_AUTH_USER", "")
    print_description(desc_user)
    enable_auth = questionary.confirm("Enable Nginx Basic Auth?", default=bool(get_default("BASIC_AUTH_USER"))).ask()
    if enable_auth:
        user = questionary.text("Username:", default=get_default("BASIC_AUTH_USER")).ask()
        if user is None: return
        pwd = questionary.password("Password:").ask()
        if pwd is None: return
        save_env_var("BASIC_AUTH_USER", user)
        if pwd: save_env_var("BASIC_AUTH_PASS", pwd)
    else:
        save_env_var("BASIC_AUTH_USER", "")
        save_env_var("BASIC_AUTH_PASS", "")

    configure_tls_hosts(current_env, example_env)
        
    # STT Settings
    console.print("\n[bold]4. Voice / STT Settings[/bold]")
    desc_stt = example_desc.get("STT_MODEL", "")
    print_description(desc_stt)
    
    stt_def = get_default("STT_MODEL")
    stt_model = questionary.select(
        "Whisper STT Model Size:",
        choices=["tiny", "base", "small", "medium"],
        default=stt_def if stt_def in ["tiny", "base", "small", "medium"] else "small"
    ).ask()
    if stt_model is None: return
    save_env_var("STT_MODEL", stt_model)

def flow_advanced_setup(current_env: Dict, example_env: Dict, example_desc: Dict):
    """Walks through categories of settings for deep configuration."""
    console.print("\n[bold cyan]Advanced Setup[/bold cyan]")
    
    def get_default(key: str) -> str:
        return get_config_default(key, current_env, example_env)

    def prompt_secret_value(key: str) -> None:
        has_current_value = bool(current_env.get(key))
        if has_current_value:
            action = questionary.select(
                f"{key}:",
                choices=[
                    Choice("Keep existing value", value="keep"),
                    Choice("Replace value", value="replace"),
                    Choice("Clear value", value="clear"),
                ],
                default="keep",
                use_indicator=True,
            ).ask()
            if action in (None, "keep"):
                return
            if action == "clear":
                save_env_var(key, "")
                current_env[key] = ""
                return

        val = questionary.password(f"{key} (hidden):").ask()
        if val is None:
            return
        if has_current_value and val == "":
            console.print("[yellow]No new value entered. Keeping the existing value.[/yellow]")
            return
        save_env_var(key, val)
        current_env[key] = val
        
    categories: List = load_env_categories(ENV_EXAMPLE_FILE)
    if not categories:
        console.print("[bold red]Could not load configuration categories from .env.example.[/bold red]")
        return
    
    for cat in categories:
        if questionary.confirm(f"Configure '{cat['name']}'?", default=True).ask():
            console.print(f"\n[bold]{cat['name']}[/bold]")
            for key in cat["keys"]:
                key_str = str(key)
                desc = example_desc.get(key_str, "")
                print_description(desc)
                if "API_KEY" in key_str or "PASS" in key_str:
                    prompt_secret_value(key_str)
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
    
    current_env = load_env_defaults(ENV_FILE)
    example_env = load_env_defaults(ENV_EXAMPLE_FILE)
    example_desc = load_env_descriptions(ENV_EXAMPLE_FILE)
    
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
        flow_express_setup(current_env, example_env, example_desc)
        maybe_regenerate_self_signed_certificate()
        guide_ssl_certificate()
    elif mode == "advanced":
        flow_advanced_setup(current_env, example_env, example_desc)
        maybe_regenerate_self_signed_certificate()
        guide_ssl_certificate()
    elif mode == "ssl":
        guide_ssl_certificate()
    
    if mode in ["express", "advanced"]:
        console.print("[green]Configuration saved![/green]")

def action_start():
    """Builds and starts the docker compose stack."""
    console.print("\n[bold cyan]Deploying Mensabot[/bold cyan]")
    if not ensure_ssl_certificates():
        pause()
        return
    console.print("Starting Docker Compose stack. Live Docker output is shown below.\n")
    code = run_cmd_live(["docker", "compose", "up", "-d", "--build"])

    if code == 0:
        console.print("[bold green]Mensabot started successfully![/bold green]")
        console.print("It might take a minute for all services to become fully healthy.")
    else:
        console.print("[bold red]Error bringing up the stack:[/bold red]")
        console.print("Docker Compose exited with a non-zero status.")
    pause()

def action_restart():
    """Stops and restarts the docker compose stack to apply config changes."""
    console.print("\n[bold cyan]Restarting Mensabot[/bold cyan]")
    with console.status("Stopping current stack...", spinner="dots"):
        run_cmd(["docker", "compose", "down"])

    if not ensure_ssl_certificates():
        pause()
        return

    console.print("Starting Docker Compose stack. Live Docker output is shown below.\n")
    code = run_cmd_live(["docker", "compose", "up", "-d", "--build"])

    if code == 0:
        console.print("[bold green]Mensabot restarted successfully![/bold green]")
    else:
        console.print("[bold red]Error restarting the stack:[/bold red]")
        console.print("Docker Compose exited with a non-zero status.")
    pause()

def action_update():
    """Fetches updates from git, allows version selection, and pulls code."""
    console.print("\n[bold cyan]Mensabot Update Manager[/bold cyan]")
    deployment_state = get_deployment_state()

    with console.status("Fetching latest available versions from GitHub...", spinner="dots"):
        code_fetch, fetch_out, fetch_err = run_cmd(
            ["git", "fetch", "origin", "+refs/heads/*:refs/remotes/origin/*", "--tags", "--prune"]
        )
        code_tags, tags, tags_err = run_cmd(["git", "tag", "-l", "--sort=-v:refname"])
        code_branches, branches_raw, branches_err = run_cmd(
            ["git", "for-each-ref", "--sort=-committerdate", "--format=%(refname:short)", "refs/remotes/origin"]
        )

    if code_fetch != 0:
        console.print("[bold red]Error fetching latest versions from Git.[/bold red]")
        details = "\n".join(part for part in (fetch_out, fetch_err) if part)
        if details:
            console.print(details)
        pause()
        return
    
    branch_list = []
    if code_branches == 0:
        for b in branches_raw.split("\n"):
            b_clean = b.strip()
            if not b_clean or b_clean == "origin/HEAD":
                continue
            branch_name = b_clean.replace("origin/", "", 1) if b_clean.startswith("origin/") else b_clean
            if branch_name and branch_name not in branch_list:
                branch_list.append(branch_name)
                
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
        details = "\n".join(
            part
            for part in (
                tags_err if code_tags != 0 else "",
                branches_err if code_branches != 0 else "",
            )
            if part
        )
        if details:
            console.print(details)
        pause()
        return

    selected_ref = questionary.select(
        "Select the version / branch you want to checkout/update to:",
        choices=choices,
        use_indicator=True
    ).ask()
    
    if selected_ref == "cancel" or selected_ref is None:
        return

    is_branch = selected_ref in branch_list

    with console.status(f"Checking out {selected_ref}...", spinner="dots"):
        if is_branch:
            local_branch_exists, _, _ = run_cmd(["git", "show-ref", "--verify", f"refs/heads/{selected_ref}"])
            if local_branch_exists == 0:
                checkout_cmd = ["git", "checkout", selected_ref]
            else:
                checkout_cmd = ["git", "checkout", "-b", selected_ref, "--track", f"origin/{selected_ref}"]
        else:
            checkout_cmd = ["git", "checkout", selected_ref]
        code, out, err = run_cmd(checkout_cmd)
    if code != 0:
        console.print("[bold red]Error checking out the selected version.[/bold red]")
        details = "\n".join(part for part in (out, err) if part)
        if details:
            console.print(details)
        pause()
        return

    if is_branch:
        with console.status(f"Pulling latest changes for {selected_ref}...", spinner="dots"):
            code, out, err = run_cmd(["git", "pull", "--ff-only", "origin", selected_ref])
        if code != 0:
            console.print("[bold red]Error pulling the latest changes for the selected branch.[/bold red]")
            details = "\n".join(part for part in (out, err) if part)
            if details:
                console.print(details)
            pause()
            return

    console.print(f"[bold green]Successfully switched Mensabot to version: {selected_ref}[/bold green]")

    if deployment_state == 1:
        if questionary.confirm(
            "Mensabot is not configured yet. Do you want to open the configuration wizard now?",
            default=True,
        ).ask():
            action_configure()
    elif deployment_state == 3:
        if questionary.confirm("Mensabot is currently running. Do you want to restart it now to apply the update?").ask():
            action_restart()
    else:
        if questionary.confirm("Do you want to start Mensabot now?").ask():
            action_start()

def action_stop():
    """Stops the docker compose stack."""
    console.print("\n[bold cyan]Stopping Mensabot[/bold cyan]")
    with console.status("Stopping current stack...", spinner="dots"):
        code, out, err = run_cmd(["docker", "compose", "down"])
        
    if code == 0:
        console.print("[bold green]Mensabot stopped successfully.[/bold green]")
    else:
        console.print("[bold red]Error stopping the stack:[/bold red]")
        console.print(err)
    pause()

def main_menu():
    while True:
        display_header()
        state = get_deployment_state()
        
        choices = []
        
        if state == 1:
            console.print("[yellow]State: Initial Setup (Not Configured)[/yellow]\n")
            choices = [
                Choice("Select Mensabot Version", value="update"),
                Choice("Initial Configuration", value="config"),
                Choice("Start / Deploy Mensabot (Disabled - Requires Configuration)", value=None, disabled="Requires Configuration"),
                Choice("Restart Mensabot (Disabled - Not Running)", value=None, disabled="Not Running"),
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
    ensure_interactive_terminal()
    check_prerequisites()
    main_menu()
