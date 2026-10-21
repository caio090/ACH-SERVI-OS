# Assets de marca — ACHÔ SERVIÇO

O Google Drive é a fonte de verdade dos assets, mas **não** é CDN: o app nunca
carrega imagens de `drive.google.com` em runtime. Os arquivos aprovados são
copiados para o repositório e servidos pelo próprio Next.js.

Pasta oficial: https://drive.google.com/drive/folders/1GCmlzhCm7XwzWr4nN4SkKK1GkLd7BUcW
Pasta de mídia: https://drive.google.com/drive/folders/14a-bSxr8ex7XcPIMV-tANrG8n7U5s8v0

## Em uso

| Asset | Arquivo local | Drive file ID | Origem | Observações |
| --- | --- | --- | --- | --- |
| Logo de header | `public/brand/logo-acho-servico-header.png` | `1Ysk0oDdrjW_i6EWJX-3uuptYj8iXUglS` | https://drive.google.com/file/d/1Ysk0oDdrjW_i6EWJX-3uuptYj8iXUglS/view | Cópia byte a byte do original (PNG 2172×724, fundo transparente, SHA-256 `1207c6ab…46bd`). Usado no `Header` via `next/image` (altura 36px mobile / 44px desktop, proporção preservada). |
| Favicon (original) | `public/brand/favicon-acho-servico.png` | `1P3JMD_dQFWcs6gesVJwGyuHshIO13QzF` | https://drive.google.com/file/d/1P3JMD_dQFWcs6gesVJwGyuHshIO13QzF/view | Cópia byte a byte do original (PNG 1254×1254, SHA-256 `dd559d34…05ab`). Mantido como fonte para gerar os ícones. |
| Favicon (aba do navegador) | `src/app/icon.png` | idem acima | — | Mesmo desenho reduzido para 192×192 (redimensionamento bicúbico, sem alteração de proporção). Convenção de arquivo do App Router: o Next gera a tag `<link rel="icon">`. O original tem 511 KB, pesado demais para ícone. |
| Ícone Apple (tela inicial iOS) | `src/app/apple-icon.png` | idem acima | — | Mesmo desenho reduzido para 180×180. |

## Referência (não usar como logo principal)

| Asset | Drive file ID | Observações |
| --- | --- | --- |
| `logo-acho.jpeg` | `1kmRWWC1ciETYaCqNvLIHXqUe9-yXABKS` | Logo antiga com slogan, fundo branco. Substituída pela versão de header acima. Não está no repositório. |

## Como atualizar

1. Substitua o arquivo no Drive (mesmo nome).
2. Baixe e sobrescreva o arquivo local correspondente (não editar/recriar a marca).
3. Para o favicon, gere de novo `src/app/icon.png` (192px) e `src/app/apple-icon.png` (180px) a partir do original.
4. Atualize os hashes desta tabela.
