"""Contratos dos adaptadores do servidor. Respostas em memória, sem API paga ou conta real."""
import io
import json
import os
import unittest
from unittest.mock import patch
from servidor.ai_protocols import native_spec, native_stream
from servidor.core import cfg, UserError
from servidor.providers import sse_data

PROTOCOLS=('chat','responses','anthropic','gemini','ollama')
MESSAGES=[{'role':'system','content':'Instrução de teste'}, {'role':'user','content':[{'type':'text','text':'Pergunta com imagem'},{'type':'image_url','image_url':{'url':'data:image/png;base64,aGVsbG8='}}]}, {'role':'assistant','content':'Anterior'}, {'role':'user','content':'Atual'}]

def config(kind):
    return {'provider':'compatible','protocol':kind,'base':'https://example.org/v1','key':'HEADER_ONLY_SENTINEL','model':'model-test','auth':'bearer'}

class Response(io.BytesIO):
    def __init__(self,value,mime):
        super().__init__(value.encode() if isinstance(value,str) else value)
        self.headers={'Content-Type':mime}

JSON_OK={
'chat':{'choices':[{'message':{'content':'Ação concluída 🤖'},'finish_reason':'stop'}],'model':'verified','usage':{'total_tokens':7}},
'responses':{'output':[{'type':'message','content':[{'type':'output_text','text':'Ação concluída 🤖'}]}],'status':'completed','model':'verified','usage':{'input_tokens':3,'output_tokens':4}},
'anthropic':{'content':[{'type':'text','text':'Ação concluída 🤖'}],'stop_reason':'end_turn','model':'verified','usage':{'input_tokens':3,'output_tokens':4}},
'gemini':{'candidates':[{'content':{'parts':[{'thought':True,'text':'HIDDEN_THOUGHT'},{'text':'Ação concluída 🤖'}]},'finishReason':'STOP'}],'modelVersion':'verified','usageMetadata':{'totalTokenCount':7}},
'ollama':{'message':{'content':'Ação concluída 🤖','thinking':'HIDDEN_THOUGHT'},'done':True,'model':'verified','prompt_eval_count':3,'eval_count':4},
}

def events(kind):
    if kind=='chat': return [{'choices':[{'delta':{'content':'Ação concluída 🤖'},'finish_reason':'stop'}],'model':'verified'}, {'choices':[],'usage':{'total_tokens':7}}]
    if kind=='responses':return [{'type':'response.output_text.delta','delta':'Ação concluída 🤖'},{'type':'response.completed','response':{'model':'verified','status':'completed','usage':{'input_tokens':3,'output_tokens':4}}}]
    if kind=='anthropic':return [{'type':'message_start','message':{'model':'verified','usage':{'input_tokens':3}}},{'type':'content_block_delta','delta':{'type':'text_delta','text':'Ação concluída 🤖'}},{'type':'message_delta','delta':{'stop_reason':'end_turn'},'usage':{'output_tokens':4}},{'type':'message_stop'}]
    return [JSON_OK[kind]]

def run(kind,value,mime):
    with Response(value,mime) as response:
        def opener(request,timeout):
            assert timeout==70
            assert request.get_method()=='POST'
            assert 'HEADER_ONLY_SENTINEL' not in request.data.decode()
            return response
        return list(native_stream(config(kind),MESSAGES,4096,opener,sse_data))

