"""Configuração, persistência e sensores. Não executa código gerado pela IA."""
from __future__ import annotations

import ctypes
import json
import os
import platform
import shutil
import sqlite3
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
VERSION = "14.0.0"


class UserError(Exception):
    def __init__(self, message, status=400, code="invalid_request"):
        self.status, self.code = status, code
        super().__init__(message)


def load_env(path=ROOT / ".env"):
    """Sem expansão de comandos/variáveis. Variáveis do processo têm prioridade."""
    if path.is_file():
        for line in path.read_text("utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key, value = key.strip(), value.strip()
            if key.replace("_", "").isalnum():
                if len(value) > 1 and value[0] == value[-1] and value[0] in "\"'":
                    value = value[1:-1]
                os.environ.setdefault(key, value)


def api_url(value):
    p = urlparse(value)
    if p.username or p.password or p.query or p.fragment or not p.hostname:
        raise UserError("Endereço de API inválido em .env.")
    if p.scheme != "https" and not (p.scheme == "http" and p.hostname in {"localhost", "127.0.0.1", "::1"}):
        raise UserError("APIs remotas devem usar HTTPS; HTTP é aceito somente em loopback.")
    return value.rstrip("/")


def cfg():
    provider = os.getenv("AI_PROVIDER", "local").lower().strip()
    options = {
        "local": ("", "", "Comandos locais"),
        "ollama": (os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1"), "ollama", os.getenv("OLLAMA_MODEL", "qwen3:1.7b")),
        "openrouter": ("https://openrouter.ai/api/v1", os.getenv("OPENROUTER_API_KEY", ""), (os.getenv("AI_MODEL") or "openrouter/free")),
        "lovable": ("https://ai.gateway.lovable.dev/v1", os.getenv("LOVABLE_API_KEY", ""), os.getenv("AI_MODEL", "")),
        "compatible": (os.getenv("AI_BASE_URL", ""), os.getenv("AI_API_KEY", ""), os.getenv("AI_MODEL", "")),
    }
    if provider not in options:
        raise UserError("AI_PROVIDER deve ser local, ollama, openrouter, lovable ou compatible.")
    base, key, model = options[provider]
    if base:
        base = api_url(base)
    return {"provider": provider, "base": base, "key": key, "model": model,
            "ready": provider != "local" and bool(base and key and model)}


def public_config():
    c = cfg()
    supa = os.getenv("SUPABASE_URL", os.getenv("VITE_SUPABASE_URL", ""))
    publishable = os.getenv("SUPABASE_PUBLISHABLE_KEY", os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY", ""))
    return {"version": VERSION, "ai": {k: c[k] for k in ("provider", "model", "ready")},
            "services": {"tavily": bool(os.getenv("TAVILY_API_KEY")),
                         "news": bool(os.getenv("NEWSAPI_KEY")),
                         "wolfram": bool(os.getenv("WOLFRAM_APPID")),
                         "supabase": bool(supa and publishable),
                         "desktop": os.getenv("JARVIS_DESKTOP_ENABLED", "0") == "1" and platform.system() == "Windows",
                         "home": bool(os.getenv("HOME_ASSISTANT_URL") and os.getenv("HOME_ASSISTANT_TOKEN") and home_entities())},
            "system": platform.system(), "storage": "SQLite local"}


def home_entities():
    # Lista criada pelo proprietário, nunca pela IA ou por conteúdo da web.
    return {x.strip() for x in os.getenv("HOME_ASSISTANT_ENTITIES", "").split(",")
            if x.strip().startswith(("light.", "switch.", "fan.")) and len(x.strip()) < 120}


def validate_workspace(value):
    if isinstance(value, dict) and value.get("version") == 3:
        return validate_legacy_workspace(value)
    if not isinstance(value, dict) or value.get("version") != 4:
        raise UserError("Backup Fusion inválido.")
    if not isinstance(value.get("settings"), dict) or not isinstance(value.get("threads"), list):
        raise UserError("Preferências ou conversas inválidas.")
    if any(k in value["settings"] for k in ("apiKey", "api_key", "key", "secret", "token")):
        raise UserError("Chaves não podem ser incluídas no backup.")
    if len(value["threads"]) > 40:
        raise UserError("O limite é de 40 conversas por backup.")
    for thread in value["threads"]:
        if not isinstance(thread, dict) or not isinstance(thread.get("messages"), list) or len(thread["messages"]) > 180:
            raise UserError("Conversa inválida ou extensa demais.")
        for message in thread["messages"]:
            if not isinstance(message, dict) or message.get("role") not in ("user", "assistant") or not isinstance(message.get("content"), str) or len(message["content"]) > 60000:
                raise UserError("Mensagem inválida no backup.")
            attachments = message.get("attachments", [])
            if not isinstance(attachments, list) or len(attachments) > 4:
                raise UserError("Lista de anexos inválida.")
            for attachment in attachments:
                if not isinstance(attachment, dict) or attachment.get("data"):
                    raise UserError("Os bytes de imagens não podem entrar neste backup.")
    if len(json.dumps(value, ensure_ascii=False).encode()) > 4 * 1024 * 1024:
        raise UserError("O backup excede 4 MB.", 413)
    return value


def validate_legacy_workspace(value):
    if not isinstance(value, dict) or value.get("version") != 3:
        raise UserError("Backup antigo inválido.")
    data, vault = value.get("data"), value.get("vault")
    if not isinstance(data, dict) or not isinstance(vault, dict):
        raise UserError("O backup precisa conter data e vault.")
    for k in ("notes", "tasks", "messages", "timers", "protocols"):
        if not isinstance(data.get(k, []), list):
            raise UserError("Lista de dados inválida: " + k)
    threads = vault.get("threads", [])
    if not isinstance(threads, list) or len(threads) > 40:
        raise UserError("O limite é de 40 conversas por backup.")
    for thread in threads:
        if not isinstance(thread, dict) or not isinstance(thread.get("messages"), list) or len(thread["messages"]) > 160:
            raise UserError("Conversa inválida ou extensa demais.")
        for message in thread["messages"]:
            if not isinstance(message, dict) or message.get("role") not in ("user", "assistant") or not isinstance(message.get("content"), str) or len(message["content"]) > 24000:
                raise UserError("Mensagem inválida no backup.")
    if len(json.dumps(value, ensure_ascii=False).encode()) > 4 * 1024 * 1024:
        raise UserError("O backup excede 4 MB.", 413)
    return value


class Store:
    def __init__(self, directory):
        self.directory = Path(directory).expanduser()
        self.directory.mkdir(parents=True, exist_ok=True)
        self.path = self.directory / "jarvis.sqlite3"
        self.lock = threading.Lock()
        with self.connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS snapshots (revision INTEGER PRIMARY KEY AUTOINCREMENT, created REAL NOT NULL, payload TEXT NOT NULL)")
        try:
            self.directory.chmod(0o700)
            self.path.chmod(0o600)
        except OSError:
            pass

    def connect(self):
        return sqlite3.connect(self.path, timeout=10)

    def read(self, revision=None):
        with self.connect() as db:
            row = (db.execute("SELECT revision, created, payload FROM snapshots WHERE revision=?", (revision,)).fetchone()
                   if revision is not None else db.execute("SELECT revision, created, payload FROM snapshots ORDER BY revision DESC LIMIT 1").fetchone())
        return {"revision": row[0], "savedAt": row[1], "workspace": json.loads(row[2])} if row else {"revision": 0, "workspace": None}

    def history(self):
        with self.connect() as db:
            rows = db.execute("SELECT revision, created, length(payload) FROM snapshots ORDER BY revision DESC LIMIT 20").fetchall()
        return [{"revision": row[0], "savedAt": row[1], "characters": row[2]} for row in rows]

    def write(self, value, expected):
        value = validate_workspace(value)
        with self.lock, self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            current = db.execute("SELECT COALESCE(MAX(revision),0) FROM snapshots").fetchone()[0]
            if type(expected) is not int or expected != current:
                raise UserError("Há uma versão mais recente no servidor. Restaure o backup antes de salvar novamente.", 409, "revision_conflict")
            cur = db.execute("INSERT INTO snapshots(created,payload) VALUES (?,?)", (time.time(), json.dumps(value, ensure_ascii=False)))
            revision = cur.lastrowid
            db.execute("DELETE FROM snapshots WHERE revision NOT IN (SELECT revision FROM snapshots ORDER BY revision DESC LIMIT 20)")
        return {"revision": revision, "savedAt": time.time()}


class Telemetry:
    def __init__(self):
        self.previous = None
        self.lock = threading.Lock()

    def sample(self):
        with self.lock:
            memory, sample, cpu = None, None, None
            system = platform.system()
            try:
                if system == "Windows":
                    class MEMORY(ctypes.Structure):
                        _fields_ = [("length", ctypes.c_ulong), ("load", ctypes.c_ulong)] + [(k, ctypes.c_ulonglong) for k in ("total", "available", "totalPage", "availablePage", "totalVirtual", "availableVirtual", "extended")]
                    m = MEMORY()
                    m.length = ctypes.sizeof(m)
                    if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m)):
                        memory = {"total": m.total, "used": m.total - m.available, "percent": m.load}
                    idle, kernel, user = ctypes.c_ulonglong(), ctypes.c_ulonglong(), ctypes.c_ulonglong()
                    if ctypes.windll.kernel32.GetSystemTimes(ctypes.byref(idle), ctypes.byref(kernel), ctypes.byref(user)):
                        sample = (idle.value, kernel.value + user.value)
                elif system == "Linux":
                    values = [int(x) for x in Path("/proc/stat").read_text().splitlines()[0].split()[1:]]
                    sample = (values[3] + values[4], sum(values[:8]))
                    m = {a: int(b.split()[0]) * 1024 for a, b in (line.split(":", 1) for line in Path("/proc/meminfo").read_text().splitlines())}
                    total, available = m["MemTotal"], m.get("MemAvailable", m["MemFree"])
                    memory = {"total": total, "used": total - available, "percent": round((total - available) * 100 / total, 1)}
                if sample and self.previous:
                    delta = sample[1] - self.previous[1]
                    if delta > 0:
                        cpu = round(max(0, min(100, 100 * (1 - (sample[0] - self.previous[0]) / delta))), 1)
                if sample:
                    self.previous = sample
            except (OSError, ValueError, KeyError, AttributeError):
                pass
            disk = shutil.disk_usage(str(Path.home()))
            return {"source": "sistema operacional", "system": system, "cores": os.cpu_count(),
                    "cpuPercent": cpu, "memory": memory,
                    "disk": {"total": disk.total, "used": disk.used, "percent": round(disk.used * 100 / disk.total, 1)},
                    "at": time.time()}
