# J.A.R.V.I.S. MK XV — entrega e verificação

Edição 15.0.0, concluída em 7 de novembro de 2026. Este é o relatório atual; os demais relatórios de versões anteriores em `docs/` ficam como histórico.

## Resultado

O projeto mantém as nove artes originais, incluindo DUM-E e U, e organiza os oito assistentes na ordem **Jarvis, Friday, Visão, Ultron, Verônica, Karen, EDITH e Iris**. As imagens não foram esticadas ou substituídas. Seus limites de transparência determinam o posicionamento em um SVG comum de 600 × 600, com diâmetro aparente máximo de 520 unidades. O arquivo `ARTES_ORIGINAIS_SHA256.json` comprova a preservação dos PNGs.

Cada identidade possui cores, fundos, detalhes, animações 2D e instruções próprias. Os núcleos de Jarvis e Friday não exibem os nomes sobre a imagem da seleção. Animações incluem órbitas, varreduras, trilhas e pulsos específicos, com pausa fora da tela e respeito à preferência de movimento reduzido. Não há visualização 3D. O rodapé solicitado e a saudação dos guias foram mantidos.

O catálogo oferece **27 configurações de conexão**, com cinco implementações de protocolo: Chat Completions, Responses, Messages, Gemini GenerateContent e Ollama nativo. Há autenticação configurável, streaming ou JSON, limite de saída, consulta de modelos e cabeçalhos adicionais restritos. A compatibilidade continua dependendo do endpoint, do modelo, da conta e do CORS do provedor.

Foram acrescentados painéis para quatro formatos de geração de imagem, pesquisa com Tavily/Brave/Serper/Exa e acesso opcional a NewsAPI/Wolfram pelo servidor. PDF, DOCX e XLSX são lidos localmente; há prévia de PDF e exportação de conversa em JSON, Markdown, PDF e Word, além de tabelas em Excel. As bibliotecas necessárias estão incluídas e são carregadas quando usadas.

Histórico local optativo usa IndexedDB, com fallback limitado. Há backup em arquivo, SQLite no servidor opcional e SQL para ativação do Supabase com autenticação, isolamento por usuário e controle de revisão. O padrão continua sendo uma sessão temporária. Chaves não entram nos backups, banco local ou Supabase.

## Correções relevantes

- Normalização do tamanho aparente das oito artes e das áreas de seleção.
- Respeito ao modo de efeitos desligados, inclusive ao atualizar a conexão.
- Proteção contra reutilizar uma chave em outro provedor ou endereço.
- Bloqueio de redirecionamento de chamadas autenticadas e validação de URLs/cabeçalhos.
- Leitura incremental de eventos com limites, Unicode entre blocos, interrupção e preservação de resposta parcial.
- Suporte dos cinco protocolos também no servidor opcional, incluindo autenticação e nomes de campos de tokens específicos.
- Limites para catálogos grandes: páginas, itens, tamanho de resposta e nomes de modelos.
- Leituras ZIP/Office limitadas também durante a descompressão; rejeição de caminhos inválidos, XML com entidades e arquivos excessivos.
- Alternativa FileReader quando métodos modernos de Blob não estão disponíveis.
- Cancelamento da leitura de documentos e controle do conjunto de imagens em memória.
- Downloads iniciados dentro de diálogos, funcionando também no HTML portátil.
- Exportação de células textuais para evitar executar fórmulas de conteúdo recebido.
- Correção de estado de busca e do guia que confundia “anexar” com o serviço Exa.
- Ajustes de teclado móvel, composição de texto, área segura, altura visual, rolagem, foco e controles em telas pequenas.
- Registro manual do hardware com origem explícita, sem apresentar RAM arredondada ou cota do site como capacidade física exata.

## Testes executados

| Verificação | Resultado |
| --- | ---: |
| Testes JavaScript | 7.301 aprovados |
| Testes Python | 79 aprovados |
| Total automatizado | **7.380 aprovados** |
| Falhas / testes ignorados | 0 / 0 |
| Artes originais verificadas por SHA-256 | 9 |
| Perfis na ordem solicitada | 8 |
| Configurações de conexão | 27 |
| Protocolos implementados | 5 |
| Páginas do manual renderizadas e inspecionadas | 35 |

Os logs completos estão em `RESULTADO_MK_XV_JS.tap` e `RESULTADO_MK_XV_PYTHON.txt`. `VALIDACAO_MK_XV.json` registra contagens e medidas do build. Para repetir: execute `python tools/verify.py`, com Python e Node instalados em um computador autorizado.

A matriz exercita combinações de protocolos e configurações, eventos de streaming em UTF-8, privacidade, contexto, armazenamento manual, URLs, células de planilha, regras de layout, navegação espacial e pesquisa. São casos de teste, **não 7.380 defeitos corrigidos**, aparelhos distintos ou chamadas a contas reais. As combinações de protocolo validam o contrato dos adaptadores; não significam que cada provedor aceita os cinco formatos.

## Verificação no navegador

Revisão em Chromium, com o mesmo build web e o HTML portátil. As chamadas de integração abaixo usaram respostas locais de teste identificadas, sem credenciais de terceiros.

