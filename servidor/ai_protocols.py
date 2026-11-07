"""Protocolos nativos opcionais; chaves permanecem no servidor configurado pelo dono."""
from __future__ import annotations
import json
import re
from urllib.parse import quote
from urllib.request import Request
from .core import UserError


def content_parts(message):
    value = message.get('content', '')
    return [{'type': 'text', 'text': value}] if isinstance(value, str) else value


def image_source(part):
    raw = (part.get('image_url') or {}).get('url', '')
    match = re.fullmatch(r'data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)', raw)
    if not match:
        raise UserError('Imagem inválida no contexto.', 400)
    return match.group(1), match.group(2), raw


def native_spec(config, messages, limit):
    kind, base = config['protocol'], config['base'].rstrip('/')
    headers = {'Content-Type': 'application/json', 'Accept': 'text/event-stream'}
    auth = config.get('auth', 'bearer')
    if config['key'] and auth != 'none':
        name = {'anthropic': 'x-api-key', 'google': 'x-goog-api-key', 'api-key': 'api-key'}.get(auth, 'Authorization')
        headers[name] = ('Bearer ' if auth == 'bearer' else '') + config['key']
    system = '\n'.join(m['content'] for m in messages if m['role'] == 'system')
    actual = [m for m in messages if m['role'] in ('user', 'assistant')]
    if kind == 'chat':
        payload = [{**m, 'role': config.get('systemRole', 'system') if m['role'] == 'system' else m['role']} for m in messages]
        if config.get('provider') == 'ollama' and isinstance(payload[-1]['content'], str):
            payload[-1] = {**payload[-1], 'content': payload[-1]['content'] + '\n/no_think'}
        body = {'model': config['model'], 'messages': payload, 'stream': True}
        field = config.get('tokenParam', 'max_tokens')
        if field != 'none':
            body[field] = limit
        headers['X-Title'] = 'J.A.R.V.I.S. MK XV'
        return base + '/chat/completions', headers, body
    if kind == 'responses':
        payload = []
        for m in actual:
            parts = []
            for part in content_parts(m):
                if part.get('type') == 'text':
                    parts.append({'type': 'output_text' if m['role'] == 'assistant' else 'input_text', 'text': part['text']})
                elif part.get('type') == 'image_url':
                    parts.append({'type': 'input_image', 'image_url': image_source(part)[2]})
            payload.append({'role': m['role'], 'content': parts})
        return base + '/responses', headers, {'model': config['model'], 'instructions': system, 'input': payload, 'stream': True, 'store': False, 'max_output_tokens': limit}
    if kind == 'anthropic':
        headers['anthropic-version'] = '2023-06-01'
        payload = []
        for m in actual:
            parts = []
            for part in content_parts(m):
                if part.get('type') == 'text':
                    parts.append({'type': 'text', 'text': part['text']})
                elif part.get('type') == 'image_url':
                    mime, data, _ = image_source(part)
                    parts.append({'type': 'image', 'source': {'type': 'base64', 'media_type': mime, 'data': data}})
            payload.append({'role': m['role'], 'content': parts})
        return base + '/messages', headers, {'model': config['model'], 'system': system, 'messages': payload, 'stream': True, 'max_tokens': limit}
    if kind == 'gemini':
        model = config['model'].removeprefix('models/')
        if not re.fullmatch(r'[\w.-]{1,160}', model):
            raise UserError('Modelo Gemini inválido em AI_MODEL.')
        contents = []
        for m in actual:
            parts = []
            for part in content_parts(m):
                if part.get('type') == 'text':
                    parts.append({'text': part['text']})
                elif part.get('type') == 'image_url':
                    mime, data, _ = image_source(part)
                    parts.append({'inlineData': {'mimeType': mime, 'data': data}})
            contents.append({'role': 'model' if m['role'] == 'assistant' else 'user', 'parts': parts})
        return base + '/models/' + quote(model, safe='') + ':streamGenerateContent?alt=sse', headers, {'systemInstruction': {'parts': [{'text': system}]}, 'contents': contents, 'generationConfig': {'maxOutputTokens': limit}}
    if kind == 'ollama':
        base = base.removesuffix('/api')
        payload = [{'role': 'system', 'content': system}]
        for m in actual:
            parts = content_parts(m)
            row = {'role': m['role'], 'content': '\n'.join(p['text'] for p in parts if p.get('type') == 'text')}
            images = [image_source(p)[1] for p in parts if p.get('type') == 'image_url']
            if images:
                row['images'] = images
            payload.append(row)
        return base + '/api/chat', headers, {'model': config['model'], 'messages': payload, 'stream': True, 'options': {'num_predict': limit}}
    raise UserError('Protocolo nativo não reconhecido.')


def text_blocks(parts):
    if not isinstance(parts, list):
        return ''
    return ''.join((p.get('text') or p.get('refusal') or '') for p in parts if isinstance(p, dict) and p.get('type') in ('text', 'output_text', 'refusal'))


