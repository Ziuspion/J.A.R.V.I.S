# Usar o Fusion em Android e iPhone

## Abrir no navegador

No telefone, use o endereço HTTPS do aplicativo no Chrome ou Safari. Se o HTML baixado abrir como uma prévia no gerenciador de arquivos, saia da prévia e abra o site no navegador: a prévia não é o ambiente usado nesta revisão. Os arquivos BAT são atalhos para Windows e não se aplicam ao celular.

O pacote contém o aplicativo pronto e as fontes. Não foi publicada uma hospedagem na sua conta nesta entrega. O `index.html` já incorpora as artes, os estilos e os scripts; ele pode ser servido por uma hospedagem estática, sem Python, Node ou banco de dados. A conversa generativa usa a API que você conectar.

## Criar um link sem instalar programas

Uma opção é o GitHub Pages, disponível para repositórios públicos no GitHub Free. Para esta forma de publicar, o conteúdo enviado será público.

1. Na sua conta GitHub, crie um repositório público para o site.
2. Pelo navegador, envie somente o **index.html** desta versão para a raiz do repositório e confirme o envio. As imagens já estão dentro dele. Não envie o ZIP inteiro, arquivos `.env`, backups ou chaves.
3. Entre em **Settings → Pages**.
4. Em **Build and deployment → Source**, selecione **Deploy from a branch**. Escolha o branch que recebeu o arquivo, a pasta **/(root)** e **Save**.
5. Quando a publicação terminar, use **Visit site** e abra o endereço HTTPS no celular. Nas atualizações, substitua esse mesmo `index.html`.

O servidor Python opcional deste pacote continua restrito ao próprio computador. Publicar o HTML estático não publica esse servidor nem habilita as funções exclusivas dele.

Referências do GitHub: [criar o site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) e [configurar a origem](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Conectar e conversar

1. Toque em **Conectar IA**, escolha o provedor e informe sua chave no próprio aplicativo.
2. Toque em **Conectar nesta aba**. Depois envie uma mensagem pela seta.
3. Com teclado de toque e tela de até 980 px, **Enter cria uma linha**. A seta envia. Com teclado de desktop, Enter envia e Shift Enter cria uma linha.
4. O menu no canto superior esquerdo abre conversas, sistemas, dados e preferências. Há um botão para fechá-lo.
5. Para guardar conversas antes de fechar, abra **Conversas e dados → Exportar backup**. A sessão é temporária por padrão. Ao voltar de outra página, confira a conexão: se a chave tiver sido descartada, conecte novamente.

A fonte dos campos de entrada tem pelo menos 16 px na apresentação mobile. A altura acompanha a área visível fornecida pelo navegador; o campo de mensagem cresce até um limite proporcional à tela. Recortes e barra inferior têm espaço reservado. O zoom por pinça permanece disponível.

## Voz e arquivos

O ditado do aplicativo depende do reconhecimento de voz exposto pelo navegador, das permissões e da rede. Se ele não estiver disponível, use a digitação por voz do teclado do telefone. A leitura de respostas usa as vozes oferecidas pelo sistema. Tela cheia só é exibida quando o navegador anuncia suporte ao recurso.

O botão de clipe continua aceitando os formatos indicados no aplicativo. Fotos HEIC de iPhone não são convertidas automaticamente: envie uma cópia JPEG, PNG ou WebP, com até 2 MB. O modelo conectado também precisa aceitar imagens. Backups não incluem os bytes das imagens; conserve os originais para reanexar.

## Conferência em aparelho real

A revisão entregue foi verificada em Chromium com diferentes viewports e testes automatizados. Não houve acesso a Android ou iPhone físicos, Safari real, microfone, seletor de arquivos móvel ou teclado nativo. Faça esta conferência em cada aparelho que for usar:

| Passo | Resultado esperado |
| --- | --- |
| Abrir o link HTTPS em retrato | Cabeçalho, campo e seta ficam acessíveis, sem arrastar a página para os lados |
| Abrir e fechar o menu | Menu permanece utilizável e retorna à conversa |
| Trocar entre os oito sistemas | Tema, arte e apresentação mudam; conversa e rascunho permanecem |
| Abrir seleção, conexão e preferências | Conteúdo rola e o botão de fechar continua alcançável |
| Digitar várias linhas | Campo e seta continuam acima do teclado |
| Fechar o teclado e girar o aparelho | Área da conversa recupera o espaço e o rodapé reaparece |
| Ampliar com dois dedos | Zoom continua disponível; não é tratado como abertura do teclado |
| Abrir DUM-E e U e perguntar sobre backup | Guia responde localmente e pode ser fechado |
| Anexar um JPEG pequeno | Nome/miniatura aparece; é possível remover antes de enviar |
| Exportar e importar um backup de teste | Arquivo aparece no seletor do aparelho e as conversas são restauradas após confirmação |
| Bloquear/desbloquear ou voltar de outra página | Controles voltam a responder; reconectar a chave quando necessário |
| Testar ditado com permissão concedida | Fala vira rascunho para revisão; falha de suporte não impede usar texto |

Se surgir um problema, anote navegador e versão, versão do sistema, orientação da tela e a ação exata. Isso permite reproduzir uma falha específica sem adivinhar a causa.
