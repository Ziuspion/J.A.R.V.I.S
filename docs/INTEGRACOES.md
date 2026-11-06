# Integrações e próximos passos

## Para conversar agora

Use OpenRouter ou Gemini em Conectar IA no HTML. Essas são as integrações de geração com interface pronta. Outra API compatível é configurável pelo mesmo formulário. A chave precisa ser da sua conta e não acompanha o pacote.

As chaves mostradas na captura têm funções diferentes:

| Variável | Função no servidor opcional | Situação nesta interface |
| --- | --- | --- |
| OPENROUTER_API_KEY | Geração por modelos OpenRouter | Pode ser digitada diretamente no HTML ou configurada no servidor |
| Chave Gemini | Geração pela API nativa Google | Digite no HTML com provedor Gemini; não há variável Gemini nativa no servidor |
| LOVABLE_API_KEY | Gateway compatível definido no servidor | Não substitui uma chave OpenRouter ou Gemini; depende do acesso autorizado ao gateway |
| TAVILY_API_KEY | Pesquisa com fontes por API | Endpoint avançado; pesquisa automática não é acionada no chat atual |
| NEWSAPI_KEY | Consulta de notícias por API | Endpoint avançado, sem painel de notícias nesta edição |
| WOLFRAM_APPID | Consulta curta ao Wolfram Alpha | Endpoint avançado, sem painel nesta edição |
| VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY | URL e chave pública de um projeto Supabase | Estrutura SQL e endpoints de conta/nuvem preservados; não há login ou sincronização Supabase nesta interface |

Não copie chaves de um serviço para o campo de outro. Os nomes em uma captura não revelam os valores nem comprovam que as contas estão ativas. A edição não depende de contratar esses serviços.

## Onde o código está

- `fonte/core.js`: validação de backups, contexto, formato dos pedidos e parser de streaming OpenRouter/Gemini/API compatível.
- `fonte/app.js`: interface, conversas, anexos, permissões de voz, sessão e dados.
- `fonte/app.css`: layout responsivo, quatro temas e animações vetoriais.
- `build.py`: compila uma página HTML autônoma com as fontes e visuais embutidos.
- `personas.json`: comportamento e identidade de cada personagem.
- `server.py`, `servidor/core.py`, `servidor/providers.py`: API local opcional e snapshots SQLite.
- `supabase/`: estrutura opcional preservada para futura interface de conta.

## O que depende de execução manual

1. **Ativar a geração:** criar a própria conta, gerar uma chave e conectar. Não foi possível validar credenciais que não foram fornecidas e não seria correto inventá-las. Confira cotas e custos na conta.
2. **Usar voz:** permitir o microfone quando o navegador solicitar e escolher uma voz já disponível. Há computadores e navegadores que bloqueiam esses recursos.
3. **Continuar em outro computador:** exportar JSON, guardar o arquivo, abri-lo em Conversas e dados > Importar backup e reconectar sua chave. Reanexar as imagens originais.
4. **Usar um modelo local:** exige que um serviço compatível já esteja instalado e funcionando em um computador permitido. Configure uma API local ou o provedor Ollama no servidor opcional. Não é parte da solução sem instalação e não é baixado pelo HTML.
5. **Integrar novas ferramentas:** criar controles explícitos e o fluxo de aprovação das ações que o usuário escolher. O modelo atual gera texto e analisa anexos; uma resposta escrita não executa ações reais.

## Limites que precisam continuar visíveis

Não apresentar animação como processamento de um modelo local, configurar como conexão confirmada antes de uma resposta real, ou anunciar uma integração de backend como se já tivesse botão na interface. Não salvar chaves em backups. Não substituir variantes gratuitas por modelos pagos automaticamente. Não confundir personalidade com qualidade do modelo.

Para adicionar uma ferramenta, implemente uma função independente, uma tela de configuração com erro claro e um teste de contrato. As integrações físicas do servidor estão desligadas por padrão e a conversa não tem acesso a elas. Não publique o servidor local como serviço multiusuário sem desenvolver autenticação, isolamento e uma política de retenção apropriados.
