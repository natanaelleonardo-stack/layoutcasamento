# Mapa de Mesas — Casamento

Aplicação web estática (HTML/CSS/JS puro, sem build, sem dependências) para
organizar visualmente onde cada convidado vai sentar, arrastando os nomes
sobre a planta baixa do salão.

## Arquivos

```
index.html        estrutura da página
styles.css         todo o visual
app.js             toda a lógica (mesas, drag-and-drop, import/export)
planta-baixa.jpg   imagem de fundo (a planta do salão)
```

## Como usar

1. **Importar convidados** — clique em "Importar lista" e selecione um
   arquivo `.txt` (um nome por linha), `.csv` (nome na primeira coluna,
   com ou sem cabeçalho "Nome"/"Convidado") ou `.json`
   (`["Fulano", "Beltrano"]` ou `[{"nome": "Fulano"}]`).
   Você também pode adicionar convidados um a um pelo campo "+".
2. **Alocar** — arraste o card do convidado (painel esquerdo) até o
   círculo da mesa desejada na planta. O contador da mesa atualiza
   automaticamente (ex.: `4/8`).
3. **Desalocar** — clique na mesa para abrir o painel de detalhes à
   direita e clique no × ao lado do nome, ou arraste o nome de volta
   para o painel esquerdo.
4. **Ajustar capacidade de uma mesa** — dê duplo clique na mesa e informe
   o novo número de lugares.
5. **Mesas externas** — use "+ Mesa externa" para criar mesas extras
   (aparecem numa faixa abaixo da planta, já que são "montadas quando
   necessário").
6. **Exportar** — "Exportar .csv" ou "Exportar .json" baixa o
   mapeamento final (nome do convidado + mesa atribuída).
7. Os dados ficam salvos automaticamente no navegador (localStorage), então
   fechar a aba não perde o trabalho. "Limpar tudo" apaga tudo.
8. **Mover mesas** — clique e arraste qualquer mesa do salão principal
   (não vale para "mesas externas") direto na planta para reposicioná-la.
   A nova posição fica salva no navegador (localStorage) na hora.
9. **Salvar posições** — no menu da engrenagem, clique em "Salvar
   posições". Isso baixa um arquivo `mesas-posicoes.txt` com um bloco de
   código já pronto. Abra o arquivo, copie o conteúdo e cole no lugar do
   array `TABLES` no início do `app.js` (veja a seção "Trocar a planta
   baixa" abaixo para saber exatamente onde fica). Depois é só subir o
   `app.js` atualizado pro GitHub (`git push` ou reenviar pela interface
   web) — assim a posição nova vale pra todo mundo que abrir o site, não
   só no seu navegador.
   > Esse fluxo é manual de propósito: o site é 100% estático (GitHub
   > Pages), então salvar de verdade no repositório sem um passo manual
   > exigiria guardar uma credencial do GitHub dentro do código do
   > site — e qualquer visitante conseguiria ver essa credencial e
   > editar seu repositório. Por isso a forma seguindo é exportar e
   > você mesmo colar/subir.
10. **Desenhar** — no menu da engrenagem, clique em "Desenhar". O painel
   esquerdo troca para as ferramentas: Selecionar/mover, Parede (linha),
   Círculo, Retângulo e Caixa de texto.
   - Parede/Círculo/Retângulo: escolha a ferramenta e clique-arraste na
     planta.
   - Caixa de texto: escolha a ferramenta, clique uma vez na planta e
     digite (clique fora pra salvar, duplo clique depois pra editar de
     novo).
   - Selecionar/mover: clique num desenho pra marcá-lo (fica com brilho
     branco) e arraste pra reposicionar; "Apagar selecionado" ou a tecla
     Delete remove.
   - "Voltar para convidados" ou "Concluir desenho" fecham o painel e
     voltam pro modo normal. Os desenhos ficam salvos junto com o resto.

## Personalizar o cabeçalho

O nome do casal e a data ficam no topo de `index.html`:

```html
<h1 class="topbar__names">Camilli &amp; Allan</h1>
<div class="topbar__date">13 · 09 · 2026</div>
```

Basta editar esse trecho para trocar os nomes ou a data.

## Trocar a planta baixa

O layout das mesas já está calibrado para a imagem `planta-baixa.jpg`
incluída (a planta do salão enviada). Para usar outra imagem:

1. Substitua o arquivo `planta-baixa.jpg` pelo seu (mantenha o nome, ou
   ajuste o `src` em `index.html`).
2. Abra `app.js` e edite o array `TABLES` no topo do arquivo. Cada mesa
   tem `x` e `y` em **porcentagem** da largura/altura da imagem
   (0 a 100), então é possível recalibrar sem mexer em pixels:

   ```js
   { id: '1', label: '1', capacity: 8, x: 13.60, y: 76.55 },
   ```

   Dica rápida para achar a posição: abra a imagem em qualquer editor,
   veja as dimensões em pixels (ex. 1254×992) e a posição do centro da
   mesa (ex. 165, 741), depois calcule:
   `x = 165 / 1254 * 100`, `y = 741 / 992 * 100`.

## Publicar no GitHub Pages

1. Crie um repositório novo no GitHub (pode ser público ou privado, mas
   o GitHub Pages gratuito exige público a menos que você tenha um plano
   pago com Pages para repositórios privados).
2. Suba estes 4 arquivos (`index.html`, `styles.css`, `app.js`,
   `planta-baixa.jpg`) para a raiz do repositório — pode arrastar e
   soltar direto na interface web do GitHub ("Add file" → "Upload
   files"), ou via linha de comando:

   ```bash
   git init
   git add .
   git commit -m "Mapa de mesas do casamento"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```

3. No GitHub, vá em **Settings → Pages**.
4. Em "Build and deployment", selecione **Source: Deploy from a branch**.
5. Em "Branch", escolha `main` e a pasta `/ (root)`, depois **Save**.
6. Aguarde cerca de 1 minuto. O GitHub mostrará o link, algo como:

   ```
   https://SEU-USUARIO.github.io/SEU-REPOSITORIO/
   ```

7. Pronto — a aplicação está no ar. Qualquer atualização futura basta
   dar `git push` de novo (ou reenviar os arquivos pela interface web).

## Observações

- Tudo roda no navegador; nenhum dado é enviado para servidor algum.
- Os dados salvos no navegador ficam por dispositivo/navegador — se
  precisar continuar em outro computador, use "Exportar .json" num
  lugar e depois reimporte a lista de convidados (a alocação de mesas
  não é reimportada automaticamente pelo importador de convidados,
  apenas os nomes — pense no export como o "resultado final" para
  imprimir/compartilhar, não como backup para recarregar).
