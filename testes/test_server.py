"""Testes locais e mocks de contrato; não usam chaves reais nem fazem chamadas externas."""
import io
import json
import os
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from servidor.core import Store, Telemetry, UserError, api_url, public_config, validate_workspace
from servidor import providers
from server import JarvisServer


def workspace(text="teste"):
    message = {"id": "m1", "role": "user", "content": text, "at": 1}
    return {"version": 3, "data": {"notes": [], "tasks": [], "messages": [message], "timers": [], "protocols": []},
            "vault": {"active": "t1", "prefs": {}, "threads": [{"id": "t1", "title": "Teste", "messages": [message]}]}}


def workspace4():
    return {"version": 4, "settings": {"persona": "edith", "keepHistory": False}, "memory": "",
            "active": "t1", "threads": [{"id": "t1", "persona": "edith", "title": "Conversa",
            "messages": [{"role": "user", "content": "Olá", "attachments": []}]}]}


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.store = Store(self.directory.name)

    def tearDown(self):
        self.directory.cleanup()

    def test_new_store(self):
        self.assertEqual(self.store.read(), {"revision": 0, "workspace": None})

    def test_roundtrip_preserves_unicode(self):
        value = workspace("ação, revisão e café ☕")
        self.store.write(value, 0)
        self.assertEqual(self.store.read()["workspace"], value)

    def test_conflict_cannot_overwrite(self):
        self.store.write(workspace("original"), 0)
        with self.assertRaises(UserError) as error:
            self.store.write(workspace("outro"), 0)
        self.assertEqual(error.exception.status, 409)
        self.assertEqual(self.store.read()["workspace"]["data"]["messages"][0]["content"], "original")

    def test_retains_twenty_snapshots(self):
        for i in range(25):
            self.store.write(workspace(str(i)), i)
        with self.store.connect() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM snapshots").fetchone()[0], 20)

    def test_sql_is_data(self):
        self.store.write(workspace("'; DROP TABLE snapshots; --"), 0)
        self.assertEqual(self.store.read()["revision"], 1)

    def test_previous_version_can_be_recovered(self):
        self.store.write(workspace("primeiro"), 0)
        self.store.write(workspace("segundo"), 1)
        self.assertEqual(self.store.read(1)["workspace"]["data"]["messages"][0]["content"], "primeiro")
        self.assertEqual(len(self.store.history()), 2)
        self.assertNotIn("workspace", self.store.history()[0])

    def test_boolean_revision_rejected(self):
        with self.assertRaises(UserError):
            self.store.write(workspace(), False)

    def test_invalid_shape_rejected(self):
        for value in (None, [], {"version": 2}, {"version": 3, "data": [], "vault": {}}):
            with self.subTest(value=value), self.assertRaises(UserError):
                validate_workspace(value)

    def test_thread_limit(self):
        value = workspace()
        value["vault"]["threads"] *= 41
        with self.assertRaises(UserError):
            validate_workspace(value)

    def test_message_limit(self):
        value = workspace("a" * 24001)
        with self.assertRaises(UserError):
            validate_workspace(value)

    def test_new_workspace_roundtrip(self):
        value = workspace4()
        self.store.write(value, 0)
        self.assertEqual(self.store.read()["workspace"], value)

    def test_new_workspace_does_not_accept_credentials(self):
        for key in ("key", "apiKey", "secret", "token"):
            value = workspace4()
            value["settings"][key] = "PRIVATE"
            with self.subTest(key=key), self.assertRaises(UserError):
                validate_workspace(value)

    def test_new_workspace_does_not_accept_image_bytes(self):
        value = workspace4()
        value["threads"][0]["messages"][0]["attachments"] = [{"kind": "image", "data": "data:image/png;base64,YQ=="}]
        with self.assertRaises(UserError):
            validate_workspace(value)

    def test_new_workspace_limits(self):
        for field, count in (("threads", 41), ("messages", 181), ("content", 60001), ("attachments", 5)):
            value = workspace4()
            if field == "threads":
                value["threads"] *= count
            elif field == "messages":
                value["threads"][0]["messages"] *= count
            elif field == "content":
                value["threads"][0]["messages"][0]["content"] = "x" * count
            else:
                value["threads"][0]["messages"][0]["attachments"] = [{}] * count
            with self.subTest(field=field), self.assertRaises(UserError):
                validate_workspace(value)


