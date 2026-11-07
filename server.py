#!/usr/bin/env python3
"""Servidor opcional. Python 3.10+, sem pip/npm. Use INICIAR_SERVIDOR_OPCIONAL.bat."""
from __future__ import annotations

import argparse
import hmac
import json
import mimetypes
import os
import secrets
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from collections import defaultdict, deque
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from servidor.core import ROOT, Store, Telemetry, UserError, load_env, public_config, validate_workspace
from servidor import providers


class JarvisServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address, data_dir, preview=False):
        super().__init__(address, Handler)
        self.store, self.telemetry = Store(data_dir), Telemetry()
        self.csrf = secrets.token_urlsafe(36)
        self.preview = preview
        self.sessions = {}
        self.session_lock = threading.Lock()
        self.rate_lock = threading.Lock()
        self.requests = defaultdict(deque)
        self.ai_slots = threading.BoundedSemaphore(2)
        self.started = time.monotonic()


class Handler(BaseHTTPRequestHandler):
    server_version = "JARVIS/15"

    def log_message(self, fmt, *args):
        # Apenas método e caminho, nunca querystrings, bodies ou chaves.
        if os.getenv("JARVIS_QUIET") != "1":
            print(f"[{time.strftime('%H:%M:%S')}] {self.command} {urlsplit(self.path).path} {args[1] if len(args)>1 else ''}")

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Permissions-Policy", "camera=(), microphone=(self), geolocation=()")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self' blob: 'unsafe-inline' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: blob:; connect-src 'self' https: http://127.0.0.1:* http://localhost:* http://[::1]:*; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        super().end_headers()

    def json(self, value, status=200, cookie=None):
        body = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def guard(self, mutation=False):
        host = self.headers.get("Host", "")
        try:
            parsed = urlsplit("http://" + host)
            port = parsed.port
            valid = bool(host and parsed.hostname and not parsed.username and not parsed.password
                         and not parsed.path and not parsed.query and not parsed.fragment
                         and not any(c.isspace() for c in host))
        except ValueError:
            valid = False
        if not valid:
            raise UserError("Host não permitido.", 403)
        if not self.server.preview and parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
            raise UserError("Host não permitido.", 403)
        if self.headers.get("Sec-Fetch-Site", "") == "cross-site":
            raise UserError("Acesso entre sites bloqueado.", 403)
        origin = self.headers.get("Origin")
        if origin and origin not in {"http://" + host, "https://" + host}:
            raise UserError("Origem não permitida.", 403)
        if mutation and not hmac.compare_digest(self.headers.get("X-Jarvis-Session", ""), self.server.csrf):
            raise UserError("Sessão inválida. Recarregue o JARVIS.", 403, "session_invalid")

    def body(self):
        if self.headers.get("Transfer-Encoding"):
            raise UserError("Transferência não suportada.")
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            raise UserError("Use application/json.", 415)
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise UserError("Tamanho inválido.")
        if not 0 < size <= 12 * 1024 * 1024:
            raise UserError("Requisição vazia ou maior que 12 MB.", 413)
        self.connection.settimeout(15)
        try:
            def invalid_constant(_):
                raise ValueError("Número não finito")
            value = json.loads(self.rfile.read(size), parse_constant=invalid_constant)
        except (ValueError, UnicodeDecodeError, TimeoutError):
            raise UserError("JSON inválido.") from None
        if not isinstance(value, dict):
            raise UserError("O corpo precisa ser um objeto JSON.")
        return value

    def throttle(self, route):
        limits = {"/api/chat": 12, "/api/search": 20, "/api/news": 12, "/api/wolfram": 12, "/api/auth": 10}
        if route not in limits:
            return
        key = (self.client_address[0], route)
        with self.server.rate_lock:
            queue = self.server.requests[key]
            now = time.monotonic()
            while queue and now - queue[0] > 60:
                queue.popleft()
            if len(queue) >= limits[route]:
                raise UserError("Muitas solicitações. Aguarde um minuto.", 429)
            queue.append(now)

    def do_GET(self):
        try:
            self.guard()
            path = urlsplit(self.path).path
            if path == "/api/health":
                return self.json({"ok": True, "version": "15.0.0"})
            if path == "/api/config":
                value = public_config()
                value["session"] = self.server.csrf
                value["preview"] = self.server.preview
                if self.server.preview:
                    value["services"]["desktop"] = False
                    value["services"]["home"] = False
                session = self.auth_session(required=False)
                value["account"] = {"email": session.get("email")} if session else None
                return self.json(value)
            if path == "/api/workspace":
                return self.json(self.server.store.read())
            if path == "/api/versions":
                return self.json({"versions": self.server.store.history()})
            if path.startswith("/api/versions/"):
                revision = path.removeprefix("/api/versions/")
                if not revision.isdigit() or len(revision) > 12:
                    raise UserError("Versão inválida.")
                value = self.server.store.read(int(revision))
                if not value["workspace"]:
                    raise UserError("Versão não encontrada.", 404)
                return self.json(value)
            if path == "/api/telemetry":
                return self.json(self.server.telemetry.sample())
            if path == "/api/home":
                if self.server.preview:
                    raise UserError("Automação física desativada na prévia.", 403)
                return self.json({"devices": providers.home_states()})
            if path.startswith("/api/"):
                raise UserError("Endpoint não encontrado.", 404)
            self.static_file(path)
        except UserError as e:
            self.json({"error": str(e), "code": e.code}, e.status)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            self.json({"error": "Falha interna. Verifique o terminal do servidor.", "code": "internal_error"}, 500)

    def static_file(self, path):
        # Allowlist, sem listagem de diretórios. .env, SQLite e código não são servidos.
        allowed = {"/": "index.html", "/index.html": "index.html", "/JARVIS_FUSION_MK_XIV.html": "JARVIS_MK_XV.html", "/JARVIS_MK_XV.html": "JARVIS_MK_XV.html", "/manifest.webmanifest": "manifest.webmanifest", "/sw.js": "sw.js", "/GUIA.pdf": "docs/GUIA_COMPLETO_JARVIS_MK_XV.pdf", "/favicon.svg": "assets/favicon.svg"}
        relative = allowed.get(path)
        if not relative and path.startswith(("/assets/", "/vendor/")):
            suffix = Path(path).suffix.lower()
            if suffix in {".png", ".webp", ".jpg", ".svg", ".js", ".mjs", ".css", ".wasm", ".pfb", ".ttf", ".otf", ".bcmap"}:
                relative = path.lstrip("/")
        if not relative:
            raise UserError("Arquivo não encontrado.", 404)
        target = (ROOT / relative).resolve()
        if not target.is_relative_to(ROOT) or not target.is_file():
            raise UserError("Arquivo não encontrado.", 404)
        content = target.read_bytes()
        self.send_response(200)
        mime = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        self.send_header("Content-Type", mime + ("; charset=utf-8" if mime.startswith("text/") else ""))
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def auth_session(self, required=True):
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get("Cookie", ""))
        except Exception:
            cookie = SimpleCookie()
        sid = cookie.get("jarvis_account")
        with self.server.session_lock:
            session = self.server.sessions.get(sid.value) if sid else None
            if session and session["expires"] <= time.time():
                try:
                    r = providers.supabase("/auth/v1/token?grant_type=refresh_token", "POST", {"refresh_token": session["refresh"]})
                    session.update(access=r["access_token"], refresh=r["refresh_token"], expires=time.time()+r.get("expires_in", 3600)-60)
                except (UserError, KeyError):
                    self.server.sessions.pop(sid.value, None)
                    session = None
        if not session and required:
            raise UserError("Entre na conta Supabase para sincronizar.", 401, "login_required")
        return session

    def do_POST(self):
        try:
            self.guard(mutation=True)
            path = urlsplit(self.path).path
            self.throttle(path)
            payload = self.body()
            if path == "/api/workspace":
                return self.json(self.server.store.write(payload.get("workspace"), payload.get("expectedRevision")))
            if path == "/api/chat":
                return self.chat(payload)
            if path in {"/api/search", "/api/news", "/api/wolfram"}:
                q = payload.get("query")
                if not isinstance(q, str) or not 1 <= len(q.strip()) <= 500:
                    raise UserError("Consulta inválida; use até 500 caracteres.")
                if path == "/api/wolfram":
                    return self.json({"text": providers.wolfram(q), "source": "https://www.wolframalpha.com/"})
                return self.json({"sources": providers.search(q) if path == "/api/search" else providers.news(q)})
            if path == "/api/auth":
                return self.authenticate(payload)
            if path == "/api/cloud/save":
                session = self.auth_session()
                value = validate_workspace(payload.get("workspace"))
                # Mesmo um token válido continua sujeito ao RLS no Supabase.
                providers.supabase("/rest/v1/jarvis_profiles?on_conflict=user_id", "POST", {"user_id": session["user_id"], "payload": value}, session["access"])
                return self.json({"ok": True})
            if path == "/api/cloud/load":
                session = self.auth_session()
                r = providers.supabase("/rest/v1/jarvis_profiles?select=payload,updated_at&user_id=eq." + session["user_id"], token=session["access"])
                if not r:
                    raise UserError("Não há backup nessa conta.", 404)
                return self.json({"workspace": validate_workspace(r[0]["payload"]), "savedAt": r[0].get("updated_at")})
            if path == "/api/desktop":
                return self.desktop(payload)
            if path == "/api/home":
                if self.server.preview or payload.get("confirmed") is not True:
                    raise UserError("Confirme a ação no painel.", 403)
                return self.json(providers.home_action(payload.get("entity"), payload.get("on")))
            raise UserError("Endpoint não encontrado.", 404)
        except UserError as e:
            self.json({"error": str(e), "code": e.code}, e.status)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as e:
            # Não imprime valores da exceção de redes nem conteúdo privado.
            print("Erro interno:", type(e).__name__)
            self.json({"error": "Falha interna. Confira a configuração e o terminal.", "code": "internal_error"}, 500)

    def chat(self, payload):
        if not self.server.ai_slots.acquire(blocking=False):
            raise UserError("Já há duas solicitações de IA em andamento.", 429)
        generator = None
        try:
            generator = providers.stream_chat(payload)
            # Obtém o primeiro evento antes dos cabeçalhos para retornar erro JSON útil.
            first = next(generator)
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Connection", "close")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
            def emit(event):
                self.wfile.write(("data: " + json.dumps(event, ensure_ascii=False) + "\n\n").encode())
                self.wfile.flush()
            try:
                emit(first)
                for event in generator:
                    emit(event)
            except UserError as e:
                emit({"type": "error", "error": str(e)})
            except (BrokenPipeError, ConnectionResetError):
                pass
            except Exception:
                # Depois dos cabeçalhos SSE, nunca escreve um segundo status HTTP.
                emit({"type": "error", "error": "A resposta foi interrompida pelo servidor. Tente novamente."})
            finally:
                self.close_connection = True
        finally:
            try:
                if generator is not None:
                    generator.close()
            finally:
                self.server.ai_slots.release()

    def authenticate(self, p):
        action = p.get("action")
        if action == "logout":
            cookie = SimpleCookie()
            cookie.load(self.headers.get("Cookie", ""))
            sid = cookie.get("jarvis_account")
            with self.server.session_lock:
                session = self.server.sessions.pop(sid.value, None) if sid else None
            if session:
                try:
                    providers.supabase("/auth/v1/logout", "POST", {}, session["access"])
                except UserError:
                    pass
            return self.json({"ok": True}, cookie="jarvis_account=; Path=/api; Max-Age=0; HttpOnly; SameSite=Strict")
        if action not in {"login", "signup"}:
            raise UserError("Ação de autenticação inválida.")
        email, password = p.get("email"), p.get("password")
        if not isinstance(email, str) or "@" not in email or len(email) > 254 or not isinstance(password, str) or not 8 <= len(password) <= 200:
            raise UserError("Informe um email válido e senha de 8 a 200 caracteres.")
        route = "/auth/v1/signup" if action == "signup" else "/auth/v1/token?grant_type=password"
        r = providers.supabase(route, "POST", {"email": email, "password": password})
        if not r.get("access_token"):
            return self.json({"verificationRequired": True, "message": "Verifique o email de confirmação do Supabase e depois entre na conta."})
        sid = secrets.token_urlsafe(32)
        user = r["user"]
        with self.server.session_lock:
            # Sessões apenas em memória; cookies expiram com o navegador.
            now = time.time()
            self.server.sessions = {k: v for k, v in self.server.sessions.items() if v["expires"] > now - 86400}
            if len(self.server.sessions) > 100:
                raise UserError("Limite de sessões atingido. Reinicie o servidor.", 503)
            self.server.sessions[sid] = {"access": r["access_token"], "refresh": r["refresh_token"], "expires": now + r.get("expires_in", 3600) - 60, "user_id": user["id"], "email": user.get("email", email)}
        return self.json({"email": user.get("email", email)}, cookie=f"jarvis_account={sid}; Path=/api; HttpOnly; SameSite=Strict")

    def desktop(self, p):
        if self.server.preview or not public_config()["services"]["desktop"]:
            raise UserError("Controle do Windows desativado. Ative JARVIS_DESKTOP_ENABLED=1 no seu PC.", 403)
        if p.get("confirmed") is not True:
            raise UserError("Confirme a ação no painel.", 403)
        # Caminhos absolutos do Windows e argumentos fixos; sem shell, eval ou texto da IA.
        windows = Path(os.environ.get("SystemRoot", r"C:\Windows"))
        allowed = {"calculator": windows / "System32" / "calc.exe", "notepad": windows / "System32" / "notepad.exe", "explorer": windows / "explorer.exe"}
        target = allowed.get(p.get("action"))
        if not target:
            raise UserError("Aplicativo fora da lista permitida.", 403)
        if not target.is_file():
            raise UserError("Aplicativo não encontrado neste Windows.", 404)
        subprocess.Popen([str(target)], shell=False, close_fds=True)
        return self.json({"message": "Solicitação enviada ao Windows."})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "8765")))
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--preview", action="store_true", help="Prévia de desenvolvimento sem automação física")
    parser.add_argument("--host", default="127.0.0.1", help=argparse.SUPPRESS)
    parser.add_argument("--strictPort", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("Porta inválida")
    load_env()
    try:
        public_config()
    except UserError as e:
        print("Configuração:", e)
        return 1
    directory = os.getenv("JARVIS_DATA_DIR", str(Path.home() / ".jarvis-fusion-mkxiii"))
    if args.preview:
        directory = os.getenv("JARVIS_PREVIEW_DATA_DIR", str(ROOT / ".preview-data"))
    try:
        server = JarvisServer(("127.0.0.1", args.port), directory, args.preview)
    except OSError:
        print(f"A porta {args.port} já está em uso. Feche a outra sessão ou use: python server.py --port 8766")
        return 1
    url = f"http://127.0.0.1:{args.port}"
    print("\nJ.A.R.V.I.S. MK XV / GENERATIVE CORE")
    print("Local:", url)
    print("Provedor do servidor opcional:", public_config()["ai"]["provider"])
    print("Dados locais:", server.store.path)
    print("Mantenha este terminal aberto. Ctrl+C encerra o servidor.\n", flush=True)
    if not args.no_browser and not args.preview:
        threading.Timer(.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nSessão encerrada, senhor.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
