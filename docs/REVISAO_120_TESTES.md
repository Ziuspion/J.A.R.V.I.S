# Revisão de seleção e código — 07/11/2026

## Seleção de JARVIS e Friday

Os nomes e subtítulos sobrepostos no centro das duas prévias foram retirados. Os nomes abaixo das imagens, os rótulos acessíveis e os botões de ativação continuam identificando cada sistema. A mudança afeta somente a seleção; o núcleo da tela principal continua como antes.

Não foram geradas novas artes. Todas as PNGs de `assets/art/` e todos os arquivos CSS, incluindo as animações, foram comparados com a versão anterior e são idênticos byte a byte. Em Chromium, as duas prévias mediram 248,5 × 248,5, não continham os elementos de texto central e continuavam com a animação `hud-energy`, cuja opacidade variou entre leituras.

## Resultado dos testes

| Etapa | Resultado |
| --- | --- |
| Suíte original | 112 aprovados: 52 JavaScript e 60 Python |
| Oito regressões adicionais, antes das correções | 5 falharam e 3 passaram |
| Suíte final | **120 aprovados: 60 JavaScript e 60 Python** |

O número é de testes executados, não de bugs encontrados. As cinco falhas novas reproduziam três problemas de código. Os três testes novos que já passavam protegem os comportamentos que as correções precisam preservar.

## Correções confirmadas

| Problema reproduzido | Correção |
| --- | --- |
| Um backup podia manter duas ou mais mensagens com o mesmo identificador. | A normalização atribui outro ID às repetições dentro da conversa, preservando conteúdo, autoria, ordem e IDs válidos. |
| Preços nulos, booleanos ou strings vazias podiam ser convertidos em zero na lista gratuita. | A lista exige zero explícito, numérico ou em formato decimal. Preço ausente ou inválido é excluído. Isso não garante cota ou disponibilidade da conta. |
| Um bloco de rede acima de 600 mil caracteres era recusado antes de separar os eventos, mesmo contendo muitos eventos pequenos válidos. | O limite é aplicado às linhas e ao evento individual, depois da separação do bloco. Eventos grandes continuam recusados e o leitor é liberado. |

## Oito regressões acrescentadas

1. Reparo de IDs repetidos durante a importação, com preservação dos autores e conteúdos.
2. Preservação dos IDs válidos e estabilidade da normalização após o reparo.
3. Recebimento de muitos eventos pequenos em um único bloco acima de 600 KB.
4. Resultado equivalente com diferentes tamanhos de pacote de rede.
5. Recusa de um evento individual excessivo, cancelando e liberando o leitor.
6. Tratamento de comentários e campos SSE sem confundi-los com um grande evento de dados.
7. Exclusão de preços ausentes, nulos e inválidos da lista gratuita.
8. Preservação dos modelos com preços zero explícitos em formatos válidos.

As regressões estão em `testes/test_regressions.js`. A suíte também cobre os adaptadores de IA, cancelamento, preservação de texto parcial, anexos, limites de contexto, restauração, privacidade, armazenamento e servidor opcional.

## Como repetir

Na pasta do projeto:

```text
node --test testes/test_frontend.js testes/test_regressions.js
python -m unittest discover -s testes -p "test_*.py" -v
```

No Windows, `TESTAR_JARVIS.bat` executa as duas suítes quando Python e Node já estão disponíveis. Esses programas são necessários para os testes de desenvolvimento; o HTML pronto continua abrindo sem instalação.

Além dos testes, foram verificados os IDs e ícones referenciados no HTML compilado, a sintaxe JavaScript, a seleção no navegador e a integridade do ZIP. A saída completa dos 60 testes JavaScript está em `RESULTADO_REVISAO_JS.txt`.

Os contratos de provedor usam respostas simuladas. Não houve uso de chave real ou validação de cota de uma conta, nem teste em aparelho móvel físico. A revisão corrige os casos reproduzidos; não comprova ausência de todo bug possível.
