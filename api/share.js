// api/share.js
export default async function handler(req, res) {
  // Pega o ID do álbum da URL (ex: /api/share?id=123)
  const { id } = req.query;

  if (!id) {
    return res.redirect('/');
  }

  try {
    // Busca os dados do álbum na sua planilha Google
    const sheetApiUrl = 'https://script.google.com/macros/s/AKfycbwaNkmrY33Uf57_U1w5u1DRxNegt1xff9Us5hvicZiMVcXQj4d4Fe-wqwL_tSLdreY/exec';
    const response = await fetch(`${sheetApiUrl}?id=${id}`);
    const data = await response.json();

    if (data.success && data.album) {
      const album = data.album;
      const title = album.clientName || 'Álbum Fotográfico';
      const description = album.subtitle || 'Acesse para ver os melhores momentos.';
      
      // Tenta pegar a imagem de perfil ou a primeira foto do álbum. Se não tiver, usa uma vazia.
      const image = album.profileImage || (album.photos && album.photos[0]) || '';
      
      // A URL real do álbum no seu app React
      const redirectUrl = `/#/album/${id}`;

      // Retorna um HTML puro que o WhatsApp consegue ler perfeitamente
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          
          <!-- Meta Tags Open Graph (Facebook, WhatsApp, LinkedIn) -->
          <meta property="og:type" content="website">
          <meta property="og:title" content="${title}">
          <meta property="og:description" content="${description}">
          <meta property="og:image" content="${image}">
          
          <!-- Meta Tags Twitter -->
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="${title}">
          <meta name="twitter:description" content="${description}">
          <meta name="twitter:image" content="${image}">

          <!-- Redirecionamento imediato para a página do álbum -->
          <script>
            window.location.replace("${redirectUrl}");
          </script>
        </head>
        <body style="background: #111; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; margin: 0;">
          <p>Redirecionando para o álbum...</p>
        </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Erro ao buscar álbum:', error);
  }

  // Se o álbum não for encontrado ou der erro, redireciona para a home
  return res.redirect('/');
}