- Os oito perfis mudaram a aparência da aplicação. A ordem e as proporções foram conferidas na seleção.
- Foram examinadas áreas de visualização de 190 × 300 a 1.920 × 1.080, incluindo retrato, paisagem e área reduzida pelo teclado. A última conferência de 190, 390, 768 e 1.363 px está registrada em `REVISAO_NAVEGADOR_MK_XV.json`; não houve transbordamento horizontal do corpo nesses pontos, e os oito núcleos ficaram quadrados e iguais dentro de cada tela.
- No modo TV, a seta para a direita moveu o foco de Preferências para um controle na área principal. O gamepad foi coberto por contratos e regras; nenhum controle físico foi conectado.
- Os cinco protocolos completaram respostas locais em streaming. O caso de interrupção/falha preservou o texto parcial e exibiu o erro. Quatro formatos de imagem e serviços auxiliares receberam dados locais de teste.
- PDF, Word e Excel foram importados no HTML portátil. O PDF do manual foi aberto na prévia. As exportações reais de PDF, DOCX e XLSX foram baixadas, abertas e verificadas; o texto “=1+1” permaneceu literal na planilha.
- O histórico local optativo sobreviveu a recarregamento. O diagnóstico de dispositivo permaneceu desativado até o clique, distinguiu valores manuais e permitiu revogar o registro.
- As 35 páginas do manual foram renderizadas e inspecionadas. Uma renderização da capa a 7.680 px foi produzida para conferir ampliação; o PDF entregue mantém textos e elementos vetoriais com fontes incorporadas, sem transformar cada página em uma imagem pesada.

## Banco de dados

`database/supabase_mk_xv.sql` foi validado sintaticamente com pglast v8.7: 14 instruções e duas funções PL/pgSQL. Inclui RLS, verificação do usuário autenticado, RPC de salvamento e revisão para conflitos entre abas. O resultado está em `SQL_VALIDACAO_MK_XV.json`.

O SQL **não foi executado em uma conta Supabase real**. A ativação, o login e o teste de isolamento com duas contas ainda precisam ser realizados pelo proprietário do projeto, seguindo o manual. A verificação sintática não substitui esse teste.

## Contagem de código

| Parte | Linhas físicas |
| --- | ---: |
| Base autoral e configuração | 3.192 |
| Bibliotecas funcionais licenciadas | 200.422 |
| **Base total** | **203.614** |
| Compatibilidade separada | 183 |
| Testes | 1.032 |

A contagem inclui comentários e linhas físicas: parte do código autoral está compactada em linhas longas. Exclui HTML compilado, cópias de `dist/`, binários, relatórios e ferramentas de documentação. **Não são 203 mil linhas autorais novas.** As bibliotecas reais de PDF, Word e ZIP têm versões, licenças, uso e contagens em `vendor/DEPENDENCIAS.json`. Não foram adicionadas linhas vazias ou repetições para aumentar o número.

## Arquivos de entrega

- `JARVIS_MK_XV_COMPLETO.zip`: código, artes, dependências, testes, servidor opcional, SQL, manual e HTML portátil.
- `JARVIS_MK_XV.html`: aplicação portátil para computador, com recursos essenciais incorporados, cerca de 30 MB.
- `JARVIS_MK_XV_PUBLICAR.zip`: site estático com `index.html` e recursos separados, apropriado para publicar por HTTPS. Não contém chaves, banco local, servidor ou o HTML portátil.
- `GUIA_COMPLETO_JARVIS_MK_XV.pdf`: 35 páginas, com ativação das APIs, dados, publicação gratuita e limitações de dispositivos.

`python tools/package.py CAMINHO_DE_SAIDA` recria os dois ZIPs, copia o HTML e o manual e gera hashes. Ele verifica a integridade dos ZIPs e rejeita arquivos de credenciais, bancos locais e caches. Execute o build e a verificação antes de empacotar.

## Limites e próximas ações do proprietário

1. Usar uma chave e um modelo acessível na sua conta. Nenhuma API paga foi acionada nesta revisão; disponibilidade gratuita e políticas podem mudar.
2. Ativar o próprio Supabase se quiser sincronização. O código está pronto para configurar; não há um banco remoto criado ou conectado em seu nome.
3. Publicar o ZIP específico e escolher um nome curto disponível. Nenhum domínio foi comprado ou endereço público registrado nesta entrega.
4. Conferir os aparelhos reais. Os layouts foram testados no navegador, sem iPhone, Android, Safari, TV, console ou relógio físicos. Voz, instalação de atalho e gamepad dependem do navegador e das permissões disponíveis. Não há aplicativo nativo para relógios ou consoles.
5. Conferir RAM e armazenamento no sistema e registrá-los manualmente, se desejar. Uma permissão do navegador não fornece a capacidade física exata desses componentes.

A qualidade das respostas depende do modelo e do contexto, além das instruções de personalidade. A interface não cria um novo modelo fundacional nem garante respostas corretas. Referências dos filmes foram usadas em adaptações originais; Iris e a personalidade falada de Verônica não são apresentadas como cânone confirmado de uma obra.

Created using AI by Orlando with assistance, and based on the first version created by Nikolas.
