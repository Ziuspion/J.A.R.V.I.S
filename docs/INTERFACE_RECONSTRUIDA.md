# Interface reconstruída — 07/11/2026

A aparência foi refeita em todas as áreas principais: navegação, faixa de identidades, tela inicial, conversa, campo de mensagem, conexão, preferências, dados, ajuda, seleção e confirmações. O ambiente passa a acompanhar a identidade escolhida, com materiais, fundos, padrões e acabamento próprios.

| Identidade | Ambiente | Acabamento |
| --- | --- | --- |
| JARVIS | Stark Workshop | Ciano, circuitos, linhas de engenharia e painéis precisos |
| Friday | Tactical Desk | Laranja e cobre, caminhos em degraus e divisórias táticas |
| EDITH | Optical Network | Azul e violeta, retículas e enquadramentos ópticos |
| Ultron | Unbound System | Carmesim, malha irregular, cortes retos e divisórias interrompidas |
| Verônica | Contingency Deck | Cobre desgastado, placas reforçadas e marcações de contingência |
| Karen | Guardian Interface | Azul profundo, sensores hexagonais e superfícies suaves |
| Iris | Orbital Workspace | Roxo, órbitas cruzadas e linhas de conexão |
| Visão | Synthesis | Dourado, losangos e simetria discreta |

## O que mudou

- A tela inicial agora reúne apresentação, núcleo visual e painéis de identidade e sessão em uma nova hierarquia.
- As janelas mostram o nome do sistema ativo e usam as superfícies e os padrões correspondentes.
- Os controles de formulário, botões, menus, confirmações e mensagens foram refeitos com as mesmas variáveis de tema.
- A conversa usa um fundo mais limpo para leitura, preservando as cores dos autores em mensagens de diferentes identidades. Tabelas e blocos de código continuam acessíveis.
- A seleção mantém rolagem independente, cabeçalho e crédito fixos, com os oito cartões disponíveis.
- Os rótulos solicitados do Ultron foram retirados do cartão, da apresentação, do estado de espera, do perfil, da faixa de contexto e da ajuda dos guias.
- Os dois guias mantêm a identidade própria em cinza, a arte e a saudação originais.

As oito PNGs e os prompts das personalidades foram comparados com a versão anterior e permaneceram iguais. As animações existentes foram preservadas. Apenas os textos de apresentação do Ultron foram ajustados conforme o pedido. O crédito continua exatamente como solicitado anteriormente.

## Estrutura editável

`fonte/app.css` contém os componentes, os layouts e as adaptações para largura e altura de tela. `fonte/systems.css` define os oito ambientes e a galeria. `fonte/hud.css` conserva as camadas de animação da seleção; `fonte/living-systems.css` conserva as quatro animações novas. `fonte/guides.css` contém o painel dos guias. Os metadados dos ambientes estão em `personas.json`.

Os fundos usam SVGs e gradientes locais. Não há novas imagens para baixar, fontes externas, bibliotecas, dependências ou cenas 3D. O HTML permanece autônomo e incorpora as artes já existentes.

## Verificação

- Passaram os 112 testes locais: 52 JavaScript e 60 Python.
- Os oito temas foram selecionados no Chromium, janela de 1363 × 936. Foram confirmadas oito combinações distintas de fundo e superfície, além de nomes e acabamentos próprios.
- Todos os núcleos principais mediram 330 × 330, sem distorção.
- Foram revisadas conexão, campos da API compatível, preferências, dados, ajuda, seleção e confirmação.
- Uma conversa de teste local foi importada pela interface para revisar autoria, tabelas, código e controles. O conteúdo foi removido após a revisão; não acompanha o pacote.
- Os rótulos do Ultron foram conferidos na interface visível. Não houve uso de chave real de provedor.
- Há regras responsivas para telas menores, mas não foi realizado teste em aparelho móvel físico.