class NativeTests(unittest.TestCase):
    def test_requests_preserve_images_and_keep_key_out_of_body(self):
        for kind in PROTOCOLS:
            with self.subTest(protocol=kind):
                url,headers,body=native_spec(config(kind),MESSAGES,8192)
                self.assertTrue(url.startswith('https://example.org/v1/'))
                self.assertIn('aGVsbG8=',json.dumps(body))
                self.assertIn('Atual',json.dumps(body))
                self.assertNotIn('HEADER_ONLY_SENTINEL',json.dumps(body))
                self.assertEqual(headers['Authorization'],'Bearer HEADER_ONLY_SENTINEL')
    def test_auth_modes(self):
        for auth,header in [('bearer','Authorization'),('api-key','api-key'),('google','x-goog-api-key'),('anthropic','x-api-key'),('none',None)]:
            with self.subTest(auth=auth):
                _,headers,_=native_spec({**config('chat'),'auth':auth},MESSAGES,2048)
                self.assertEqual(any('HEADER_ONLY_SENTINEL' in value for value in headers.values()),header is not None)
                if header:self.assertIn('HEADER_ONLY_SENTINEL',headers[header])
    def test_chat_limit_and_developer_role(self):
        _,_,body=native_spec({**config('chat'),'tokenParam':'max_completion_tokens','systemRole':'developer'},MESSAGES,8192)
        self.assertNotIn('max_tokens',body);self.assertEqual(body['max_completion_tokens'],8192);self.assertEqual(body['messages'][0]['role'],'developer')
        _,_,body=native_spec({**config('chat'),'tokenParam':'none'},MESSAGES,8192)
        self.assertNotIn('max_tokens',body)
    def test_gemini_rejects_model_path_injection(self):
        with self.assertRaises(UserError):native_spec({**config('gemini'),'model':'x/y?key=SECRET'},MESSAGES,2000)
    def test_empty_or_broken_json(self):
        for kind in PROTOCOLS:
            for value in ['{SECRET_SENTINEL','null','[]','{}']:
                with self.subTest(protocol=kind,value=value):
                    with self.assertRaises(UserError) as error:run(kind,value,'application/json')
                    self.assertNotIn('SECRET_SENTINEL',str(error.exception))
    def test_incomplete_stream_reports_error_after_delta(self):
        body='data: '+json.dumps({'type':'response.output_text.delta','delta':'Parcial'})+'\n\n'
        response=Response(body,'text/event-stream');iterator=native_stream(config('responses'),MESSAGES,2000,lambda *a,**k:response,sse_data)
        self.assertEqual(next(iterator),{'type':'delta','text':'Parcial'})
        with self.assertRaises(UserError):next(iterator)
    def test_provider_configuration_defaults(self):
        for provider,token in [('cerebras','max_completion_tokens'),('minimax','max_completion_tokens'),('deepinfra','max_tokens'),('nvidia','max_tokens')]:
            with self.subTest(provider=provider),patch.dict(os.environ,{'AI_PROVIDER':provider,'AI_MODEL':'test','AI_API_KEY':'test'},clear=True):
                actual=cfg();self.assertEqual(actual['tokenParam'],token);self.assertTrue(actual['ready'])
    def test_normalized_ollama_native(self):
        with patch.dict(os.environ,{'AI_PROVIDER':'ollama','AI_PROTOCOL':'ollama'},clear=True):
            self.assertEqual(cfg()['base'],'http://127.0.0.1:11434')
    def test_native_image_invalid_scheme(self):
        messages=[{'role':'system','content':'System'},{'role':'user','content':[{'type':'image_url','image_url':{'url':'https://example.org/private.png'}}]}]
        for kind in ['responses','anthropic','gemini','ollama']:
            with self.subTest(kind=kind),self.assertRaises(UserError):native_spec(config(kind),messages,2000)

def json_test(kind):
    def check(self):
        result=run(kind,json.dumps(JSON_OK[kind],ensure_ascii=False),'application/json')
        self.assertEqual(''.join(x.get('text','') for x in result),'Ação concluída 🤖')
        self.assertEqual(result[-1]['model'],'verified');self.assertEqual(result[-1]['usage']['total_tokens'],7)
    return check

def stream_test(kind):
    def check(self):
        rows=events(kind)
        if kind=='ollama':body='\n'.join(json.dumps(x,ensure_ascii=False) for x in rows)+'\n';mime='application/x-ndjson'
        else:body=''.join('data: '+json.dumps(x,ensure_ascii=False)+'\n\n' for x in rows)+('data: [DONE]\n\n' if kind=='chat' else '');mime='text/event-stream'
        result=run(kind,body,mime)
        self.assertEqual(''.join(x.get('text','') for x in result),'Ação concluída 🤖');self.assertEqual(result[-1]['usage']['total_tokens'],7)
    return check

for kind in PROTOCOLS:
    setattr(NativeTests,'test_json_'+kind,json_test(kind))
    setattr(NativeTests,'test_stream_'+kind,stream_test(kind))