def native_stream(config, messages, limit, opener, sse_reader):
    url, headers, body = native_spec(config, messages, limit)
    req = Request(url, data=json.dumps(body, ensure_ascii=False).encode(), headers=headers, method='POST')
    kind, length, finished, reason, actual_model, usage = config['protocol'], 0, False, '', config['model'], {}
    with opener(req, timeout=70) as response:
        mime = (getattr(response, 'headers', {}) or {}).get('Content-Type', 'text/event-stream').lower()
        as_json = 'text/event-stream' not in mime and 'ndjson' not in mime
        if as_json:
            raw = response.read(1024 * 1024 + 1)
            if len(raw) > 1024 * 1024:
                raise UserError('A resposta excedeu o limite de leitura.', 502)
            records = [raw]
        elif 'ndjson' in mime:
            def lines():
                while True:
                    line = response.readline(600002)
                    if not line:
                        break
                    if len(line) > 600000:
                        raise UserError('Evento muito extenso do provedor.', 502)
                    if line.strip():
                        yield line
            records = lines()
        else:
            records = sse_reader(response)
        for raw in records:
            if raw.strip() == b'[DONE]':
                if kind == 'chat':
                    finished = True
                    break
                continue
            try:
                value = json.loads(raw)
            except (ValueError, UnicodeDecodeError):
                raise UserError('O provedor enviou um evento inválido.', 502) from None
            if not isinstance(value, dict):
                raise UserError('O provedor enviou um evento inválido.', 502)
            if value.get('error') or value.get('type') in ('error', 'response.failed', 'response.error') or value.get('status') == 'failed':
                raise UserError('O provedor interrompeu a resposta. Confira a conexão e as cotas.', 502)
            delta = ''
            if kind == 'chat':
                choices = value.get('choices') or [{}]
                if not isinstance(choices, list) or not isinstance(choices[0], dict):
                    raise UserError('O provedor enviou um evento inválido.', 502)
                choice = choices[0]
                part = choice.get('message' if as_json else 'delta') or {}
                if not isinstance(part, dict):
                    raise UserError('O provedor enviou um evento inválido.', 502)
                delta = part.get('content', '')
                if isinstance(delta, list):
                    delta = text_blocks(delta)
                actual_model, usage = value.get('model') or actual_model, value.get('usage') or usage
                reason = choice.get('finish_reason') or reason
                finished = bool(reason) or as_json or finished
            elif kind == 'responses':
                full = value.get('response') or value
                actual_model = full.get('model') or actual_model
                usage = full.get('usage') or usage
                if value.get('type') in ('response.output_text.delta', 'response.refusal.delta'):
                    delta = value.get('delta', '')
                if as_json or value.get('type') in ('response.completed', 'response.incomplete'):
                    if not length:
                        delta = full.get('output_text') or ''.join(text_blocks(x.get('content')) for x in full.get('output', []) if isinstance(x, dict) and x.get('type') == 'message')
                    reason = 'length' if full.get('incomplete_details', {}).get('reason') == 'max_output_tokens' else 'stop'
                    finished = True
            elif kind == 'anthropic':
                if value.get('type') == 'message_start':
                    actual_model = value.get('message', {}).get('model') or actual_model
                    usage.update(value.get('message', {}).get('usage') or {})
                if value.get('type') == 'content_block_delta' and value.get('delta', {}).get('type') == 'text_delta':
                    delta = value['delta'].get('text', '')
                if value.get('type') == 'message_delta':
                    reason = value.get('delta', {}).get('stop_reason') or reason
                    usage.update(value.get('usage') or {})
                if value.get('type') == 'message_stop':
                    finished = True
                if as_json:
                    delta, reason, finished = text_blocks(value.get('content')), value.get('stop_reason', 'stop'), True
                    actual_model, usage = value.get('model') or actual_model, value.get('usage') or {}
            elif kind == 'gemini':
                if value.get('promptFeedback', {}).get('blockReason'):
                    raise UserError('O provedor não pôde responder a esse pedido.', 502)
                candidate = (value.get('candidates') or [{}])[0]
                delta = ''.join(x.get('text', '') for x in candidate.get('content', {}).get('parts', []) if not x.get('thought'))
                reason = candidate.get('finishReason') or reason
                finished = bool(reason) or as_json
                actual_model, usage = value.get('modelVersion') or actual_model, value.get('usageMetadata') or usage
            elif kind == 'ollama':
                delta = value.get('message', {}).get('content', '')
                actual_model = value.get('model') or actual_model
                if value.get('done') is True:
                    finished, reason = True, value.get('done_reason', 'stop')
                    usage = {'input_tokens': value.get('prompt_eval_count', 0), 'output_tokens': value.get('eval_count', 0)}
            if reason in ('SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'content_filter', 'error'):
                raise UserError('O provedor interrompeu a resposta para este pedido.', 502)
            if not isinstance(delta, str):
                raise UserError('O provedor enviou texto em formato inválido.', 502)
            if delta:
                length += len(delta)
                if length > 60000:
                    raise UserError('A resposta excedeu o limite de 60 mil caracteres.', 502)
                yield {'type': 'delta', 'text': delta}
            if finished and kind != 'chat':
                break
    if not length:
        raise UserError('O modelo respondeu sem texto. Esta integração não executa ferramentas.', 502)
    if not finished:
        raise UserError('A conexão terminou antes de o modelo concluir.', 502)
    if 'total_tokens' not in usage:
        usage['total_tokens'] = usage.get('totalTokenCount', usage.get('input_tokens', 0) + usage.get('output_tokens', 0))
    yield {'type': 'done', 'model': actual_model, 'finishReason': reason, 'usage': usage}
