# Humores do João

O humor do João **segue o dado**, nunca a lavoura. Ele reage ao que um número diz sobre o normal do próprio lugar e não quer dizer que um campo está "bom" ou "ruim". Revisão visual: `/joao-moods`.

| Humor | Imagem | Quando aparece | Onde hoje |
|---|---|---|---|
| `neutral` (Explicando) | pronta | Dado informativo, sem sinal especial | Quase todos os comentários |
| `happy` (Animado) | pronta | Tom `good`: solo mais úmido que o normal; poucas pausas de chuva (até 1 em cada 4 anos); previsão acima do normal na época das chuvas | Explorar; blocos "ok" do /results2 e /results3 |
| `alert` (Atento) | pronta | Tom `attention`: solo mais seco que o normal; pausas de chuva em metade dos anos ou mais; previsão abaixo do normal na época das chuvas; solo relatado pelo produtor | Explorar; blocos "atenção" |
| `sad` (Triste) | pronta | Tom `unknown`: o João não conseguiu buscar o dado ou não tem aquela informação | Linhas "Sem dado" |
| `unsure` (Em dúvida) | **FALTA** | "Não sei dizer": efeito local do El Niño, por exemplo | Cartão do El Niño no Explorar |
| `thinking` (Pensando) | **FALTA** | Enquanto os dados carregam | Ainda não usado (o João fica quieto ao carregar) |

Enquanto uma imagem falta, o app usa o João neutro e, em desenvolvimento, mostra uma etiqueta âmbar "Falta arte: …" sobre ele.

## Para entregar uma imagem que falta
1. Mesma pose e proporção das outras, fundo transparente (ou branco, que eu recorto).
2. Gerar com `sharp` para `public/assets/brand/joao/<humor>.webp` (240×360, figura alinhada embaixo).
3. Em `lib/explain/joao-mood.ts`, trocar `src: null` pelo caminho e `status: 'missing'` por `'ready'`.

## Regras de tom (motor `lib/explain/joao.ts`)
- `good`: solo na raiz mais úmido que o normal (±0,05); pausas de chuva em até 25% dos anos; previsão de 7 dias acima do normal (+25%) com a época das chuvas em andamento.
- `attention`: solo mais seco que o normal; pausas de chuva em 50% dos anos ou mais; previsão abaixo do normal (−25%) na época das chuvas.
- `unknown`: dado ausente ou falha na busca.
- Demais casos: `info`.
