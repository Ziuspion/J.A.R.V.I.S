# Validação - J.A.R.V.I.S. MK XV

Revisão de estilo e registro da auditoria de estabilidade, 06/11/2026. Este relatório descreve os resultados desta sessão; não representa monitoramento contínuo até uma hora futura nem garantia de ausência de defeitos.

## Ajuste da seleção animada

EDITH e Ultron receberam camadas SVG/CSS próprias na galeria. Movimento, fechamento e desligamento dos efeitos foram conferidos no navegador. Os PNGs de JARVIS e Friday são idênticos aos gerados no pedido anterior; os hashes foram comparados com os arquivos originais. Os 110 testes existentes passaram novamente. Veja [ANIMACOES_SELECAO.md](ANIMACOES_SELECAO.md).

## Resultado visual atual

A revisão de estilo de 06/11/2026 está documentada em [DIRECAO_VISUAL.md](DIRECAO_VISUAL.md). Os quatro núcleos agora usam PNGs RGBA de 1254 × 1254 pixels, dentro de um HUD 2D. JARVIS é ciano; Friday é laranja; EDITH é azul; Ultron é vermelho sangue. O HTML tem cerca de 9,6 MB, com as quatro artes embutidas.

Inclinação pelo mouse e propriedades de perspectiva foram removidas. O crédito solicitado aparece no rodapé e `veronica coming soon` foi incluído como anúncio. Os 110 testes existentes passaram novamente após a atualização. A inspeção visual atual conferiu as quatro identidades, galeria, preferências e uma conversa local de prévia; os demais itens abaixo registram a auditoria funcional anterior.

## Correções da auditoria funcional anterior

### Conversa e anexos

1. “Gerar alternativa” cria um ramo com o contexto até a pergunta. A resposta original é preservada, sem acumular duas respostas concorrentes na mesma conversa.
2. Rascunhos de texto e anexos aguardando envio ficam associados a cada conversa, na memória da aba.
3. Leitura de arquivos tem controle de revisão e cancelamento: uma leitura antiga não insere anexos na conversa aberta depois.
4. Enviar fica desativado durante a leitura de anexos. Quatro arquivos continuam sendo o máximo por mensagem.
5. O tamanho do texto e dos anexos atuais é validado antes de limpar o campo ou criar uma conversa vazia.
6. O contexto envia até quatro imagens, dando prioridade às mais recentes. Imagens excedentes são sinalizadas, sem alterar os originais em cache.
7. O limite de 180 mensagens aceita a última dupla pergunta/resposta que cabe na conversa.
8. A renderização final preserva a posição de leitura de quem rolou para mensagens anteriores.
9. Eventos atrasados do reconhecimento de voz são ignorados depois de parar a escuta ou trocar de conversa.

### Conexão e respostas

10. O navegador encerra a leitura ao receber `[DONE]`, `done` do servidor ou a conclusão nativa do Gemini. A resposta não fica presa aguardando uma conexão que permaneceu aberta.
11. Interromper prevalece mesmo quando texto e conclusão chegam no mesmo bloco de rede. O trecho parcial continua disponível.
12. Limites de leitura cobrem o evento SSE completo, incluindo múltiplas linhas; o texto parcial fica limitado a 60 mil caracteres.
13. Respostas JSON têm leitura limitada, validação de formato e mensagens de erro que não reproduzem o corpo bruto recebido. Erros de formato não são confundidos com CORS.
14. Ao mudar a URL de uma API compatível, a chave da URL anterior não é reaproveitada automaticamente.
15. Consultas atrasadas à lista de modelos não substituem o formulário depois da troca de provedor; há cancelamento e prazo.
16. O botão de teste da conexão permite cancelar a consulta.

### Dados e servidor opcional