class ConfigurationTests(unittest.TestCase):
    def test_public_config_does_not_disclose_keys(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "openrouter", "OPENROUTER_API_KEY": "SECRET_SENTINEL", "TAVILY_API_KEY": "SECRET_SEARCH", "AI_MODEL": ""}, clear=True):
            result = public_config()
            self.assertTrue(result["ai"]["ready"])
            self.assertEqual(result["ai"]["model"], "openrouter/free")
            self.assertNotIn("SECRET", json.dumps(result))

    def test_remote_http_and_credential_urls_rejected(self):
        for url in ("file:///etc/passwd", "http://example.com/v1", "https://key@example.com/v1", "https://example.com/v1?key=secret"):
            with self.subTest(url=url), self.assertRaises(UserError):
                api_url(url)

    def test_ollama_loopback_allowed(self):
        self.assertEqual(api_url("http://127.0.0.1:11434/v1/"), "http://127.0.0.1:11434/v1")

    def test_telemetry_has_truthful_optional_values(self):
        sensor = Telemetry()
        first = sensor.sample()
        self.assertIsNone(first["cpuPercent"])
        self.assertGreater(first["disk"]["total"], 0)
        if first["memory"]:
            self.assertLessEqual(first["memory"]["used"], first["memory"]["total"])

    def test_home_command_not_in_allowlist(self):
        with patch.dict(os.environ, {"HOME_ASSISTANT_ENTITIES": "light.sala"}, clear=True):
            with self.assertRaises(UserError):
                providers.home_action("lock.front_door", True)

    def test_missing_provider_is_explicit(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "local"}, clear=True), self.assertRaises(UserError):
            list(providers.stream_chat({"message": "Olá"}))


