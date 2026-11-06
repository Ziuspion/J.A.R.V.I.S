# Validação - Fusion MK XIV

Data: 06/11/2026.

## Testes automatizados

**76 aprovados: 32 JavaScript e 44 Python.**

- Serialização e importação: formato v4, migração de conversas antigas, limites, exclusão de credenciais e bytes de imagens, preservação de Unicode e contagem de tokens.
- Provedores: pedidos OpenRouter, Gemini nativo e API compatível; quatro prompts de personalidade; contexto e memória opcionais; texto e imagens.
- Streaming: UTF-8 fragmentado, CRLF, comentários, eventos multilinha, conclusão, uso, modelo retornado, resposta JSON alternativa, interrupção e falhas com texto parcial.
- Gratuidade e erros: restrição a variantes OpenRouter gratuitas, sem fallback pago; quota, URL inválida, falha de rede e evento malformado.
- Servidor: snapshots v3/v4, conflitos de revisão, limite de versões, parâmetros de origem/host e sessão, arquivos privados indisponíveis, automação física desligada, chave não exposta na configuração pública e contrato HTTP/SSE.

Os testes usam mocks locais. Não fazem chamadas externas e não usam credenciais reais. São testes de integração e contrato, sem demonstrar a qualidade ou a disponibilidade de um modelo remoto.

## Revisão no navegador

Verificado em navegador Chromium, área de captura 1363 x 936:

- Inicialização sem erro de JavaScript observado na aplicação; componentes SVG e fontes do sistema sem download obrigatório.
- Troca dos quatro sistemas e seleção pela galeria. Os visuais foram comparados às referências enviadas: anéis ciano JARVIS, anéis laranja Sexta-feira e visor azul EDITH. Ultron recebeu desenho próprio com máscara angular.
- Envio sem conexão abre a configuração e preserva o rascunho.
- Falha de API mostra erro fora da conversa e não cria uma resposta artificial.
- Fluxo HTTP/SSE com servidor de teste temporário: texto, título, tabela, código copiável, uso de tokens e link renderizados.
- HTML de entrada e resposta aparece como texto, sem executar marcação.
- Botão Parar interrompeu a geração, preservou o texto recebido e mostrou RESPOSTA INTERROMPIDA.
- Exportação real de JSON: formato v4, quatro mensagens da conversa de teste, status da resposta preservado e ausência da chave-sentinela digitada na conexão.
- Importação do arquivo exportado: conversa e resposta interrompida recuperadas; a chave não foi restaurada.
- Recarga com histórico desativado: conversas temporárias descartadas e nenhuma conexão automaticamente autenticada.
- Estado final voltou ao aplicativo normal, sem modelo de teste conectado. O servidor simulado não integra o pacote.

O CSS inclui adaptações para janelas menores e movimento reduzido. Não houve inspeção visual em um aparelho móvel físico. Voz, microfone e permissão de acesso em Windows precisam ser confirmados no computador de uso.

## Entrega

- HTML principal autônomo e cópia index.html idêntica.
- Fontes editáveis, compilador sem dependências externas, servidor opcional, testes e referências visuais originais.
- Guia PDF de cinco páginas renderizado e inspecionado integralmente, com fontes embutidas e links clicáveis.
- ZIP sem credenciais, bancos locais, cache, servidor simulado ou pacotes de dependências.

## Limites materiais

Não houve geração por uma conta real OpenRouter/Gemini, pois nenhuma chave de acesso foi fornecida. Os adaptadores e protocolos foram testados com respostas simuladas. Cotas, condições comerciais, suporte a visão e permissões CORS pertencem ao provedor e precisam ser confirmados com a conta do usuário.

O aplicativo é um cliente de IA generativa. Não contém um LLM treinado localmente e não dá ao chat acesso automático ao Windows, à web ou aos endpoints físicos avançados. As quatro identidades compartilham o modelo configurado. Integrações avançadas preservadas no servidor estão documentadas separadamente, sem serem anunciadas como controles prontos da interface.