17. Importação preserva a escolha local de histórico e desativa envio de memória e cópias automáticas. Importar dados não autentica uma conexão.
18. Backups v4 inválidos ou acima dos limites são recusados antes da troca, sem truncamento silencioso de conversas extensas.
19. Desligar cópias automáticas cancela a cópia agendada; o envio revalida essa opção. Conflitos entre abas persistem a pausa do salvamento automático.
20. Confirmações de importação e remoção usam uma janela acessível na interface. O botão de apagar histórico descreve o que é removido e o que permanece na aba.
21. O servidor lê SSE multilinha e limita o evento completo, validando o formato retornado pelo provedor.
22. Falhas inesperadas depois do primeiro token viram um evento de erro SSE. O servidor não escreve outro cabeçalho HTTP dentro da resposta; o slot de geração é liberado.
23. Tipos inválidos de pergunta, identidade e extensão da resposta são recusados como erros de entrada. O orçamento de texto e imagens é validado também no servidor.
24. Host malformado, porta inválida, JSON não finito e campos de credenciais em backups são recusados com erro útil. Textos de conversa que mencionem “key” ou “token” continuam válidos.
25. A configuração Supabase detecta também o antigo JWT service_role quando usado indevidamente como chave pública.
26. A rota `/GUIA.pdf` aponta para o guia existente, o favicon foi incluído e as instruções de inicialização do servidor foram corrigidas.

## Testes automatizados

**110 aprovados: 50 JavaScript e 60 Python.** São os 78 testes anteriores mais 32 regressões desta revisão.

```text
node --test testes/test_frontend.js testes/test_regressions.js
python -m unittest discover -s testes -p "test_*.py" -q
```

Cobrem serialização v3/v4, privacidade, migração, limites, quatro personas, OpenRouter/Gemini/API compatível, contexto multimodal, streaming UTF-8 fragmentado, eventos multilinha, encerramento com conexão aberta, interrupção, erros, JSON alternativo, revisão SQLite, conflitos, origem/host/sessão e contrato HTTP/SSE.

As APIs são simuladas nos testes. Não houve consumo de uma chave real nem avaliação da atuação artística de um modelo remoto. Os testes não prometem que o aplicativo ficará livre de bugs em todos os navegadores.

## Verificação no navegador da auditoria anterior

Chromium, janela 1363 × 936, usando servidor temporário de QA fora do pacote:

- Galeria final com os quatro núcleos e proporções iguais.
- Streaming, títulos, tabela, bloco de código, link e uso de tokens.
- Texto que contém HTML exibido como texto, sem executá-lo.
- Interrupção com preservação do texto e indicação “RESPOSTA INTERROMPIDA”.
- Alternativa em outra conversa, com uma pergunta e uma resposta no ramo.
- Rascunho da conversa original recuperado ao voltar.
- Anexo de texto recuperado na conversa correspondente após trocar de conversa.
- Importação por diálogo da interface; histórico e envio de memória permaneceram desativados mesmo com essas opções ativas no arquivo de teste.
- Cancelamento de teste de conexão, com confirmação de interrupção na tela.
- Falha interna simulada depois do primeiro token: texto preservado como parcial e erro útil, sem detalhes privados.
- Recarga em sessão temporária descarta conversas e credenciais da aba.

Mensagens de erro da extensão do ambiente foram separadas dos logs do aplicativo. Não houve erro de JavaScript da aplicação observado nesses fluxos. Não houve inspeção em aparelho móvel físico, microfone real ou voz do Windows.

## Entrega e limites

O pacote contém HTML autônomo, cópia index.html idêntica, fontes editáveis, artes PNG, referências originais, servidor opcional, testes, documentação e guia de cinco páginas renderizado e inspecionado. Não contém chaves reais, bancos de testes, dependências, servidor de QA ou caches.

Os quatro personagens usam o modelo conectado e não são quatro modelos treinados separadamente. Ultron continua exclusivo de entretenimento e roast. JARVIS, Friday e EDITH mantêm assistência geral, com os estilos pedidos. Não há módulos escolares nem modo foco.

A geração precisa da conta do usuário, internet e disponibilidade do provedor. Visão, cotas, acesso por CORS e permissões de microfone precisam ser confirmados no computador de uso. O chat não executa código nem possui controle automático do Windows ou navegação web. As integrações avançadas do backend continuam documentadas separadamente, sem controles na interface principal.

Referência técnica usada na revisão do SSE: [HTML Standard - Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html). Referências de personalidade e registro das artes estão em PERSONALIDADES.md e ARTES.md.