class ProviderContractTests(unittest.TestCase):
    def response(self, text="Olá, senhor."):
        lines = [b"data: " + json.dumps({"choices": [{"delta": {"content": text}}]}, ensure_ascii=False).encode() + b"\n\n", b"data: [DONE]\n\n"]
        return io.BytesIO(b"".join(lines))

    def test_stream_unicode_and_completed_event(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}, clear=True), patch.object(providers, "urlopen", return_value=self.response()) as request:
            events = list(providers.stream_chat({"message": "Oi", "preferences": {}}))
            self.assertEqual(events[0], {"type": "delta", "text": "Olá, senhor."})
            self.assertEqual(events[-1]["type"], "done")
            self.assertTrue(request.call_args.args[0].full_url.endswith("/v1/chat/completions"))

    def test_all_four_personalities_reach_the_model(self):
        definitions = json.loads((Path(__file__).resolve().parents[1] / "personas.json").read_text("utf-8"))
        for persona, definition in definitions.items():
            with self.subTest(persona=persona), patch.dict(os.environ, {"AI_PROVIDER": "ollama"}, clear=True), patch.object(providers, "urlopen", return_value=self.response()) as request:
                list(providers.stream_chat({"message": "Crie", "persona": persona, "preferences": {"name": "Orlando", "length": "brief"}}))
                body = json.loads(request.call_args.args[0].data)
                self.assertIn(definition["prompt"], body["messages"][0]["content"])
                self.assertIn("Orlando", body["messages"][0]["content"])
                self.assertEqual(body["max_tokens"], 1024)

    def test_new_context_and_image_contract(self):
        supplied = [{"role": "system", "content": "UNTRUSTED_SYSTEM"}, {"role": "user", "content": "Histórico"}, {"role": "assistant", "content": "Anterior"}, {"role": "user", "content": "Analise", "attachments": [{"kind": "text", "name": "a.txt", "text": "ATTACHMENT_TEXT"}, {"kind": "image", "data": "data:image/png;base64,YQ=="}]}]
        with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}, clear=True), patch.object(providers, "urlopen", return_value=self.response()) as request:
            list(providers.stream_chat({"message": "Analise", "messages": supplied, "preferences": {"useContext": True}}))
            messages = json.loads(request.call_args.args[0].data)["messages"]
            self.assertNotIn("UNTRUSTED_SYSTEM", json.dumps(messages))
            self.assertEqual(messages[1]["content"], "Histórico")
            self.assertIn("ATTACHMENT_TEXT", messages[-1]["content"][0]["text"])
            self.assertEqual(messages[-1]["content"][1]["image_url"]["url"], "data:image/png;base64,YQ==")

    def test_disabled_context_sends_only_current_question(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}, clear=True), patch.object(providers, "urlopen", return_value=self.response()) as request:
            list(providers.stream_chat({"message": "Atual", "messages": [{"role": "user", "content": "OLD_PRIVATE"}, {"role": "user", "content": "Atual"}], "preferences": {"useContext": False}}))
            self.assertNotIn("OLD_PRIVATE", request.call_args.args[0].data.decode())

    def test_stream_cutoff_is_an_explicit_error(self):
        response = io.BytesIO(b'data: {"choices":[{"delta":{"content":"Partial"}}]}\n\n')
        with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}, clear=True), patch.object(providers, "urlopen", return_value=response):
            events = providers.stream_chat({"message": "Oi"})
            self.assertEqual(next(events)["text"], "Partial")
            with self.assertRaises(UserError):
                list(events)

    def test_actual_model_usage_and_finish_reason(self):
        response = io.BytesIO(b'data: {"model":"actual-model","choices":[{"delta":{"content":"Result"},"finish_reason":"length"}],"usage":{"total_tokens":9}}\n\ndata: [DONE]\n\n')
        with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}, clear=True), patch.object(providers, "urlopen", return_value=response):
            result = list(providers.stream_chat({"message": "Oi"}))[-1]
            self.assertEqual(result["model"], "actual-model")
            self.assertEqual(result["finishReason"], "length")
            self.assertEqual(result["usage"]["total_tokens"], 9)

    def test_context_must_end_with_user(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}, clear=True), self.assertRaises(UserError):
            list(providers.stream_chat({"message": "Oi", "messages": [{"role": "assistant", "content": "Invalid"}]}))

    def test_history_and_memory_require_consent(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}, clear=True), patch.object(providers, "urlopen", return_value=self.response()) as request:
            list(providers.stream_chat({"message": "Oi", "preferences": {}, "history": [{"role": "user", "content": "PRIVATE_HISTORY"}], "memory": "PRIVATE_MEMORY"}))
            body = request.call_args.args[0].data.decode()
            self.assertNotIn("PRIVATE_HISTORY", body)
            self.assertNotIn("PRIVATE_MEMORY", body)

    def test_consented_history_ignores_system_role(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}, clear=True), patch.object(providers, "urlopen", return_value=self.response()) as request:
            list(providers.stream_chat({"message": "Oi", "preferences": {"history": True, "memory": True}, "history": [{"role": "system", "content": "BAD_SYSTEM"}, {"role": "user", "content": "GOOD_HISTORY"}], "memory": "GOOD_MEMORY"}))
            body = request.call_args.args[0].data.decode()
            self.assertNotIn("BAD_SYSTEM", body)
            self.assertIn("GOOD_HISTORY", body)
            self.assertIn("GOOD_MEMORY", body)

    def test_web_sources_are_data_and_emitted(self):
        source = {"title": "Fonte", "url": "https://example.org", "content": "Dado externo"}
        with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}, clear=True), patch.object(providers, "search", return_value=[source]), patch.object(providers, "urlopen", return_value=self.response()) as request:
            events = list(providers.stream_chat({"message": "Oi", "web": True}))
            self.assertEqual(events[0]["type"], "sources")
            messages = json.loads(request.call_args.args[0].data)["messages"]
            self.assertNotIn("Dado externo", messages[0]["content"])
            self.assertIn("Dado externo", messages[-2]["content"])

    def test_provider_error_does_not_echo_raw_secret(self):
        error = HTTPError("https://provider.invalid", 401, "secret=DO_NOT_ECHO", {}, None)
        with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}, clear=True), patch.object(providers, "urlopen", side_effect=error):
            with self.assertRaises(UserError) as caught:
                list(providers.stream_chat({"message": "Oi"}))
            self.assertNotIn("DO_NOT_ECHO", str(caught.exception))


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.environment = patch.dict(os.environ, {"AI_PROVIDER": "local", "JARVIS_QUIET": "1", "JARVIS_DESKTOP_ENABLED": "0"}, clear=True)
        cls.environment.start()
        cls.directory = tempfile.TemporaryDirectory()
        cls.server = JarvisServer(("127.0.0.1", 0), cls.directory.name)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = "http://127.0.0.1:" + str(cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.directory.cleanup()
        cls.environment.stop()

    def request(self, path, payload=None, headers=None):
        headers = headers or {}
        if payload is not None:
            headers = {"Content-Type": "application/json", **headers}
        req = Request(self.base + path, json.dumps(payload).encode() if payload is not None else None, headers=headers)
        try:
            with urlopen(req) as r:
                return r.status, r.headers, r.read()
        except HTTPError as e:
            return e.code, e.headers, e.read()

    def test_health(self):
        self.assertEqual(self.request("/api/health")[0], 200)

    def test_index_and_security_headers(self):
        code, headers, body = self.request("/")
        self.assertEqual(code, 200)
        self.assertIn(b"MK XIV", body)
        self.assertEqual(headers["X-Frame-Options"], "DENY")
        self.assertIn("object-src 'none'", headers["Content-Security-Policy"])

    def test_private_files_not_served(self):
        for path in ("/.env", "/server.py", "/servidor/core.py", "/.preview-data/jarvis.sqlite3", "/assets/../../server.py"):
            with self.subTest(path=path):
                self.assertIn(self.request(path)[0], (403, 404))

    def test_csrf_required(self):
        self.assertEqual(self.request("/api/workspace", {"workspace": workspace(), "expectedRevision": 0})[0], 403)

    def test_foreign_origin_denied(self):
        self.assertEqual(self.request("/api/config", headers={"Origin": "https://evil.example"})[0], 403)

    def test_foreign_host_denied(self):
        self.assertEqual(self.request("/api/config", headers={"Host": "evil.example:8765"})[0], 403)

    def test_cross_site_denied(self):
        self.assertEqual(self.request("/api/config", headers={"Sec-Fetch-Site": "cross-site"})[0], 403)

    def test_workspace_http_roundtrip_and_conflict(self):
        token = json.loads(self.request("/api/config")[2])["session"]
        headers = {"X-Jarvis-Session": token}
        revision = self.server.store.read()["revision"]
        body = {"workspace": workspace(), "expectedRevision": revision}
        self.assertEqual(self.request("/api/workspace", body, headers)[0], 200)
        self.assertEqual(self.request("/api/workspace", body, headers)[0], 409)
        self.assertEqual(self.request("/api/workspace")[0], 200)

    def test_cloud_requires_login(self):
        headers = {"X-Jarvis-Session": self.server.csrf}
        self.assertEqual(self.request("/api/cloud/load", {}, headers)[0], 401)

    def test_desktop_disabled_and_never_spawns(self):
        with patch("server.subprocess.Popen") as spawn:
            status = self.request("/api/desktop", {"action": "calc.exe & powershell", "confirmed": True}, {"X-Jarvis-Session": self.server.csrf})[0]
            self.assertEqual(status, 403)
            spawn.assert_not_called()

    def test_unconfigured_chat_is_explicit(self):
        status, _, body = self.request("/api/chat", {"message": "Olá"}, {"X-Jarvis-Session": self.server.csrf})
        self.assertEqual(status, 503)
        self.assertIn("not_configured", body.decode())

    def test_unknown_post_is_404(self):
        self.assertEqual(self.request("/api/unknown", {}, {"X-Jarvis-Session": self.server.csrf})[0], 404)

    def test_stream_http_end_to_end_with_mock_provider(self):
        events = iter([{"type": "delta", "text": "Olá, senhor."}, {"type": "done", "model": "mock"}])
        with patch("server.providers.stream_chat", return_value=events):
            # Usa um gerador verdadeiro, inclusive close(), como a implementação.
            def stream(_):
                yield {"type": "delta", "text": "Olá, senhor."}
                yield {"type": "done", "model": "mock"}
            with patch("server.providers.stream_chat", side_effect=stream):
                status, headers, body = self.request("/api/chat", {"message": "Olá"}, {"X-Jarvis-Session": self.server.csrf})
                self.assertEqual(status, 200)
                self.assertTrue(headers["Content-Type"].startswith("text/event-stream"))
                self.assertIn("Olá, senhor.", body.decode())
                self.assertIn('"type": "done"', body.decode())


if __name__ == "__main__":
    unittest.main(verbosity=2)
