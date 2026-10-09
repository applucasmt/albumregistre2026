import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Camera, Plus, Trash2, Edit3, Link as LinkIcon, Eye,
  PlayCircle, Grid, Download, ArrowRight, Lock,
  Pause, Play, Image as ImageIcon, CheckCircle, X, Loader2,
  Save, FolderUp, MessageCircle, Settings, FileText, Upload, Music, Volume2, VolumeX,
  Video, SkipForward, Scissors, Clock, AlertTriangle, Calendar,
  Share2, LogIn, LogOut, User, Mail,
  LayoutDashboard, DollarSign, Briefcase, Users, Menu, Receipt, MapPin,
  PenTool, ExternalLink, Wallet, Edit, Images
} from 'lucide-react';

/* ============================================================
   BACKEND 1: ÁLBUNS
   ============================================================ */
const CLOUDINARY_CONFIG = {
  cloudName: 'gyzeubzm',
  uploadPreset: 'registre_album',
  folder: 'registre'
};

const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbyYLxM6wufpvZQ4G3c1v1P6rhr3W8_oRL1khbpkPYgVpa1MkqyPZ8So4UxH6yaOapBdeg/exec';

const ADMIN_CREDENTIALS = {
  username: 'registre',
  password: 'registre2026@'
};

/* ============================================================
   BACKEND 2: REGISTRE FOTO
   ============================================================ */
const REGISTRE_API_URL =
  (typeof localStorage !== 'undefined' && localStorage.getItem('REGISTRE_API_URL')) ||
  'https://script.google.com/macros/s/AKfycbzwxGJM8KdcTHnYUGx253YbQDpw3bYMXEVDQDpYRncB7IFPBGX2a3rxFUD6Evb9tO3GGw/exec';

/* ============================================================
   HELPERS ÁLBUNS
   ============================================================ */
function extractDriveId(url) {
  if (!url) return null;
  const patterns = [/\/d\/([a-zA-Z0-9_-]+)/, /id=([a-zA-Z0-9_-]+)/, /\/file\/d\/([a-zA-Z0-9_-]+)/, /open\?id=([a-zA-Z0-9_-]+)/];
  for (const pattern of patterns) { const m = url.match(pattern); if (m) return m[1]; }
  return null;
}
function getDrivePreviewUrl(url) {
  const id = extractDriveId(url);
  if (id) return 'https://drive.google.com/file/d/' + id + '/preview';
  return url;
}
function detectVideoOrientation(url) {
  if (!url) return 'vertical';
  if (url.toLowerCase().indexOf('horizontal') !== -1 || url.toLowerCase().indexOf('landscape') !== -1) return 'horizontal';
  return 'vertical';
}
function uploadVideoToCloudinary(file, albumId) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', CLOUDINARY_CONFIG.folder + '/' + albumId);
    xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CONFIG.cloudName + '/video/upload', true);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        try { const e = JSON.parse(xhr.responseText); reject(new Error(e.error?.message || 'Erro no upload do video')); }
        catch (_) { reject(new Error('Erro no upload do video: ' + xhr.status)); }
      }
    };
    xhr.onerror = () => reject(new Error('Erro de rede ao enviar video'));
    xhr.send(formData);
  });
}
function uploadAudioToCloudinary(file, albumId) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', CLOUDINARY_CONFIG.folder + '/' + albumId);
    xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CONFIG.cloudName + '/video/upload', true);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        try { const e = JSON.parse(xhr.responseText); reject(new Error(e.error?.message || 'Erro no upload do audio')); }
        catch (_) { reject(new Error('Erro no upload do audio: ' + xhr.status)); }
      }
    };
    xhr.onerror = () => reject(new Error('Erro de rede ao enviar audio'));
    xhr.send(formData);
  });
}
async function uploadToCloudinary(file, albumId, resourceType = 'image') {
  if (typeof file === 'string' && file.startsWith('http') && file.indexOf('cloudinary') !== -1) return file;
  if (resourceType === 'video' && file instanceof File) return await uploadVideoToCloudinary(file, albumId);
  if (resourceType === 'audio' && file instanceof File) return await uploadAudioToCloudinary(file, albumId);
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', CLOUDINARY_CONFIG.folder + '/' + albumId);
    const response = await fetch('https://api.cloudinary.com/v1_1/' + CLOUDINARY_CONFIG.cloudName + '/image/upload', { method: 'POST', body: formData });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error?.message || 'Erro no upload da imagem'); }
    const data = await response.json();
    return data.secure_url;
  } catch (error) { console.error('Erro no upload da imagem:', error); throw error; }
}
function getOptimizedVideoUrl(videoUrl) {
  if (!videoUrl || !videoUrl.includes('cloudinary')) return videoUrl;
  return videoUrl.replace('/upload/', '/upload/f_auto,q_auto/');
}
function updateFavicon(photoUrl) {
  if (!photoUrl) return;
  const existing = document.querySelector('link[rel="icon"]');
  if (existing) existing.remove();
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.beginPath(); ctx.arc(16,16,16,0,Math.PI*2); ctx.closePath(); ctx.clip();
    ctx.drawImage(img,0,0,32,32);
    const fav = document.createElement('link'); fav.rel='icon'; fav.type='image/png'; fav.href=canvas.toDataURL('image/png');
    document.head.appendChild(fav);
  };
  img.onerror = () => {
    const fav = document.createElement('link'); fav.rel='icon';
    fav.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📸</text></svg>';
    document.head.appendChild(fav);
  };
  img.src = photoUrl;
}
function updateMetaTags(album) {
  if (!album) return;
  const photoUrl = album.profileImage || (album.photos && album.photos[0]) || '';
  document.title = album.clientName || 'Album';
  const metaTags = [
    { property: 'og:title', content: album.clientName || '' },
    { property: 'og:image', content: photoUrl },
    { name: 'description', content: album.subtitle || '' }
  ];
  metaTags.forEach(tag => {
    let meta;
    if (tag.property) {
      meta = document.querySelector('meta[property="' + tag.property + '"]');
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute('property', tag.property); }
    } else {
      meta = document.querySelector('meta[name="' + tag.name + '"]');
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', tag.name); }
    }
    meta.setAttribute('content', tag.content);
    if (!meta.parentNode) document.head.appendChild(meta);
  });
  updateFavicon(photoUrl);
}

const saveAlbumToSheets = async (album) => { try { const r = await fetch(SHEETS_API_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'save', id: album.shortId, album }) }); return (await r.json()).success; } catch (e) { return false; } };
const deleteAlbumFromSheets = async (shortId) => { try { const r = await fetch(SHEETS_API_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'delete', id: shortId }) }); return (await r.json()).success; } catch (e) { return false; } };
const loadAlbumFromSheets = async (shortId) => { try { const r = await fetch(SHEETS_API_URL + '?id=' + shortId); const d = await r.json(); return d.success && d.album ? d.album : null; } catch (e) { return null; } };
const loadAllAlbumsFromSheets = async () => { try { const r = await fetch(SHEETS_API_URL); const d = await r.json(); return d.success && d.albums ? d.albums : {}; } catch (e) { return {}; } };
const generateShortId = () => Math.random().toString(36).substring(2, 8);
const sendEmailFromSheets = async (album) => { try { const r = await fetch(SHEETS_API_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'send_email', id: album.shortId, album, baseUrl: window.location.origin }) }); return (await r.json()).success; } catch (e) { return false; } };

function isAlbumExpired(album) { if (!album) return false; if (album._isExpired === true || album._assetsDeleted === true) return true; if (album.expiryDate) { return new Date() > new Date(album.expiryDate); } return false; }
function formatExpiryDate(album) { const s = album._expiryDate || album.expiryDate; if (!s) return null; try { return new Date(s).toLocaleDateString('pt-BR'); } catch (e) { return s; } }
function getDaysRemaining(album) { const s = album._expiryDate || album.expiryDate; if (!s) return null; try { return Math.ceil((new Date(s).getTime() - new Date().getTime()) / (1000*60*60*24)); } catch (e) { return null; } }

async function sharePhoto(photoUrl, album) {
  try {
    const response = await fetch(photoUrl);
    const blob = await response.blob();
    const file = new File([blob], 'foto.jpg', { type: 'image/jpeg' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Foto do album ' + (album.clientName || 'Album'), text: 'Olha essa foto do album "' + (album.clientName || 'Album') + '"! 📸' });
    } else if (navigator.share) {
      await navigator.share({ title: 'Foto do album ' + (album.clientName || 'Album'), text: 'Olha essa foto do album! 📸', url: photoUrl });
    } else {
      const text = encodeURIComponent('Olha essa foto do album "' + (album.clientName || 'Album') + '"! 📸');
      window.open('https://wa.me/?text=' + text + '%20' + encodeURIComponent(photoUrl), '_blank');
    }
  } catch (error) { console.log('Compartilhamento cancelado:', error); }
}

/* ============================================================
   HELPERS REGISTRE FOTO
   ============================================================ */
const formatDateBR = (v) => {
  if (!v) return '';
  const d = new Date(typeof v === 'string' && v.length === 10 ? v + 'T00:00:00' : v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString('pt-BR');
};
const formatarDataHora = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  const date = d.toLocaleDateString('pt-BR');
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return time === '00:00' ? date : `${date} às ${time}`;
};
const toNumber = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  let s = String(v).trim();
  if (/^(nan|#error!|#n\/a|#div\/0!|#value!|#ref!|#name\?|undefined|null)$/i.test(s)) return 0;
  s = s.replace(/[R$\s]/g, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};
const formatBRL = (v) => `R$ ${toNumber(v).toFixed(2)}`;

const registreFetchData = async (sheet) => {
  if (!REGISTRE_API_URL) return [];
  try {
    const res = await fetch(`${REGISTRE_API_URL}?action=read&sheet=${encodeURIComponent(sheet)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.status === 'success' ? (json.data || []) : [];
  } catch (e) { console.error(`Erro buscar ${sheet}:`, e); return []; }
};

const registreSendSingle = async (sheet, data, action = 'create') => {
  if (!REGISTRE_API_URL) return { ok: false, error: 'URL não configurada' };
  try {
    const res = await fetch(`${REGISTRE_API_URL}?action=${action}&sheet=${encodeURIComponent(sheet)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 200)}` };
    }
    const json = await res.json().catch(() => ({}));
    return { ok: json.status === 'success' || res.ok, data: json.data, raw: json };
  } catch (e) { return { ok: false, error: e.message }; }
};

/* ============================================================
   IFRAME: CONTRATO COMPLETO
   ============================================================ */
const buildContractIframeHtml = () => `
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Gerador de Contrato</title>
<style>
body { font-family: Arial, sans-serif; margin: 0; color: #333; background-color: #f0f0f0; display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 20px; gap: 20px; }
.input-form { background-color: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); width: 380px; flex-shrink: 0; margin: 0 auto; }
.input-form h2 { text-align: center; color: #000; margin-bottom: 25px; }
.input-group { margin-bottom: 15px; display: none; }
.input-group.active { display: block; }
.input-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; }
.input-group input, .input-group select { width: calc(100% - 20px); padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 15px; box-sizing: border-box; }
.input-group input[readonly] { background-color: #e9e9e9; cursor: not-allowed; }
.navigation-buttons { display: flex; justify-content: space-between; margin-top: 20px; }
.controls { text-align: center; margin-top: 25px; display: flex; flex-direction: column; gap: 10px; }
.controls button, .navigation-buttons button { padding: 10px 20px; font-size: 16px; cursor: pointer; background-color: #4CAF50; color: white; border: none; border-radius: 5px; }
.controls button:hover, .navigation-buttons button:hover { background-color: #45a049; }
.controls button.secondary, .navigation-buttons button.secondary { background-color: #007bff; }
.navigation-buttons button:disabled { background-color: #cccccc; cursor: not-allowed; }
.contract-wrapper { display: flex; flex-direction: column; align-items: center; overflow: hidden; padding: 10px; background-color: #f0f0f0; width: 100%; max-width: 210mm; margin: 0 auto; }
.contract-page { width: 210mm; min-height: 297mm; background-color: #fff; position: relative; padding: 80px 30mm 30mm 30mm; box-sizing: border-box; background-image: url('https://i.ibb.co/d0Xm59RN/backgropund.png'); background-size: 100% 100%; background-repeat: no-repeat; background-position: center; margin-bottom: 10px; overflow: hidden; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; }
h1 { text-align: center; color: #000; font-size: 18px; margin: 0 0 20px; }
.section-title { font-weight: bold; margin-top: 10px; margin-bottom: 5px; color: #000; font-size: 13px; }
.text-block { margin-bottom: 8px; }
.text-block p { margin: 2px 0; }
.indent { margin-left: 15px; }
.signature-block { margin-top: 40px; display: flex; justify-content: space-around; text-align: center; }
.signature { border-top: 1px solid #000; padding-top: 5px; width: 45%; }
@media (max-width: 1024px) { body { flex-direction: column; align-items: center; padding: 10px; } .input-form { width: 95%; max-width: 450px; } .contract-wrapper { width: 100%; overflow-x: auto; } }
@media print { .input-form, .navigation-buttons, .controls { display: none; } .contract-wrapper { transform: none !important; } .contract-page { width: 210mm; height: 297mm; overflow: hidden; } .contract-page:not(:last-child) { page-break-after: always; } }
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
</head><body>
<div class="input-form">
<h2>Preencher Detalhes do Contrato</h2>
<div class="input-group" data-step="1"><label>Nome do Contratante:</label><input type="text" id="contratanteNome" placeholder="Nome Completo do Cliente"></div>
<div class="input-group" data-step="2"><label>Endereço do Evento:</label><input type="text" id="contratanteEndereco" placeholder="Endereço Completo do Evento"></div>
<div class="input-group" data-step="3"><label>Email do Contratante:</label><input type="text" id="contratanteEmail" placeholder="email@exemplo.com"></div>
<div class="input-group" data-step="4"><label>Tipo de Evento:</label><select id="tipoEvento">
<option value="">Selecione o tipo de evento</option>
<option value="Aniversário Infantil">Aniversário Infantil</option>
<option value="Aniversário Adulto">Aniversário Adulto</option>
<option value="Casamento Civil">Casamento Civil</option>
<option value="Casamento Civil + Cerimônia + Recepção">Casamento Civil + Cerimônia + Recepção</option>
<option value="Cerimônia + Recepção">Cerimônia + Recepção</option>
<option value="Formatura">Formatura</option>
<option value="Batizado">Batizado</option>
<option value="Cultos Diversos">Cultos Diversos</option>
<option value="Pré-Wedding Chapada dos Guimarães">Pré-Wedding Chapada dos Guimarães</option>
<option value="Pré-Wedding + Casamento Civil">Pré-Wedding + Casamento Civil</option>
<option value="Pré-Wedding + Casamento Civil + Cerimônia + Recepção">Pré-Wedding + Casamento Civil + Cerimônia + Recepção</option>
<option value="Pré-Wedding + Cerimônia">Pré-Wedding + Cerimônia</option>
<option value="Ensaio Individual">Ensaio Individual</option>
</select></div>
<div class="input-group" data-step="5"><label>Com vídeo?</label><input type="checkbox" id="incluirVideo"> Sim</div>
<div class="input-group" data-step="6"><label>Data do Evento:</label><input type="date" id="dataEvento"></div>
<div class="input-group" data-step="7"><label>Hora do Evento:</label><input type="time" id="horaEvento"></div>
<div class="input-group" data-step="8"><label>Duração do Serviço (horas):</label><input type="number" id="duracaoServico" step="0.5" min="0.5"></div>
<div class="input-group" data-step="9"><label>Valor Total (R$):</label><input type="text" id="valorTotal" placeholder="0,00"></div>
<div class="input-group" data-step="10"><label>Forma de Pagamento:</label><select id="formaPagamento"></select></div>
<div class="input-group" data-step="11" style="display:none;"><label>Valor de Entrada (R$):</label><input type="number" id="valorEntrada" placeholder="0.00" step="0.01" min="0"></div>
<div class="input-group" data-step="12" style="display:none;"><label>Data da Entrada:</label><input type="date" id="dataEntrada"></div>
<div class="input-group" data-step="13"><label>Datas de Pagamento:</label><input type="text" id="dataPagamentoVisualizacao" readonly></div>
<div class="input-group" data-step="14"><label>Local do Contrato:</label><input type="text" id="localContrato" placeholder="Cidade/Estado"></div>
<div class="navigation-buttons"><button class="secondary" id="backButton" onclick="showPreviousStep()" disabled>Anterior</button><button id="nextButton" onclick="handleNextStep()">Próximo</button></div>
<div class="controls" id="finalControls" style="display:none;"><button onclick="downloadPdf()">Baixar PDF</button><button class="secondary" onclick="addEventToGoogleCalendar()">Agendar Cobertura</button></div>
</div>
<div class="contract-wrapper" id="contractWrapper"><div id="contractContent">
<div class="contract-page">
<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS</h1>
<div class="text-block">
<p><span class="section-title">CONTRATANTE:</span> <span id="displayContratanteNome"></span>, residente no <span id="displayContratanteEndereco"></span>, e-mail: <span id="displayContratanteEmail"></span></p>
<p><span class="section-title">CONTRATADO:</span> Registre Fotografias, representado por Lucas Rocha, residente em Várzea Grande - MT, e-mail: lucasrochafotografias@gmail.com</p>
</div>
<div class="text-block"><p>As partes acima identificadas celebram o presente contrato de prestação de serviços fotográficos, conforme as cláusulas e condições a seguir:</p></div>
<div class="section-title">RESUMO DO SERVIÇO</div>
<div class="text-block indent">
<p>- Tipo de evento: <span id="displayTipoEvento"></span></p>
<p>- Data do evento: <span id="displayDataEvento"></span></p>
<p>- Hora do evento: <span id="displayHoraEvento"></span></p>
<p>- Duração: <span id="displayDuracaoServico"></span></p>
<p>- Valor total: <span id="displayValorTotalContrato"></span></p>
<p>- Pagamento: <span id="displayDataPagamento"></span></p>
<p>- Entrega: Até 7 dias úteis após o evento</p>
<p>- Forma de entrega: Link digital</p>
</div>
<div class="section-title">1. OBJETIVO DO CONTRATO</div>
<div class="text-block"><p>Este contrato tem como objetivo a prestação de serviços de fotografia <span id="objetivoVideoAdicional"></span> por parte do CONTRATADO para o evento do CONTRATANTE, conforme briefing acordado entre as partes.</p></div>
<div class="section-title">2. SERVIÇOS INCLUÍDOS</div>
<div class="text-block indent"><p>- Cobertura fotográfica <span id="servicosVideoAdicional"></span> do evento;</p><p>- Edição de imagens com padrão;</p><p>- Entrega digital do material finalizado.</p></div>
<div class="section-title">3. SERVIÇOS NÃO INCLUÍDOS</div>
<div class="text-block"><p>O CONTRATADO não realiza serviços de design gráfico, animações ou divulgação do material produzido, salvo acordo adicional.</p></div>
<div class="section-title">4. BRIEFING E COMUNICAÇÃO</div>
<div class="text-block"><p>As especificações detalhadas do evento serão definidas em briefing conjunto. Toda comunicação será feita por WhatsApp, e-mail ou redes sociais autorizadas, em horários comerciais.</p></div>
<div class="section-title">5. HORÁRIOS E EXCEDENTES</div>
<div class="text-block indent"><p>- A duração do serviço é de <span id="displayDuracaoServico2"></span> horas.</p><p>- Horas extras serão cobradas à parte, a R$ 50,00 por hora adicional.</p><p>- Solicitações feitas com menos de 2 dias de antecedência estarão sujeitas a taxa extra de 30%.</p></div>
<div class="section-title">6. ENTREGA E PRAZOS</div>
<div class="text-block indent"><p>- O material será entregue até 7 dias úteis após o evento, por link digital.</p><p>- A seleção das fotos pelo CONTRATANTE deve ocorrer em até 7 dias após o envio. O atraso pode comprometer o cronograma de entrega.</p></div>
<div class="section-title">7. REFAÇÕES E AJUSTES</div>
<div class="text-block indent"><p>- 1 (uma) refação está inclusa sem custo.</p><p>- Refações adicionais: R$ 50,00 cada.</p></div>
</div>
<div class="contract-page">
<div class="section-title">8. DIREITOS E ARQUIVOS</div>
<div class="text-block indent"><p>- O CONTRATADO manterá backup por 15 dias após a entrega. Somente os arquivos editados serão entregues.</p><p>- Os arquivos brutos não serão disponibilizados, salvo negociação.</p><p>- O CONTRATADO poderá usar as imagens para portfólio, salvo objeção expressa do CONTRATANTE.</p></div>
<div class="section-title">9. CANCELAMENTO E MULTAS</div>
<div class="text-block indent"><p>- Cancelamentos com até 48h de antecedência: retenção de até 30% do valor.</p><p>- Cancelamento após serviço iniciado: não há reembolso.</p><p>- Cancelamento pelo CONTRATADO: devolução integral ou reagendamento.</p></div>
<div class="section-title">10. INADIMPLEMENTO</div>
<div class="text-block indent"><p>- Atraso no pagamento implica multa de 10%, juros de 1% ao mês e correção monetária.</p><p>- Em caso de cobrança judicial, aplica-se 20% de honorários advocatícios.</p></div>
<div class="section-title">11. VALOR E PAGAMENTO</div>
<div class="text-block indent" id="paymentDetails"></div>
<div class="section-title">12. DISPOSIÇÕES FINAIS</div>
<div class="text-block indent"><p>- As partes elegem o foro da comarca de <span id="displayLocalContrato"></span> para dirimir quaisquer dúvidas.</p><p>- Firmado em 2 vias de igual teor.</p></div>
<div class="text-block"><p>Local e data:</p><p><span id="displayDataAssinaturaDia"></span> de <span id="displayDataAssinaturaMes"></span> de <span id="displayDataAssinaturaAno"></span>.</p></div>
<div class="signature-block"><div class="signature"><p>Assinatura do CONTRATADO</p><p>Registre Fotografias</p></div><div class="signature"><p>Assinatura do CONTRATANTE</p><p><span id="displayContratanteNome2"></span></p></div></div>
</div>
</div></div>
<script>
const A4_WIDTH_MM = 210, MM_TO_PX_RATIO = 3.77953, PADDING_PX = 20;
let currentStep = 1;
const totalSteps = 14;
function areCurrentStepFieldsValid() {
  const g = document.querySelector('.input-group[data-step="' + currentStep + '"]');
  if (!g) return true;
  const inputs = g.querySelectorAll('input:not([readonly]):not([type="hidden"]):not([type="checkbox"]), select');
  for (const input of inputs) {
    if ((input.tagName === 'SELECT' && !input.value) || (input.type !== 'number' && input.type !== 'checkbox' && !input.value.trim())) return false;
    if (input.type === 'number' && (isNaN(parseFloat(input.value)) || parseFloat(input.value) < 0)) return false;
  }
  return true;
}
function showStep(n) {
  document.querySelectorAll('.input-group').forEach(g => {
    const s = parseInt(g.dataset.step);
    const fp = document.getElementById('formaPagamento').value;
    if (s === n) { g.classList.add('active'); const fi = g.querySelector('input, select'); if (fi) fi.focus(); }
    else g.classList.remove('active');
    if (s === 11 || s === 12) g.style.display = fp.includes('entrada_parcela') ? 'block' : 'none';
  });
  document.getElementById('backButton').disabled = (n === 1);
  document.getElementById('nextButton').disabled = !areCurrentStepFieldsValid() || (n === totalSteps);
  document.getElementById('finalControls').style.display = (n === totalSteps) ? 'flex' : 'none';
  updateContract();
}
function handleNextStep() {
  if (areCurrentStepFieldsValid()) {
    if (currentStep === 10 && !document.getElementById('formaPagamento').value.includes('entrada_parcela')) currentStep += 3;
    else currentStep++;
    if (currentStep <= totalSteps) showStep(currentStep);
  } else alert('Preencha todos os campos obrigatórios.');
}
function showPreviousStep() {
  if (currentStep === 13 && !document.getElementById('formaPagamento').value.includes('entrada_parcela')) currentStep -= 3;
  else currentStep--;
  if (currentStep >= 1) showStep(currentStep);
}
function formatDate(ds) {
  if (!ds) return '';
  const d = new Date(ds + 'T00:00:00');
  if (isNaN(d.getTime())) return ds;
  return String(d.getUTCDate()).padStart(2,'0') + '/' + String(d.getUTCMonth()+1).padStart(2,'0') + '/' + d.getUTCFullYear();
}
function calculateValue() {
  const tipo = document.getElementById('tipoEvento').value;
  const duracao = parseFloat(document.getElementById('duracaoServico').value) || 0;
  const video = document.getElementById('incluirVideo').checked;
  let valor = 0;
  const precos = {
    "Casamento Civil": 250, "Casamento Civil + Cerimônia + Recepção": 650,
    "Cerimônia + Recepção": 450, "Batizado": 350, "Cultos Diversos": 250,
    "Pré-Wedding Chapada dos Guimarães": 850, "Pré-Wedding + Casamento Civil": 550,
    "Pré-Wedding + Casamento Civil + Cerimônia + Recepção": 900, "Pré-Wedding + Cerimônia": 550
  };
  if (precos[tipo]) valor = precos[tipo];
  else if (tipo === "Aniversário Infantil") {
    if (video) valor = 400;
    else if (duracao === 1) valor = 180;
    else if (duracao > 0 && duracao <= 2.5) valor = 350;
    else if (duracao > 2.5) valor = duracao * 150;
  } else if (["Aniversário Adulto", "Formatura", "Ensaio Individual"].includes(tipo)) {
    if (duracao === 1) valor = 180;
    else if (duracao > 0 && duracao <= 2.5) valor = 350;
    else if (duracao > 2.5) valor = duracao * 150;
  }
  if (video && tipo !== "Aniversário Infantil") valor += 100;
  document.getElementById('valorTotal').value = valor.toFixed(2).replace('.', ',');
  updateContract();
}
function updatePaymentOptions() {
  const dt = document.getElementById('dataEvento').value;
  const sel = document.getElementById('formaPagamento');
  sel.innerHTML = '<option value="">Escolha a forma de pagamento</option>';
  if (!dt || isNaN(new Date(dt))) return;
  const today = new Date();
  const ev = new Date(dt + 'T00:00:00');
  sel.innerHTML += '<option value="a_vista_hoje">À vista hoje</option>';
  sel.innerHTML += '<option value="a_vista_evento">À vista no dia do evento</option>';
  const diff = Math.ceil((ev - today) / (1000*60*60*24*30.44));
  if (diff >= 1) {
    const max = Math.min(diff, 48);
    for (let i = 1; i <= max; i++) sel.innerHTML += '<option value="entrada_parcela_' + i + '">Entrada + ' + i + ' parcela' + (i > 1 ? 's' : '') + '</option>';
  }
}
function updatePaymentSchedule() {
  const fp = document.getElementById('formaPagamento').value;
  const vt = parseFloat(document.getElementById('valorTotal').value.replace(',', '.')) || 0;
  const dPV = document.getElementById('dataPagamentoVisualizacao');
  const pD = document.getElementById('paymentDetails');
  pD.innerHTML = '';
  if (vt <= 0) { dPV.value = 'Valor total inválido.'; return; }
  const dt = document.getElementById('dataEvento').value;
  let txt = '', det = '';
  if (fp === 'a_vista_hoje') {
    const today = new Date();
    txt = 'À vista: R$ ' + vt.toFixed(2).replace('.', ',') + ' em ' + formatDate(today.toISOString().split('T')[0]);
    det = '<p>- Valor total: R$ ' + vt.toFixed(2).replace('.', ',') + '</p><p>- Pagamento: À vista.</p>';
  } else if (fp === 'a_vista_evento') {
    txt = 'À vista: R$ ' + vt.toFixed(2).replace('.', ',') + ' em ' + formatDate(dt);
    det = '<p>- Valor total: R$ ' + vt.toFixed(2).replace('.', ',') + '</p><p>- Pagamento no dia do evento.</p>';
  } else if (fp.startsWith('entrada_parcela_')) {
    const ve = parseFloat(document.getElementById('valorEntrada').value.replace(',', '.')) || 0;
    const de = document.getElementById('dataEntrada').value;
    const np = parseInt(fp.split('_')[2]);
    const rest = vt - ve;
    if (rest < 0) txt = 'Erro: entrada maior que total.';
    else {
      const vp = rest / np;
      txt = 'Entrada: R$ ' + ve.toFixed(2).replace('.', ',') + ' em ' + (formatDate(de) || 'a definir');
      det = '<p>- Valor total: R$ ' + vt.toFixed(2).replace('.', ',') + '</p><p>- Entrada: R$ ' + ve.toFixed(2).replace('.', ',') + '.</p>';
      for (let i = 1; i <= np; i++) {
        txt += '\\nParcela ' + i + ': R$ ' + vp.toFixed(2).replace('.', ',') + ' em ' + formatDate(dt);
        det += '<p>- Parcela ' + i + ': R$ ' + vp.toFixed(2).replace('.', ',') + '.</p>';
      }
    }
  } else txt = 'Selecione uma forma de pagamento.';
  dPV.value = txt;
  pD.innerHTML = det;
  updateContract();
}
function updateContract() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('displayContratanteNome', document.getElementById('contratanteNome').value);
  set('displayContratanteEndereco', document.getElementById('contratanteEndereco').value);
  set('displayContratanteEmail', document.getElementById('contratanteEmail').value);
  set('displayTipoEvento', document.getElementById('tipoEvento').value);
  set('displayDataEvento', formatDate(document.getElementById('dataEvento').value));
  set('displayHoraEvento', document.getElementById('horaEvento').value);
  set('displayDuracaoServico', document.getElementById('duracaoServico').value + ' horas');
  set('displayValorTotalContrato', 'R$ ' + document.getElementById('valorTotal').value);
  set('displayDuracaoServico2', document.getElementById('duracaoServico').value);
  set('displayLocalContrato', document.getElementById('localContrato').value);
  set('displayContratanteNome2', document.getElementById('contratanteNome').value);
  const dp = document.getElementById('displayDataPagamento');
  if (dp) dp.innerHTML = document.getElementById('dataPagamentoVisualizacao').value.replace(/\\n/g, '<br>');
  const v = document.getElementById('incluirVideo').checked;
  set('objetivoVideoAdicional', v ? 'e produção de vídeo resumo' : '');
  set('servicosVideoAdicional', v ? 'e vídeo resumo' : '');
  const today = new Date();
  set('displayDataAssinaturaDia', String(today.getDate()).padStart(2,'0'));
  set('displayDataAssinaturaMes', today.toLocaleString('pt-BR', { month: 'long' }));
  set('displayDataAssinaturaAno', today.getFullYear());
}
function downloadPdf() {
  const el = document.getElementById('contractContent');
  const opt = { margin: 0, filename: 'contrato_servicos_fotograficos.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
  html2pdf().set(opt).from(el).save();
}
function addEventToGoogleCalendar() {
  const dt = document.getElementById('dataEvento').value;
  const hr = document.getElementById('horaEvento').value;
  const dr = parseFloat(document.getElementById('duracaoServico').value);
  const tp = document.getElementById('tipoEvento').value;
  const nm = document.getElementById('contratanteNome').value;
  const em = document.getElementById('contratanteEmail').value;
  const en = document.getElementById('contratanteEndereco').value;
  const vl = document.getElementById('valorTotal').value;
  if (!dt || !hr || isNaN(dr) || dr <= 0) { alert('Preencha data, hora e duração.'); return; }
  const sd = new Date(dt + 'T' + hr + ':00');
  const ed = new Date(sd.getTime() + dr * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().replace(/-|:|\\.\\d{3}/g, '').slice(0, 15) + 'Z';
  const title = 'Cobertura Fotográfica - ' + tp + ' - ' + nm;
  const desc = 'Evento: ' + tp + '\\nCliente: ' + nm + '\\nEmail: ' + em + '\\nLocal: ' + en + '\\nDuração: ' + dr + 'h\\nValor: R$ ' + vl;
  const url = 'https://www.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + fmt(sd) + '/' + fmt(ed) + '&details=' + encodeURIComponent(desc) + '&location=' + encodeURIComponent(en) + '&add=' + encodeURIComponent(em) + ',' + encodeURIComponent('contratosregistre@gmail.com');
  window.open(url, '_blank');
}
document.addEventListener('DOMContentLoaded', () => {
  showStep(currentStep);
  document.querySelectorAll('input:not(#dataEvento), select').forEach(input => {
    input.addEventListener('input', () => {
      if (['tipoEvento', 'duracaoServico', 'incluirVideo'].includes(input.id)) calculateValue();
      if (['formaPagamento', 'valorEntrada', 'dataEntrada', 'valorTotal'].includes(input.id)) updatePaymentSchedule();
      updateContract();
      document.getElementById('nextButton').disabled = !areCurrentStepFieldsValid() || (currentStep === totalSteps);
    });
  });
  document.getElementById('dataEvento').addEventListener('change', () => {
    updatePaymentOptions();
    updateContract();
    document.getElementById('nextButton').disabled = !areCurrentStepFieldsValid() || (currentStep === totalSteps);
  });
  updatePaymentOptions();
  updatePaymentSchedule();
  updateContract();
  window.dispatchEvent(new Event('resize'));
});
window.addEventListener('resize', () => {
  const w = document.getElementById('contractWrapper'), c = document.getElementById('contractContent');
  if (!w || !c) return;
  if (window.innerWidth <= 1024) {
    const av = w.offsetWidth - (2 * PADDING_PX);
    const orig = A4_WIDTH_MM * MM_TO_PX_RATIO;
    const sc = av < orig ? av / orig : 1;
    c.style.transform = 'scale(' + sc + ')';
    c.style.transformOrigin = 'top center';
  } else c.style.transform = 'scale(1)';
});
<\/script>
</body></html>
`;

/* ============================================================
   IFRAME: ORÇAMENTO COMPLETO
   ============================================================ */
const buildOrcamentoIframeHtml = () => `
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Gerador de Orçamento</title>
<style>
body { font-family: Arial, sans-serif; margin: 0; color: #333; background-color: #f0f0f0; display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 20px; gap: 20px; }
.input-form { background-color: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); width: 380px; flex-shrink: 0; margin: 0 auto; }
.input-form h2 { text-align: center; color: #000; margin-bottom: 25px; }
.input-group { margin-bottom: 15px; display: none; }
.input-group.active { display: block; }
.input-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; }
.input-group input, .input-group select { width: calc(100% - 20px); padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 15px; box-sizing: border-box; }
.input-group input[readonly] { background-color: #e9e9e9; cursor: not-allowed; }
.navigation-buttons { display: flex; justify-content: space-between; margin-top: 20px; }
.controls { text-align: center; margin-top: 25px; display: flex; flex-direction: column; gap: 10px; }
.controls button, .navigation-buttons button { padding: 10px 20px; font-size: 16px; cursor: pointer; background-color: #4CAF50; color: white; border: none; border-radius: 5px; }
.controls button:hover, .navigation-buttons button:hover { background-color: #45a049; }
.controls button.secondary, .navigation-buttons button.secondary { background-color: #007bff; }
.navigation-buttons button:disabled { background-color: #cccccc; cursor: not-allowed; }
.contract-wrapper { display: flex; flex-direction: column; align-items: center; overflow: hidden; padding: 10px; width: 100%; max-width: 210mm; margin: 0 auto; }
.contract-page { width: 210mm; min-height: 297mm; background-color: #fff; position: relative; padding: 80px 30mm 30mm 30mm; box-sizing: border-box; background-image: url('https://i.ibb.co/d0Xm59RN/backgropund.png'); background-size: 100% 100%; background-repeat: no-repeat; background-position: center; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; }
h1 { text-align: center; color: #000; font-size: 18px; margin: 0 0 20px; }
.section-title { font-weight: bold; margin-top: 10px; margin-bottom: 5px; color: #000; font-size: 13px; }
.text-block { margin-bottom: 8px; }
.text-block p { margin: 2px 0; }
.indent { margin-left: 15px; }
.signature-block { margin-top: 40px; display: flex; justify-content: space-around; text-align: center; }
.signature { border-top: 1px solid #000; padding-top: 5px; width: 45%; }
@media (max-width: 1024px) { body { flex-direction: column; align-items: center; padding: 10px; } .input-form { width: 95%; max-width: 450px; } .contract-wrapper { width: 100%; overflow-x: auto; } }
@media print { .input-form, .navigation-buttons, .controls { display: none; } .contract-wrapper { transform: none !important; } .contract-page { width: 210mm; height: 297mm; overflow: hidden; } }
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
</head><body>
<div class="input-form">
<h2>Preencher Orçamento</h2>
<div class="input-group" data-step="1"><label>Nome do Cliente:</label><input type="text" id="clienteNome" placeholder="Nome Completo"></div>
<div class="input-group" data-step="2"><label>Endereço/Local do Evento:</label><input type="text" id="clienteEndereco" placeholder="Endereço Completo"></div>
<div class="input-group" data-step="3"><label>Email do Cliente:</label><input type="text" id="clienteEmail" placeholder="email@exemplo.com"></div>
<div class="input-group" data-step="4"><label>Serviço:</label><select id="tipoEvento">
<option value="">Selecione o serviço</option>
<option value="Aniversário Infantil">Aniversário Infantil</option>
<option value="Aniversário Adulto">Aniversário Adulto</option>
<option value="Casamento Civil">Casamento Civil</option>
<option value="Casamento Civil + Cerimônia + Recepção">Casamento Civil + Cerimônia + Recepção</option>
<option value="Cerimônia + Recepção">Cerimônia + Recepção</option>
<option value="Formatura">Formatura</option>
<option value="Batizado">Batizado</option>
<option value="Cultos Diversos">Cultos Diversos</option>
<option value="Pré-Wedding Chapada dos Guimarães">Pré-Wedding Chapada dos Guimarães</option>
<option value="Pré-Wedding + Casamento Civil">Pré-Wedding + Casamento Civil</option>
<option value="Pré-Wedding + Casamento Civil + Cerimônia + Recepção">Pré-Wedding + Casamento Civil + Cerimônia + Recepção</option>
<option value="Pré-Wedding + Cerimônia">Pré-Wedding + Cerimônia</option>
<option value="Ensaio Individual">Ensaio Individual</option>
</select></div>
<div class="input-group" data-step="5"><label>Com vídeo?</label><input type="checkbox" id="incluirVideo"> Sim</div>
<div class="input-group" data-step="6"><label>Data do Evento:</label><input type="date" id="dataEvento"></div>
<div class="input-group" data-step="7"><label>Hora do Evento:</label><input type="time" id="horaEvento"></div>
<div class="input-group" data-step="8"><label>Duração (horas):</label><input type="number" id="duracaoServico" step="0.5" min="0.5"></div>
<div class="input-group" data-step="9"><label>Valor Total (R$):</label><input type="text" id="valorTotal" placeholder="0,00"></div>
<div class="input-group" data-step="10"><label>Forma de Pagamento Sugerida:</label><select id="formaPagamento">
<option value="">Selecione...</option><option value="Pix">Pix</option><option value="Cartão Crédito">Cartão de Crédito</option>
<option value="Dinheiro">Dinheiro</option><option value="Parcelado">Parcelado</option></select></div>
<div class="input-group" data-step="11"><label>Local do Orçamento:</label><input type="text" id="localOrcamento" placeholder="Cidade/Estado"></div>
<div class="input-group" data-step="12"><label>Validade (dias):</label><input type="number" id="validadeOrcamento" value="15" min="1"></div>
<div class="navigation-buttons"><button class="secondary" id="backButton" onclick="showPreviousStep()" disabled>Anterior</button><button id="nextButton" onclick="handleNextStep()">Próximo</button></div>
<div class="controls" id="finalControls" style="display:none;"><button onclick="downloadPdf()">Baixar Orçamento PDF</button></div>
</div>
<div class="contract-wrapper" id="contractWrapper"><div id="contractContent">
<div class="contract-page">
<h1>PROPOSTA COMERCIAL — SERVIÇOS FOTOGRÁFICOS</h1>
<div class="text-block">
<p><span class="section-title">CLIENTE:</span> <span id="displayClienteNome"></span></p>
<p><span class="section-title">ENDEREÇO/LOCAL:</span> <span id="displayClienteEndereco"></span></p>
<p><span class="section-title">E-MAIL:</span> <span id="displayClienteEmail"></span></p>
</div>
<div class="text-block">
<p><span class="section-title">PRESTADOR:</span> Registre Fotografias — Lucas Rocha — Várzea Grande/MT</p>
<p>E-mail: lucasrochafotografias@gmail.com</p>
</div>
<div class="section-title">RESUMO DO SERVIÇO</div>
<div class="text-block indent">
<p>- Tipo de evento: <span id="displayTipoEvento"></span></p>
<p>- Data do evento: <span id="displayDataEvento"></span></p>
<p>- Hora: <span id="displayHoraEvento"></span></p>
<p>- Duração: <span id="displayDuracaoServico"></span></p>
<p>- Investimento total: <span id="displayValorTotalContrato"></span></p>
<p>- Forma de pagamento: <span id="displayFormaPagamento"></span></p>
<p>- Validade da proposta: <span id="displayValidade"></span></p>
</div>
<div class="section-title">OBJETIVO</div>
<div class="text-block indent"><p>Apresentamos esta proposta para a realização de cobertura fotográfica <span id="objetivoVideoAdicional"></span> do evento <strong>"<span id="displayTipoEvento2"></span>"</strong>, visando registrar os melhores momentos com qualidade técnica e olhar artístico.</p></div>
<div class="section-title">ESCOPO DO TRABALHO</div>
<div class="text-block indent">
<p><strong>1. Cobertura:</strong> Presença de fotógrafo profissional por <span id="displayDuracaoServico2"></span> horas consecutivas.</p>
<p><strong>2. Equipamento:</strong> Câmeras e lentes profissionais de alta resolução.</p>
<p><strong>3. Pós-produção:</strong> Curadoria, edição e tratamento das imagens entregues.</p>
<p><strong>4. Entrega:</strong> Link digital em alta resolução para download.</p>
<span id="escopoVideoAdicional"></span>
</div>
<div class="section-title">PRAZOS E CONDIÇÕES</div>
<div class="text-block indent">
<p>- Prazo de entrega: até 7 dias úteis após o evento.</p>
<p>- Reserva da data confirmada mediante aceite e pagamento do sinal (quando aplicável).</p>
<p>- Horas extras: R$ 50,00 por hora adicional.</p>
</div>
<div class="section-title">VALORES</div>
<div class="text-block indent"><p><strong>Investimento total:</strong> R$ <span id="displayValorTotalContrato2"></span></p></div>
<div class="text-block"><br><p>Atenciosamente,</p><p><strong>Registre Fotografias</strong></p><p><span id="displayLocalOrcamento"></span>, <span id="displayDataAssinaturaDia"></span> de <span id="displayDataAssinaturaMes"></span> de <span id="displayDataAssinaturaAno"></span>.</p></div>
<div class="signature-block"><div class="signature"><p>Registre Fotografias</p></div><div class="signature"><p>Cliente</p></div></div>
</div>
</div></div>
<script>
const A4_WIDTH_MM = 210, MM_TO_PX_RATIO = 3.77953, PADDING_PX = 20;
let currentStep = 1;
const totalSteps = 12;
function areCurrentStepFieldsValid() {
  const g = document.querySelector('.input-group[data-step="' + currentStep + '"]');
  if (!g) return true;
  const inputs = g.querySelectorAll('input:not([readonly]):not([type="hidden"]):not([type="checkbox"]), select');
  for (const input of inputs) {
    if ((input.tagName === 'SELECT' && !input.value) || (input.type !== 'number' && input.type !== 'checkbox' && !input.value.trim())) return false;
    if (input.type === 'number' && (isNaN(parseFloat(input.value)) || parseFloat(input.value) < 0)) return false;
  }
  return true;
}
function showStep(n) {
  document.querySelectorAll('.input-group').forEach(g => {
    const s = parseInt(g.dataset.step);
    if (s === n) { g.classList.add('active'); const fi = g.querySelector('input, select'); if (fi) fi.focus(); }
    else g.classList.remove('active');
  });
  document.getElementById('backButton').disabled = (n === 1);
  document.getElementById('nextButton').disabled = !areCurrentStepFieldsValid() || (n === totalSteps);
  document.getElementById('finalControls').style.display = (n === totalSteps) ? 'flex' : 'none';
  updatePreview();
}
function handleNextStep() { if (areCurrentStepFieldsValid() && currentStep < totalSteps) { currentStep++; showStep(currentStep); } }
function showPreviousStep() { if (currentStep > 1) { currentStep--; showStep(currentStep); } }
function formatDate(ds) {
  if (!ds) return '';
  const d = new Date(ds + 'T00:00:00');
  if (isNaN(d.getTime())) return ds;
  return String(d.getUTCDate()).padStart(2,'0') + '/' + String(d.getUTCMonth()+1).padStart(2,'0') + '/' + d.getUTCFullYear();
}
function calculateValue() {
  const tipo = document.getElementById('tipoEvento').value;
  const duracao = parseFloat(document.getElementById('duracaoServico').value) || 0;
  const video = document.getElementById('incluirVideo').checked;
  let valor = 0;
  const precos = {
    "Casamento Civil": 250, "Casamento Civil + Cerimônia + Recepção": 650,
    "Cerimônia + Recepção": 450, "Batizado": 350, "Cultos Diversos": 250,
    "Pré-Wedding Chapada dos Guimarães": 850, "Pré-Wedding + Casamento Civil": 550,
    "Pré-Wedding + Casamento Civil + Cerimônia + Recepção": 900, "Pré-Wedding + Cerimônia": 550
  };
  if (precos[tipo]) valor = precos[tipo];
  else if (tipo === "Aniversário Infantil") {
    if (video) valor = 400;
    else if (duracao === 1) valor = 180;
    else if (duracao > 0 && duracao <= 2.5) valor = 350;
    else if (duracao > 2.5) valor = duracao * 150;
  } else if (["Aniversário Adulto", "Formatura", "Ensaio Individual"].includes(tipo)) {
    if (duracao === 1) valor = 180;
    else if (duracao > 0 && duracao <= 2.5) valor = 350;
    else if (duracao > 2.5) valor = duracao * 150;
  }
  if (video && tipo !== "Aniversário Infantil") valor += 100;
  document.getElementById('valorTotal').value = valor.toFixed(2).replace('.', ',');
  updatePreview();
}
function updatePreview() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('displayClienteNome', document.getElementById('clienteNome').value);
  set('displayClienteEndereco', document.getElementById('clienteEndereco').value);
  set('displayClienteEmail', document.getElementById('clienteEmail').value);
  set('displayTipoEvento', document.getElementById('tipoEvento').value);
  set('displayTipoEvento2', document.getElementById('tipoEvento').value);
  set('displayDataEvento', formatDate(document.getElementById('dataEvento').value));
  set('displayHoraEvento', document.getElementById('horaEvento').value);
  set('displayDuracaoServico', document.getElementById('duracaoServico').value + ' horas');
  set('displayDuracaoServico2', document.getElementById('duracaoServico').value);
  set('displayValorTotalContrato', 'R$ ' + document.getElementById('valorTotal').value);
  set('displayValorTotalContrato2', document.getElementById('valorTotal').value);
  set('displayFormaPagamento', document.getElementById('formaPagamento').value || '-');
  set('displayValidade', document.getElementById('validadeOrcamento').value + ' dias');
  set('displayLocalOrcamento', document.getElementById('localOrcamento').value);
  const v = document.getElementById('incluirVideo').checked;
  set('objetivoVideoAdicional', v ? 'e captação de vídeo resumo' : '');
  const ev = document.getElementById('escopoVideoAdicional');
  if (ev) ev.innerHTML = v ? '<p><strong>5. Vídeo:</strong> Captação de takes e edição de vídeo resumo.</p>' : '';
  const today = new Date();
  set('displayDataAssinaturaDia', String(today.getDate()).padStart(2,'0'));
  set('displayDataAssinaturaMes', today.toLocaleString('pt-BR', { month: 'long' }));
  set('displayDataAssinaturaAno', today.getFullYear());
}
function downloadPdf() {
  const el = document.getElementById('contractContent');
  const nome = document.getElementById('clienteNome').value || 'cliente';
  const opt = { margin: 0, filename: 'orcamento_' + nome + '.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
  html2pdf().set(opt).from(el).save();
}
document.addEventListener('DOMContentLoaded', () => {
  showStep(currentStep);
  document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', () => {
      if (['tipoEvento', 'duracaoServico', 'incluirVideo'].includes(input.id)) calculateValue();
      updatePreview();
      document.getElementById('nextButton').disabled = !areCurrentStepFieldsValid() || (currentStep === totalSteps);
    });
  });
  updatePreview();
  window.dispatchEvent(new Event('resize'));
});
window.addEventListener('resize', () => {
  const w = document.getElementById('contractWrapper'), c = document.getElementById('contractContent');
  if (!w || !c) return;
  if (window.innerWidth <= 1024) {
    const av = w.offsetWidth - (2 * PADDING_PX);
    const orig = A4_WIDTH_MM * MM_TO_PX_RATIO;
    const sc = av < orig ? av / orig : 1;
    c.style.transform = 'scale(' + sc + ')';
    c.style.transformOrigin = 'top center';
  } else c.style.transform = 'scale(1)';
});
<\/script>
</body></html>
`;

/* ============================================================
   COMPONENTES AUXILIARES
   ============================================================ */
function SharePopup({ isOpen, photoUrl, album, onClose }) {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div style={{ background: '#1a1a1a', borderRadius: '24px', padding: '28px 24px', maxWidth: '340px', width: '90%', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: 'white', fontSize: '1.15rem', fontWeight: 600, marginBottom: '4px' }}>Compartilhar Foto</h3>
        <div style={{ width: '140px', height: '140px', borderRadius: '12px', overflow: 'hidden', margin: '0 auto 20px', border: '2px solid rgba(255,255,255,0.1)' }}>
          <img src={photoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <button onClick={() => sharePhoto(photoUrl, album)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'linear-gradient(135deg, #d4af37, #c4a137)', color: '#000', border: 'none', borderRadius: '16px', padding: '14px 20px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', width: '100%', marginBottom: '12px' }}>
          <Share2 size={20} /> Compartilhar Agora
        </button>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', color: '#ccc', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '0.85rem', cursor: 'pointer', width: '100%' }}>Cancelar</button>
      </div>
    </div>
  );
}

function AudioTrimmer({ audioUrl, startTime, endTime, duration, onStartChange, onEndChange }) {
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const trackRef = useRef(null);
  const previewAudioRef = useRef(null);
  useEffect(() => {
    if (!duration && audioUrl) {
      const a = new Audio(audioUrl);
      a.addEventListener('loadedmetadata', () => setAudioDuration(a.duration));
      a.load();
    }
  }, [audioUrl, duration]);
  const maxDuration = audioDuration || 60;
  const startPercent = ((startTime || 0) / maxDuration) * 100;
  const endPercent = endTime ? (endTime / maxDuration) * 100 : 100;
  const playPreview = (s, e) => {
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
    const a = new Audio(audioUrl);
    a.currentTime = s; a.volume = 0.7; previewAudioRef.current = a; a.play();
    const stop = () => { if (a.currentTime >= e) { a.pause(); a.removeEventListener('timeupdate', stop); } };
    a.addEventListener('timeupdate', stop);
    setTimeout(() => { if (a && !a.paused) a.pause(); }, 5000);
  };
  const handleMouseDown = (h, e) => {
    e.stopPropagation();
    const mm = (e) => {
      if (!trackRef.current) return;
      const r = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - r.left, r.width));
      const t = (x / r.width) * maxDuration;
      if (h === 'start') { if (t < (endTime || maxDuration)) onStartChange(Math.max(0, t)); }
      else { if (t > (startTime || 0)) onEndChange(Math.min(maxDuration, t)); }
    };
    const mu = () => {
      playPreview(startTime || 0, endTime || maxDuration);
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
    };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  };
  const sd = (endTime || maxDuration) - (startTime || 0);
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl p-4 border border-purple-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Scissors size={16} className="text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Selecionar trecho</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-purple-600 font-medium">{sd.toFixed(1)}s</span>
            <button type="button" onClick={() => playPreview(startTime || 0, endTime || maxDuration)} className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              <Play size={12} fill="currentColor" /> Preview
            </button>
          </div>
        </div>
        <div ref={trackRef} className="relative h-14 bg-gray-100 rounded-lg cursor-pointer overflow-hidden select-none">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-200/30 to-purple-400/30" />
          <div className="absolute top-0 bottom-0 bg-gradient-to-r from-purple-500/50 to-purple-600/50 border-l-2 border-r-2 border-purple-500" style={{ left: startPercent + '%', width: (endPercent - startPercent) + '%' }} />
          <div className="absolute top-0 bottom-0 w-5 cursor-ew-resize z-10 flex items-center justify-center" style={{ left: `calc(${startPercent}% - 10px)` }} onMouseDown={(e) => handleMouseDown('start', e)}>
            <div className="w-2 h-10 bg-white rounded-full shadow-lg border border-purple-300" />
            <div className="absolute -top-5 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">{(startTime || 0).toFixed(1)}s</div>
          </div>
          <div className="absolute top-0 bottom-0 w-5 cursor-ew-resize z-10 flex items-center justify-center" style={{ left: `calc(${endPercent}% - 10px)` }} onMouseDown={(e) => handleMouseDown('end', e)}>
            <div className="w-2 h-10 bg-white rounded-full shadow-lg border border-purple-300" />
            <div className="absolute -top-5 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">{(endTime || maxDuration).toFixed(1)}s</div>
          </div>
        </div>
        <div className="flex justify-between mt-1.5 px-1">
          <span className="text-[10px] text-gray-400">0s</span>
          <span className="text-[10px] text-gray-400">{maxDuration.toFixed(0)}s</span>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const handleLogin = (e) => {
    e.preventDefault();
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      sessionStorage.setItem('adminLoggedIn', 'true');
      onLogin(true);
      setLoginError(false);
    } else { setLoginError(true); setPassword(''); }
  };
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="bg-[#d4af37] p-4 rounded-2xl inline-block mb-4"><Camera size={32} className="text-black" /></div>
          <h1 className="text-2xl font-bold text-white mb-1">Studio Dashboard</h1>
          <p className="text-gray-400 text-sm">Área restrita</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Usuário</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Digite seu usuário" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-white outline-none focus:ring-2 focus:ring-[#d4af37] placeholder:text-gray-600" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Senha</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite sua senha" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-white outline-none focus:ring-2 focus:ring-[#d4af37] placeholder:text-gray-600" />
            </div>
          </div>
          {loginError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              <p className="text-red-400 text-xs">Usuário ou senha inválidos.</p>
            </div>
          )}
          <button type="submit" className="w-full bg-[#d4af37] hover:bg-[#c4a137] text-black font-bold p-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg mt-6">
            <LogIn size={18} /> Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   APP PRINCIPAL
   ============================================================ */
export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => sessionStorage.getItem('adminLoggedIn') === 'true');

  useEffect(() => {
    const oh = () => setHash(window.location.hash);
    window.addEventListener('hashchange', oh);
    return () => window.removeEventListener('hashchange', oh);
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setAlbums(Object.values(await loadAllAlbumsFromSheets()));
      setIsLoading(false);
    })();
  }, [hash]);

  // Rota pública de álbum (cliente vê)
  if (hash.startsWith('#/album/')) return <AlbumLoader shortId={hash.replace('#/album/', '')} />;

  // Todas as outras rotas exigem login (único)
  if (!isAdminLoggedIn) return <LoginScreen onLogin={setIsAdminLoggedIn} />;

  if (hash === '#new') {
    return (
      <AdminShell currentHash={hash} onLogout={() => setIsAdminLoggedIn(false)}>
        <AdminEditor
          onSave={(a) => { setAlbums([a, ...albums]); window.location.hash = ''; }}
          onCancel={() => { window.location.hash = ''; }}
        />
      </AdminShell>
    );
  }

  if (hash.startsWith('#edit_')) {
    const editId = hash.replace('#edit_', '');
    const editingAlbum = albums.find((a) => a.id === editId);
    return (
      <AdminShell currentHash={hash} onLogout={() => setIsAdminLoggedIn(false)}>
        <AdminEditor
          album={editingAlbum}
          onSave={(u) => { setAlbums(albums.map((a) => a.id === u.id ? u : a)); window.location.hash = ''; }}
          onCancel={() => { window.location.hash = ''; }}
        />
      </AdminShell>
    );
  }

  if (hash.startsWith('#registre')) {
    const subroute = hash.replace('#registre', '').replace(/^\//, '') || 'dashboard';
    return (
      <AdminShell currentHash={hash} onLogout={() => setIsAdminLoggedIn(false)}>
        <RegistreApp subroute={subroute} />
      </AdminShell>
    );
  }

  return (
    <AdminShell currentHash={hash} onLogout={() => setIsAdminLoggedIn(false)}>
      <AdminDashboard albums={albums} setAlbums={setAlbums} isLoading={isLoading} />
    </AdminShell>
  );
}

/* ============================================================
   SHELL COM MENU
   ============================================================ */
function AdminShell({ currentHash, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isRegistre = currentHash.startsWith('#registre');
  const subroute = isRegistre ? (currentHash.replace('#registre', '').replace(/^\//, '') || 'dashboard') : '';

  const navigate = (path) => { window.location.hash = path; setMobileOpen(false); };

  const MenuItem = ({ active, icon: Icon, label, onClick, accent }) => (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-4 py-3 space-x-3 transition-colors text-left ${active ? (accent || 'bg-blue-600') + ' text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
    >
      <Icon size={18} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  const MenuContent = () => (
    <>
      <div className="px-3 mb-1"><span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Álbuns</span></div>
      <MenuItem active={!isRegistre && (currentHash === '' || currentHash === '#' || currentHash === '#')} icon={Images} label="Painel de Álbuns" onClick={() => navigate('#')} accent="bg-[#d4af37]" />
      <MenuItem active={currentHash === '#new'} icon={Plus} label="Novo Álbum" onClick={() => navigate('#new')} accent="bg-[#d4af37]" />

      <div className="px-3 mt-4 mb-1"><span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Registre Foto</span></div>
      <MenuItem active={isRegistre && subroute === 'dashboard'} icon={LayoutDashboard} label="Dashboard" onClick={() => navigate('#registre/dashboard')} />
      <MenuItem active={isRegistre && subroute === 'clientes'} icon={Users} label="Clientes" onClick={() => navigate('#registre/clientes')} />
      <MenuItem active={isRegistre && subroute === 'agendamentos'} icon={Calendar} label="Agendamentos" onClick={() => navigate('#registre/agendamentos')} />
      <MenuItem active={isRegistre && subroute === 'vendas'} icon={DollarSign} label="Vendas" onClick={() => navigate('#registre/vendas')} />
      <MenuItem active={isRegistre && subroute === 'financeiro'} icon={Wallet} label="Financeiro" onClick={() => navigate('#registre/financeiro')} />
      <MenuItem active={isRegistre && subroute === 'orcamento'} icon={Receipt} label="Orçamento" onClick={() => navigate('#registre/orcamento')} />
      <MenuItem active={isRegistre && subroute === 'servicos'} icon={Briefcase} label="Serviços" onClick={() => navigate('#registre/servicos')} />
      <MenuItem active={isRegistre && subroute === 'contrato'} icon={FileText} label="Contratos" onClick={() => navigate('#registre/contrato')} />
      <MenuItem active={isRegistre && subroute === 'assinatura'} icon={PenTool} label="Assinatura" onClick={() => navigate('#registre/assinatura')} />
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <aside className="hidden md:flex w-64 bg-gray-900 text-gray-300 flex-col shadow-xl z-10">
        <div className="p-5 flex items-center justify-center border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="bg-[#d4af37] p-1.5 rounded-lg"><Camera size={18} className="text-black" /></div>
            <span className="text-white font-bold">Registre</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3"><MenuContent /></nav>
        <div className="p-3 border-t border-gray-800">
          <button onClick={() => { sessionStorage.removeItem('adminLoggedIn'); onLogout(); window.location.hash = ''; }} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 bg-gray-900 text-white p-4 z-30 flex justify-between items-center shadow-md">
        <span className="font-bold">Registre Foto</span>
        <button onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 bg-gray-900 z-20 pt-16 md:hidden overflow-y-auto" onClick={() => setMobileOpen(false)}>
          <nav className="flex flex-col py-3" onClick={(e) => e.stopPropagation()}>
            <MenuContent />
            <div className="p-3 border-t border-gray-800 mt-4">
              <button onClick={() => { sessionStorage.removeItem('adminLoggedIn'); onLogout(); window.location.hash = ''; }} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg">
                <LogOut size={14} /> Sair
              </button>
            </div>
          </nav>
        </div>
      )}

      <main className="flex-1 overflow-auto pt-16 md:pt-0">{children}</main>
    </div>
  );
}

/* ============================================================
   REGISTRE FOTO APP
   ============================================================ */
function RegistreApp({ subroute }) {
  const [clientes, setClientes] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({ revenue: 0, receivable: 0, events: 0, sales: 0, budgets: 0 });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((msg, type) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cl, ag, ve, cat, orc] = await Promise.all([
        registreFetchData('Clientes'),
        registreFetchData('Agendamentos'),
        registreFetchData('Vendas'),
        registreFetchData('ServicosProdutos'),
        registreFetchData('Orcamentos')
      ]);
      setClientes(cl); setAgendamentos(ag); setVendas(ve);
      setCatalogo(cat); setOrcamentos(orc);

      const totalVendido = ve.reduce((a, c) => a + toNumber(c.valor_total), 0);
      const totalRecebido = ve.reduce((a, c) => a + toNumber(c.valor_pago), 0);

      setDashboardStats({
        revenue: totalVendido,
        receivable: Math.max(0, totalVendido - totalRecebido),
        events: ag.length,
        sales: ve.length,
        budgets: orc.length,
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshAll().finally(() => setInitialLoading(false)); }, [refreshAll]);

  const sendData = async (sheet, data) => {
    setLoading(true);
    const r = await registreSendSingle(sheet, data, 'create');
    if (r.ok) { showNotification("Salvo com sucesso!", "success"); await refreshAll(); }
    else { showNotification(`Erro: ${r.error || 'falha ao salvar'}`, "error"); }
    setLoading(false);
  };

  const updateData = async (sheet, data) => {
    setLoading(true);
    const r = await registreSendSingle(sheet, data, 'update');
    if (r.ok) { showNotification("Atualizado com sucesso!", "success"); await refreshAll(); }
    else { showNotification(`Erro: ${r.error || 'falha ao atualizar'}`, "error"); }
    setLoading(false);
  };

  const deleteData = async (sheet, id) => {
    if (!window.confirm("Tem certeza que deseja excluir?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${REGISTRE_API_URL}?action=delete&sheet=${encodeURIComponent(sheet)}&id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showNotification("Excluído.", "success");
      await refreshAll();
    } catch (e) {
      showNotification(`Erro ao excluir: ${e.message}`, "error");
    } finally { setLoading(false); }
  };

  const LocationLink = ({ localizacao }) => {
    if (!localizacao) return <span>-</span>;
    const isLink = localizacao.trim().startsWith('http');
    const href = isLink ? localizacao : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localizacao)}`;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {isLink ? 'Abrir Link' : localizacao} <MapPin size={12} />
      </a>
    );
  };

  const views = {
    dashboard: <RegistreDashboard stats={dashboardStats} agendamentos={agendamentos} />,
    clientes: <RegistreClientes clientes={clientes} onSave={sendData} onDelete={deleteData} />,
    agendamentos: <RegistreAgendamentos agendamentos={agendamentos} clientes={clientes} catalogo={catalogo} onSave={sendData} onDelete={deleteData} LocationLink={LocationLink} />,
    vendas: <RegistreVendas vendas={vendas} clientes={clientes} catalogo={catalogo} onSave={sendData} onRefresh={refreshAll} showNotification={showNotification} />,
    financeiro: <RegistreFinanceiro vendas={vendas} stats={dashboardStats} onUpdate={updateData} />,
    orcamento: (
      <div className="w-full" style={{ height: 'calc(100vh - 60px)' }}>
        <iframe srcDoc={buildOrcamentoIframeHtml()} style={{ width: '100%', height: '100%', border: 'none' }} title="Gerador de Orçamento" />
      </div>
    ),
    servicos: <RegistreServicos catalogo={catalogo} onSave={sendData} onDelete={deleteData} />,
    contrato: (
      <div className="w-full" style={{ height: 'calc(100vh - 60px)' }}>
        <iframe srcDoc={buildContractIframeHtml()} style={{ width: '100%', height: '100%', border: 'none' }} title="Gerador de Contrato" />
      </div>
    ),
    assinatura: <RegistreAssinatura />,
  };

  return (
    <div className="p-4 md:p-8 relative min-h-full">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <Loader2 size={48} className="animate-spin text-white" />
            <span className="text-white font-bold mt-3 tracking-wider">CARREGANDO...</span>
          </div>
        </div>
      )}
      {notification && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow text-white z-50 ${notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {notification.msg}
        </div>
      )}
      {initialLoading ? (
        <div className="text-center py-20 text-gray-400">
          <Loader2 size={32} className="animate-spin mx-auto mb-2" />
          <p>Carregando dados iniciais...</p>
        </div>
      ) : (views[subroute] || views.dashboard)}
    </div>
  );
}

/* ============================================================
   VIEWS REGISTRE FOTO
   ============================================================ */
function RegistreDashboard({ stats, agendamentos }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-xs text-gray-500">Faturamento</p>
          <p className="text-xl font-bold">{formatBRL(stats.revenue)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <p className="text-xs text-gray-500">A Receber</p>
          <p className="text-xl font-bold text-orange-600">{formatBRL(stats.receivable)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-xs text-gray-500">Agendamentos</p>
          <p className="text-xl font-bold">{stats.events}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <p className="text-xs text-gray-500">Vendas</p>
          <p className="text-xl font-bold">{stats.sales}</p>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-bold mb-4">Próximos Eventos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50"><tr><th className="p-3">Data</th><th className="p-3">Cliente</th><th className="p-3">Serviço</th></tr></thead>
            <tbody>
              {agendamentos.slice(0, 5).map((ag) => (
                <tr key={ag.id} className="border-t">
                  <td className="p-3">{formatDateBR(ag.data)}</td>
                  <td className="p-3">{ag.cliente_nome}</td>
                  <td className="p-3">{ag.servico_nome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RegistreClientes({ clientes, onSave, onDelete }) {
  const [novo, setNovo] = useState({ nome: '', email: '', telefone: '', endereco: '', cpf: '' });
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave('Clientes', novo);
    setNovo({ nome: '', email: '', telefone: '', endereco: '', cpf: '' });
  };
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Clientes</h2>
      <div className="bg-white p-6 rounded shadow">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required placeholder="Nome" className="border p-2 rounded" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          <input placeholder="Email" className="border p-2 rounded" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
          <input placeholder="Telefone" className="border p-2 rounded" value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} />
          <input placeholder="Endereço" className="border p-2 rounded" value={novo.endereco} onChange={(e) => setNovo({ ...novo, endereco: e.target.value })} />
          <input placeholder="CPF" className="border p-2 rounded" value={novo.cpf} onChange={(e) => setNovo({ ...novo, cpf: e.target.value })} />
          <button className="bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700">Salvar</button>
        </form>
      </div>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr><th className="p-3 text-left">Nome</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Ações</th></tr></thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.nome}</td>
                <td className="p-3">{c.email}</td>
                <td className="p-3"><button onClick={() => onDelete('Clientes', c.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RegistreServicos({ catalogo, onSave, onDelete }) {
  const [item, setItem] = useState({ tipo: 'Serviço', nome: '', descricao: '', valor: '', unidade_cobranca: 'Hora', duracao_padrao: '' });
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave('ServicosProdutos', item);
    setItem({ tipo: 'Serviço', nome: '', descricao: '', valor: '', unidade_cobranca: 'Hora', duracao_padrao: '' });
  };
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Produtos e Serviços</h2>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-bold mb-4 text-purple-600 flex items-center"><Plus size={18} className="mr-2" /> Novo Item</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center"><input type="radio" name="tipo" value="Serviço" checked={item.tipo === 'Serviço'} onChange={() => setItem({ ...item, tipo: 'Serviço' })} className="mr-2" /> Serviço</label>
            <label className="flex items-center"><input type="radio" name="tipo" value="Produto" checked={item.tipo === 'Produto'} onChange={() => setItem({ ...item, tipo: 'Produto' })} className="mr-2" /> Produto</label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Nome do Item" className="border p-2 rounded" value={item.nome} onChange={(e) => setItem({ ...item, nome: e.target.value })} />
            <input required type="number" step="0.01" placeholder="Valor (R$)" className="border p-2 rounded" value={item.valor} onChange={(e) => setItem({ ...item, valor: e.target.value })} />
            {item.tipo === 'Serviço' && (
              <>
                <select className="border p-2 rounded" value={item.unidade_cobranca} onChange={(e) => setItem({ ...item, unidade_cobranca: e.target.value })}>
                  <option value="Hora">Por Hora</option>
                  <option value="Evento">Por Evento (Fixo)</option>
                </select>
                <input type="number" step="0.5" placeholder="Duração Padrão (Horas)" className="border p-2 rounded" value={item.duracao_padrao} onChange={(e) => setItem({ ...item, duracao_padrao: e.target.value })} />
              </>
            )}
            <input placeholder="Descrição curta" className="border p-2 rounded md:col-span-2" value={item.descricao} onChange={(e) => setItem({ ...item, descricao: e.target.value })} />
          </div>
          <button className="bg-purple-600 text-white px-4 py-2 rounded w-full hover:bg-purple-700">Salvar Item</button>
        </form>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalogo.map((i) => (
          <div key={i.id} className="bg-white p-4 rounded shadow border-t-4 border-purple-400">
            <span className="text-xs font-bold uppercase text-gray-400 mb-1 block">{i.tipo}</span>
            <h4 className="font-bold text-lg">{i.nome}</h4>
            <p className="text-sm text-gray-600 mb-2">{i.descricao}</p>
            <div className="flex justify-between items-end mt-4">
              <div>
                <p className="font-bold text-green-600 text-xl">{formatBRL(i.valor)}</p>
                {i.tipo === 'Serviço' && <p className="text-xs text-gray-500">Cobrado por {i.unidade_cobranca} {i.duracao_padrao ? `(${i.duracao_padrao}h)` : ''}</p>}
              </div>
              <button onClick={() => onDelete('ServicosProdutos', i.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegistreAgendamentos({ agendamentos, clientes, catalogo, onSave, onDelete, LocationLink }) {
  const [novoAg, setNovoAg] = useState({ cliente_nome: '', data: '', hora: '', localizacao: '', servico_nome: '', valor: '', duracao: '' });
  const handleSubmit = (e) => {
    e.preventDefault();
    let dataF = novoAg.data;
    if (novoAg.data) dataF += `T${novoAg.hora || '00:00'}:00`;
    const payload = { ...novoAg, data: dataF };
    delete payload.hora;
    onSave('Agendamentos', payload);
    setNovoAg({ cliente_nome: '', data: '', hora: '', localizacao: '', servico_nome: '', valor: '', duracao: '' });
  };
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Agendamentos</h2>
      <div className="bg-white p-6 rounded shadow">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Cliente</label>
            <select className="border p-2 rounded w-full" value={novoAg.cliente_nome} onChange={(e) => setNovoAg({ ...novoAg, cliente_nome: e.target.value })} required>
              <option value="">Selecione...</option>
              {clientes.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Serviço</label>
            <select className="border p-2 rounded w-full" value={novoAg.servico_nome} onChange={(e) => {
              const s = catalogo.find((x) => x.nome === e.target.value);
              setNovoAg({ ...novoAg, servico_nome: e.target.value, valor: s ? s.valor : '', duracao: s?.duracao_padrao || '' });
            }} required>
              <option value="">Selecione...</option>
              {catalogo.filter((i) => i.tipo === 'Serviço').map((s) => <option key={s.id} value={s.nome}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Data</label>
            <input type="date" className="border p-2 rounded w-full" value={novoAg.data} onChange={(e) => setNovoAg({ ...novoAg, data: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Hora Início</label>
            <input type="time" className="border p-2 rounded w-full" value={novoAg.hora} onChange={(e) => setNovoAg({ ...novoAg, hora: e.target.value })} />
          </div>
          <div className="col-span-full">
            <label className="block text-sm font-bold text-gray-600 mb-1">Localização</label>
            <input placeholder="Local do Evento" className="border p-2 rounded w-full" value={novoAg.localizacao} onChange={(e) => setNovoAg({ ...novoAg, localizacao: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Duração (h)</label>
            <input placeholder="Ex: 4" type="number" step="0.5" className="border p-2 rounded w-full" value={novoAg.duracao} onChange={(e) => setNovoAg({ ...novoAg, duracao: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Valor (R$)</label>
            <input placeholder="0.00" type="number" className="border p-2 rounded w-full" value={novoAg.valor} onChange={(e) => setNovoAg({ ...novoAg, valor: e.target.value })} />
          </div>
          <button className="bg-blue-600 text-white p-2 rounded font-bold md:col-span-2 hover:bg-blue-700">Agendar</button>
        </form>
      </div>
      <div className="space-y-2">
        {agendamentos.map((ag) => (
          <div key={ag.id} className="bg-white p-4 rounded shadow border-l-4 border-blue-300 flex justify-between items-center">
            <div>
              <p className="font-bold text-lg">{ag.cliente_nome}</p>
              <p className="text-sm text-gray-600 flex items-center gap-2">{formatarDataHora(ag.data)} - <LocationLink localizacao={ag.localizacao} /></p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{ag.servico_nome} {ag.duracao ? `(${ag.duracao}h)` : ''}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-green-600 text-lg">{formatBRL(ag.valor)}</p>
              <button onClick={() => onDelete('Agendamentos', ag.id)} className="text-red-400 text-xs hover:underline">Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegistreVendas({ vendas, clientes, catalogo, onSave, onRefresh, showNotification }) {
  const [novaVenda, setNovaVenda] = useState({
    cliente_nome: '', item_vendido: '', valor_total: '', duracao: '', localizacao: '',
    data_venda: new Date().toISOString().split('T')[0], hora: '',
    status_pagamento: 'Pago', valor_entrada: ''
  });
  const handleSubmit = async (e) => {
    e.preventDefault();
    let valPago = novaVenda.status_pagamento === 'Pago' ? novaVenda.valor_total
      : (novaVenda.status_pagamento === 'Parcial' ? novaVenda.valor_entrada : 0);
    let dF = novaVenda.data_venda;
    if (novaVenda.data_venda) dF += `T${novaVenda.hora || '00:00'}:00`;
    const payload = { ...novaVenda, data_venda: dF, valor_pago: valPago };
    delete payload.hora; delete payload.valor_entrada;
    await registreSendSingle('Vendas', payload, 'create');
    if (catalogo.find((i) => i.nome === novaVenda.item_vendido)?.tipo === 'Serviço') {
      await registreSendSingle('Agendamentos', {
        cliente_nome: novaVenda.cliente_nome, data: dF, localizacao: novaVenda.localizacao,
        servico_nome: novaVenda.item_vendido, valor: novaVenda.valor_total,
        duracao: novaVenda.duracao, status: 'Confirmado Venda'
      }, 'create');
    }
    showNotification("Venda Registrada!", "success");
    await onRefresh();
    setNovaVenda({
      cliente_nome: '', item_vendido: '', valor_total: '', duracao: '', localizacao: '',
      data_venda: new Date().toISOString().split('T')[0], hora: '',
      status_pagamento: 'Pago', valor_entrada: ''
    });
  };
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Nova Venda</h2>
      <div className="bg-white p-6 rounded shadow">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Cliente</label>
            <select className="border p-2 rounded w-full" value={novaVenda.cliente_nome} onChange={(e) => setNovaVenda({ ...novaVenda, cliente_nome: e.target.value })} required>
              <option value="">Selecione...</option>
              {clientes.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Item Vendido</label>
            <select className="border p-2 rounded w-full" value={novaVenda.item_vendido} onChange={(e) => {
              const i = catalogo.find((x) => x.nome === e.target.value);
              setNovaVenda({ ...novaVenda, item_vendido: e.target.value, valor_total: i ? i.valor : '', duracao: i?.duracao_padrao || '' });
            }} required>
              <option value="">Selecione...</option>
              {catalogo.map((i) => <option key={i.id} value={i.nome}>{i.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Data da Venda</label>
            <input type="date" className="border p-2 rounded w-full" value={novaVenda.data_venda} onChange={(e) => setNovaVenda({ ...novaVenda, data_venda: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Hora Início</label>
            <input type="time" className="border p-2 rounded w-full" value={novaVenda.hora} onChange={(e) => setNovaVenda({ ...novaVenda, hora: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-600 mb-1">Localização</label>
            <input placeholder="Local do Evento" className="border p-2 rounded w-full" value={novaVenda.localizacao} onChange={(e) => setNovaVenda({ ...novaVenda, localizacao: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Valor Total (R$)</label>
            <input placeholder="0.00" type="number" className="border p-2 rounded w-full" value={novaVenda.valor_total} onChange={(e) => setNovaVenda({ ...novaVenda, valor_total: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Duração (h)</label>
            <input placeholder="Ex: 4" type="number" step="0.5" className="border p-2 rounded w-full" value={novaVenda.duracao} onChange={(e) => setNovaVenda({ ...novaVenda, duracao: e.target.value })} />
          </div>
          <div className="bg-gray-50 p-3 rounded border md:col-span-2 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Status Pagamento</label>
              <select className="border p-2 rounded w-full" value={novaVenda.status_pagamento} onChange={(e) => setNovaVenda({ ...novaVenda, status_pagamento: e.target.value })}>
                <option value="Pago">Totalmente Pago</option>
                <option value="Parcial">Entrada + Restante</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>
            {novaVenda.status_pagamento === 'Parcial' && (
              <div>
                <label className="block text-xs font-bold text-blue-500 mb-1">Valor Entrada (R$)</label>
                <input type="number" className="border p-2 rounded w-full border-blue-300" value={novaVenda.valor_entrada} onChange={(e) => setNovaVenda({ ...novaVenda, valor_entrada: e.target.value })} />
              </div>
            )}
          </div>
          <button className="bg-green-600 text-white p-2 rounded font-bold md:col-span-2 hover:bg-green-700">Registrar Venda</button>
        </form>
      </div>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr><th className="p-3 text-left">Data</th><th className="p-3 text-left">Cliente</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Total</th></tr>
          </thead>
          <tbody>
            {vendas.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="p-3">{formatarDataHora(v.data_venda)}</td>
                <td className="p-3">{v.cliente_nome}</td>
                <td className="p-3">{v.status_pagamento}</td>
                <td className="p-3 text-right text-green-600 font-bold">{formatBRL(v.valor_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RegistreFinanceiro({ vendas, stats, onUpdate }) {
  const [editItem, setEditItem] = useState(null);
  const handleSave = (e) => {
    e.preventDefault();
    onUpdate('Vendas', {
      id: editItem.id, valor_total: editItem.valor_total,
      valor_pago: editItem.valor_pago, status_pagamento: editItem.status_pagamento
    });
    setEditItem(null);
  };
  return (
    <div className="space-y-6 relative">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Wallet className="text-blue-600" /> Controle Financeiro</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Total Vendido</p>
          <p className="text-2xl font-bold">{formatBRL(stats.revenue)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Recebido (Caixa)</p>
          <p className="text-2xl font-bold">{formatBRL(stats.revenue - stats.receivable)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-orange-500">
          <p className="text-sm text-gray-500">A Receber</p>
          <p className="text-2xl font-bold text-orange-600">{formatBRL(stats.receivable)}</p>
        </div>
      </div>
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">Relatório de Recebimentos</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3 hidden sm:table-cell">Data</th>
                <th className="p-3">Total</th>
                <th className="p-3">Pago</th>
                <th className="p-3">Falta</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {vendas.map((v) => {
                const total = toNumber(v.valor_total);
                const pago = toNumber(v.valor_pago);
                const falta = Math.max(0, total - pago);
                return (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">{v.cliente_nome}</td>
                    <td className="p-3 hidden sm:table-cell">{formatDateBR(v.data_venda)}</td>
                    <td className="p-3">{formatBRL(total)}</td>
                    <td className="p-3 text-blue-600 font-bold">{formatBRL(pago)}</td>
                    <td className="p-3 font-bold text-orange-600">{falta > 0.01 ? formatBRL(falta) : '-'}</td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${falta <= 0.01 ? 'bg-green-100 text-green-800' : pago > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {falta <= 0.01 ? 'Quitado' : pago > 0 ? 'Parcial' : 'Pendente'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => setEditItem({ ...v, valor_total: total, valor_pago: pago })} className="bg-blue-100 text-blue-600 p-2 rounded hover:bg-blue-200" title="Editar Pagamento"><Edit size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Atualizar Pagamento</h3>
            <p className="text-sm text-gray-500 mb-4">Cliente: <strong>{editItem.cliente_nome}</strong></p>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Valor Total (R$)</label>
                <input type="number" step="0.01" className="w-full border p-2 rounded" value={editItem.valor_total} onChange={(e) => setEditItem({ ...editItem, valor_total: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Valor Já Pago (R$)</label>
                <input type="number" step="0.01" className="w-full border p-2 rounded" value={editItem.valor_pago} onChange={(e) => setEditItem({ ...editItem, valor_pago: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                <select className="w-full border p-2 rounded" value={editItem.status_pagamento} onChange={(e) => setEditItem({ ...editItem, status_pagamento: e.target.value })}>
                  <option value="Pendente">Pendente</option>
                  <option value="Parcial">Parcial</option>
                  <option value="Pago">Pago / Quitado</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setEditItem(null)} className="px-4 py-2 text-gray-600 bg-gray-200 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RegistreAssinatura() {
  const abrirAssinador = () => {
    window.open("https://sso.acesso.gov.br/login?client_id=assinador.iti.br&authorization_id=19aa2bbafd2", 'AssinadorGovBr', "width=1000,height=700");
  };
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold">Assinatura Digital</h2>
      <div className="bg-white p-8 rounded shadow border flex flex-col items-center">
        <div className="bg-blue-50 rounded-full p-6 mb-6">
          <img src="https://www.gov.br/++theme++br.gov.plone/++theme++br.gov.plone.estrutura/img/govbr-logo-large.png" className="h-12 object-contain" onError={(e) => { e.target.src = "https://upload.wikimedia.org/wikipedia/commons/e/ee/Gov.br_logo.svg"; }} alt="Gov.br" />
        </div>
        <h3 className="text-xl font-bold mb-2">Acesso Gov.br</h3>
        <p className="text-gray-600 mb-6">Acesse o portal oficial para assinar seus documentos com segurança.</p>
        <button onClick={abrirAssinatura} className="bg-[#1351B4] text-white px-8 py-4 rounded font-bold shadow-lg hover:bg-blue-800 flex items-center gap-2">
          Acessar Assinador Digital <ExternalLink size={20} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   CLIENTAPP (visualização pública do álbum)
   ============================================================ */
function ClientApp({ album }) {
  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(!album.pin);
  const [pinError, setPinError] = useState(false);
  const [activeTab, setActiveTab] = useState(album.introVideo ? 'video' : 'stories');
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [isStoryPlaying, setIsStoryPlaying] = useState(true);
  const [storyProgress, setStoryProgress] = useState(0);
  const storyTimerRef = useRef(null);
  const storyStartTimeRef = useRef(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [bgImageIdx, setBgImageIdx] = useState(0);
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [showIntroVideo, setShowIntroVideo] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showVideoOverlay, setShowVideoOverlay] = useState(true);
  const videoRef = useRef(null);
  const galleryRef = useRef(null);
  const [visiblePhotos, setVisiblePhotos] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const storyBarsRef = useRef(null);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [sharePhotoUrl, setSharePhotoUrl] = useState(null);
  const albumExpired = isAlbumExpired(album);
  const expiryDateFormatted = formatExpiryDate(album);
  const daysRemaining = getDaysRemaining(album);
  const [showBuffering, setShowBuffering] = useState(false);
  const bufferTimeoutRef = useRef(null);

  const optimizedVideoUrl = useMemo(() => album.introVideo ? getOptimizedVideoUrl(album.introVideo) : null, [album.introVideo]);
  const featuredList = useMemo(() => {
    return album.featuredPhotos?.length > 0
      ? album.featuredPhotos.map((idx) => album.photos[idx]).filter(Boolean)
      : album.photos?.slice(0, 5) || [];
  }, [album]);

  useEffect(() => { if (album) updateMetaTags(album); }, [album]);
  useEffect(() => {
    if (!isAuthenticated && featuredList.length > 1) {
      const i = setInterval(() => setBgImageIdx((p) => (p + 1) % featuredList.length), 5000);
      return () => clearInterval(i);
    }
  }, [isAuthenticated, featuredList]);
  useEffect(() => { if (isAuthenticated && !album.introVideo) setVideoEnded(true); }, [isAuthenticated, album.introVideo]);
  useEffect(() => {
    if (isAuthenticated && album.introVideo && !videoEnded && !videoError && !albumExpired) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setAudioLoaded(false); }
      setShowIntroVideo(true); setShowVideoOverlay(true); setActiveTab('video');
    }
  }, [isAuthenticated, album.introVideo, videoEnded, videoError, albumExpired]);

  useEffect(() => {
    if (showIntroVideo && videoRef.current) {
      const video = videoRef.current;
      let hasStartedPlaying = false;
      let bufferCheckInterval = null;
      const handlePlaying = () => { hasStartedPlaying = true; setShowVideoOverlay(false); setShowBuffering(false); if (bufferCheckInterval) { clearInterval(bufferCheckInterval); bufferCheckInterval = null; } if (bufferTimeoutRef.current) { clearTimeout(bufferTimeoutRef.current); bufferTimeoutRef.current = null; } };
      const handleWaiting = () => { if (hasStartedPlaying) { if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current); bufferTimeoutRef.current = setTimeout(() => setShowBuffering(true), 300); } };
      const handleCanPlay = () => { if (bufferTimeoutRef.current) { clearTimeout(bufferTimeoutRef.current); bufferTimeoutRef.current = null; } setShowBuffering(false); if (hasStartedPlaying) setShowVideoOverlay(false); };
      const handleCanPlayThrough = () => { if (bufferTimeoutRef.current) { clearTimeout(bufferTimeoutRef.current); bufferTimeoutRef.current = null; } setShowBuffering(false); setShowVideoOverlay(false); };
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('canplaythrough', handleCanPlayThrough);
      bufferCheckInterval = setInterval(() => { if (video && hasStartedPlaying && video.paused && !video.ended && video.readyState < 3 && video.currentTime > 0) setShowBuffering(true); }, 2000);
      video.play().catch(() => setShowVideoOverlay(true));
      return () => {
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('canplaythrough', handleCanPlayThrough);
        if (bufferCheckInterval) clearInterval(bufferCheckInterval);
        if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
      };
    }
  }, [showIntroVideo]);

  useEffect(() => {
    if (showIntroVideo && showVideoOverlay) {
      const timer = setTimeout(() => setShowVideoOverlay(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showIntroVideo, showVideoOverlay]);

  useEffect(() => { if (showIntroVideo) { const t = setTimeout(() => handleVideoEnded(), 600000); return () => clearTimeout(t); } }, [showIntroVideo]);

  useEffect(() => {
    if (activeTab === 'stories' && album.storyMusic && isAuthenticated && !showIntroVideo && videoEnded && !albumExpired) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      const a = new Audio(album.storyMusic); a.loop = true; a.volume = 0.5; audioRef.current = a;
      const s = album.musicStartTime || 0; const e = album.musicEndTime || null;
      a.addEventListener('loadedmetadata', () => { if (s > 0) a.currentTime = s; });
      if (e) a.addEventListener('timeupdate', function l() { if (a.currentTime >= e) a.currentTime = s; });
      a.addEventListener('canplaythrough', () => { setAudioLoaded(true); if (isStoryPlaying && !showIntroVideo) a.play().catch(() => setAudioLoaded(false)); });
      a.addEventListener('error', () => setAudioLoaded(false));
      return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setAudioLoaded(false); } };
    }
    if (!album.storyMusic && audioRef.current) { audioRef.current.pause(); audioRef.current = null; setAudioLoaded(false); }
  }, [activeTab, album.storyMusic, isAuthenticated, showIntroVideo, videoEnded, albumExpired]);

  useEffect(() => {
    if (audioRef.current && audioLoaded) {
      if (activeTab === 'stories' && isStoryPlaying && !showIntroVideo && videoEnded && !albumExpired) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  }, [isStoryPlaying, activeTab, audioLoaded, showIntroVideo, videoEnded, albumExpired]);

  useEffect(() => { if (audioRef.current) audioRef.current.muted = isMuted; }, [isMuted]);

  useEffect(() => { if (storyBarsRef.current && album.photos?.length > 0) { const activeBar = storyBarsRef.current.children[currentStoryIdx]; if (activeBar) activeBar.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } }, [currentStoryIdx, album.photos]);
  useEffect(() => { if (activeTab === 'stories' && storyBarsRef.current && album.photos?.length > 0) { const activeBar = storyBarsRef.current.children[currentStoryIdx]; if (activeBar) setTimeout(() => activeBar.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' }), 100); } }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'stories' && isStoryPlaying && album.photos?.length > 0 && !showIntroVideo && videoEnded && !albumExpired) {
      const d = 4000; storyStartTimeRef.current = Date.now() - (storyProgress * d);
      storyTimerRef.current = setInterval(() => {
        const el = Date.now() - storyStartTimeRef.current; const p = el / d;
        if (p >= 1) {
          if (currentStoryIdx < album.photos.length - 1) { setCurrentStoryIdx((v) => v + 1); setStoryProgress(0); storyStartTimeRef.current = Date.now(); }
          else { setIsStoryPlaying(false); setActiveTab('gallery'); clearInterval(storyTimerRef.current); }
        } else setStoryProgress(p);
      }, 100);
    } else { if (storyTimerRef.current) { clearInterval(storyTimerRef.current); storyTimerRef.current = null; } }
    return () => { if (storyTimerRef.current) clearInterval(storyTimerRef.current); };
  }, [activeTab, isStoryPlaying, currentStoryIdx, album.photos, showIntroVideo, videoEnded, albumExpired]);

  const loadMorePhotos = useCallback(() => {
    if (isLoadingMore || visiblePhotos >= (album.photos?.length || 0)) return;
    setIsLoadingMore(true);
    setTimeout(() => { setVisiblePhotos((v) => Math.min(v + 12, album.photos?.length || 0)); setIsLoadingMore(false); }, 300);
  }, [visiblePhotos, album.photos, isLoadingMore]);

  useEffect(() => {
    if (activeTab !== 'gallery') return;
    const o = new IntersectionObserver((e) => { if (e[0].isIntersecting) loadMorePhotos(); }, { threshold: 0.1 });
    const s = document.getElementById('scroll-sentinel');
    if (s) o.observe(s);
    return () => o.disconnect();
  }, [activeTab, loadMorePhotos, visiblePhotos]);

  const handlePinSubmit = (e) => { e.preventDefault(); if (pinInput === album.pin) { setIsAuthenticated(true); setPinError(false); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } } else { setPinError(true); setPinInput(''); } };
  const handleDownloadRedirect = () => { if (album.googleDriveUrl) { const a = document.createElement('a'); a.href = album.googleDriveUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click(); } else alert('Link nao configurado.'); };
  const handleWhatsAppContact = () => { if (album.whatsappNumber?.trim()) { let p = album.whatsappNumber.replace(/\D/g, ''); if (p.indexOf('55') !== 0) p = '55' + p; window.open('https://wa.me/' + p + '?text=' + encodeURIComponent('Ola! Vi seu album "' + album.clientName + '" e gostaria de saber mais informacoes.'), '_blank'); } };
  const handleStoryNavigation = (d) => { if (d === 'prev' && currentStoryIdx > 0) { setCurrentStoryIdx((v) => v - 1); setStoryProgress(0); storyStartTimeRef.current = Date.now(); } else if (d === 'next') { if (currentStoryIdx < album.photos.length - 1) { setCurrentStoryIdx((v) => v + 1); setStoryProgress(0); storyStartTimeRef.current = Date.now(); } else { setIsStoryPlaying(false); setActiveTab('gallery'); } } };
  const toggleMute = (e) => { e.stopPropagation(); setIsMuted(!isMuted); };
  const handleVideoEnded = () => { setShowIntroVideo(false); setVideoEnded(true); setShowVideoOverlay(false); setShowBuffering(false); setActiveTab('stories'); setCurrentStoryIdx(0); setIsStoryPlaying(true); setStoryProgress(0); };
  const handleSkipVideo = () => handleVideoEnded();
  const handleVideoError = () => { setVideoError(true); setShowIntroVideo(false); handleVideoEnded(); };
  const handleSharePhoto = (u) => { setSharePhotoUrl(u); setShowSharePopup(true); };
  const handleCloseSharePopup = () => { setShowSharePopup(false); setSharePhotoUrl(null); };
  const hasWhatsApp = album.whatsappNumber?.trim();

  if (isAuthenticated && showIntroVideo && album.introVideo && !albumExpired) {
    const isVertical = detectVideoOrientation(album.introVideo) === 'vertical';
    return (
      <div onClick={() => { if (showVideoOverlay) setShowVideoOverlay(false); }} style={{ margin: 0, padding: 0, background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 9999, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', position: 'relative' }}>
          <div style={{ width: isVertical ? 'min(100%, 420px)' : 'min(100%, 90vw)', maxHeight: '100dvh', aspectRatio: isVertical ? '9/16' : '16/9', position: 'relative', overflow: 'hidden', borderRadius: isVertical ? '20px' : '12px', background: '#000' }}>
            <video ref={videoRef} src={optimizedVideoUrl || album.introVideo} autoPlay playsInline preload="auto" onEnded={handleVideoEnded} onError={handleVideoError} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            {showBuffering && <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)', borderRadius: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}><Loader2 size={16} className="animate-spin" style={{ color: '#d4af37' }} /><span style={{ color: 'white', fontSize: 12 }}>Carregando vídeo...</span></div>}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); handleSkipVideo(); }} style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, background: 'rgba(255,255,255,0.1)', color: 'white', padding: '0.7rem 1.3rem', borderRadius: 9999, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.8rem' }}>
          <SkipForward size={16} /> Pular Vídeo
        </button>
      </div>
    );
  }

  if (isAuthenticated && albumExpired) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-black/60 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 text-center">
          <AlertTriangle size={40} className="text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Album Expirado</h2>
          <p className="text-gray-400 text-sm mb-6">Este album nao esta mais disponivel.</p>
          {hasWhatsApp && <button onClick={handleWhatsAppContact} className="w-full bg-[#25D366] text-white font-bold p-3 rounded-xl flex items-center justify-center gap-2"><MessageCircle size={20} />Falar com o Fotografo</button>}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 relative overflow-hidden">
        {featuredList.map((url, i) => <div key={i} className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 scale-105 blur-[3px]" style={{ backgroundImage: `url(${url})`, opacity: i === bgImageIdx ? 0.35 : 0 }} />)}
        <div className="max-w-md w-full bg-black/40 backdrop-blur-xl border border-white/15 rounded-3xl p-8 text-center relative z-10">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#d4af37] mx-auto mb-4 bg-neutral-900 p-1">
            <img src={album.profileImage || album.photos[0]} className="w-full h-full object-cover rounded-full" />
          </div>
          <h2 className="text-2xl font-bold mb-1">{album.clientName}</h2>
          <p className="text-[#d4af37] text-xs uppercase tracking-widest font-semibold mb-6">{album.subtitle || 'Album Privado'}</p>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="Digite o PIN" className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-center text-xl tracking-widest text-white" />
            {pinError && <p className="text-red-500 text-xs">PIN invalido.</p>}
            <button type="submit" className="w-full bg-[#d4af37] text-black font-bold p-3 rounded-xl flex items-center justify-center gap-2">Desbloquear <ArrowRight size={18} /></button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] text-white pb-12">
      <SharePopup isOpen={showSharePopup} photoUrl={sharePhotoUrl} album={album} onClose={handleCloseSharePopup} />
      <div className="relative w-full h-32 sm:h-44 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center blur-sm opacity-40 scale-105" style={{ backgroundImage: `url(${album.profileImage || album.photos[0]})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/70 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full px-3 pb-1 flex items-end gap-2">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#d4af37] p-0.5"><img src={album.profileImage || album.photos[0]} className="w-full h-full object-cover rounded-full" /></div>
          <div><h1 className="text-base font-bold">{album.clientName}</h1><p className="text-[#d4af37] text-[8px] uppercase tracking-widest">{album.subtitle || 'Album Fotografico'}</p></div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-1">
        <div className="flex justify-center border-b border-white/10 gap-5">
          {album.introVideo && <button onClick={() => setActiveTab('video')} className={`pb-1.5 text-[11px] font-semibold uppercase flex items-center gap-1.5 border-b-2 ${activeTab === 'video' ? 'border-[#d4af37] text-[#d4af37]' : 'border-transparent text-gray-400'}`}><Video size={13} /> Video</button>}
          <button onClick={() => { setActiveTab('stories'); setCurrentStoryIdx(0); setIsStoryPlaying(true); setStoryProgress(0); }} className={`pb-1.5 text-[11px] font-semibold uppercase flex items-center gap-1.5 border-b-2 ${activeTab === 'stories' ? 'border-[#d4af37] text-[#d4af37]' : 'border-transparent text-gray-400'}`}><PlayCircle size={13} /> Stories</button>
          <button onClick={() => { setActiveTab('gallery'); setIsStoryPlaying(false); }} className={`pb-1.5 text-[11px] font-semibold uppercase flex items-center gap-1.5 border-b-2 ${activeTab === 'gallery' ? 'border-[#d4af37] text-[#d4af37]' : 'border-transparent text-gray-400'}`}><Grid size={13} /> Galeria</button>
        </div>
      </div>
      {activeTab === 'gallery' && (
        <div className="max-w-7xl mx-auto px-3 mt-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-200">Galeria ({album.photos?.length || 0})</h2>
            <div className="flex gap-1.5">
              {hasWhatsApp && <button onClick={handleWhatsAppContact} className="flex items-center gap-1 text-[10px] bg-[#25D366] text-white font-semibold px-3 py-1.5 rounded-full"><MessageCircle size={12} /> Contato</button>}
              <button onClick={handleDownloadRedirect} className="flex items-center gap-1 text-[10px] bg-[#d4af37] text-black font-semibold px-3 py-1.5 rounded-full"><Download size={12} /> Baixar</button>
            </div>
          </div>
          {album.photos?.length > 0 ? (
            <div ref={galleryRef} className="columns-2 md:columns-3 lg:columns-4 gap-2 space-y-2">
              {album.photos.slice(0, visiblePhotos).map((p, i) => (
                <div key={i} className="relative group cursor-pointer break-inside-avoid rounded-lg overflow-hidden bg-gray-900 border border-white/10">
                  <img src={p} alt={'Foto ' + (i+1)} className="w-full h-auto object-cover" loading="lazy" onClick={() => setLightboxPhoto(p)} />
                  <button onClick={(e) => { e.stopPropagation(); handleSharePhoto(p); }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2 opacity-0 group-hover:opacity-100"><Share2 size={14} /></button>
                </div>
              ))}
            </div>
          ) : <div className="text-center py-14 text-gray-500"><ImageIcon size={36} className="mx-auto mb-2 opacity-50" /><p className="text-xs">Nenhuma foto.</p></div>}
          {visiblePhotos < (album.photos?.length || 0) && <div id="scroll-sentinel" className="flex justify-center py-5">{isLoadingMore ? <Loader2 size={18} className="animate-spin text-[#d4af37]" /> : <p className="text-gray-500 text-xs">Rolando...</p>}</div>}
        </div>
      )}
      {activeTab === 'stories' && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center">
          {album.photos?.length > 0 && (
            <div className="relative w-full h-full sm:max-w-[400px] sm:max-h-[90vh] sm:rounded-[40px] bg-black overflow-hidden">
              <div className="absolute top-4 inset-x-0 z-30 px-4 flex justify-center">
                <div ref={storyBarsRef} style={{ display: 'flex', gap: '2px', overflowX: 'auto', maxWidth: 'calc(100% - 20px)' }}>
                  {album.photos.map((_, idx) => {
                    const distance = Math.abs(idx - currentStoryIdx);
                    const opacity = distance === 0 ? 1 : distance <= 3 ? 0.7 - distance * 0.1 : 0.1;
                    const barWidth = distance === 0 ? '10px' : distance <= 2 ? '6px' : '4px';
                    const width = idx < currentStoryIdx ? '100%' : idx === currentStoryIdx ? `${storyProgress * 100}%` : '0%';
                    return <div key={idx} style={{ minWidth: barWidth, width: barWidth, height: '3px', opacity }} className="bg-white/30 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full" style={{ width }} /></div>;
                  })}
                </div>
              </div>
              <div className="absolute top-8 inset-x-4 flex justify-between items-center z-30">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20 p-0.5"><img src={album.profileImage || album.photos[0]} className="w-full h-full object-cover rounded-full" /></div>
                  <div><span className="text-xs font-semibold text-white block">{album.clientName}</span><span className="text-[9px] text-white/80">{album.subtitle || 'Album'}</span></div>
                </div>
                <div className="flex gap-2.5 items-center">
                  {album.storyMusic && <button onClick={toggleMute} className="text-white">{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>}
                  <button onClick={() => setIsStoryPlaying(!isStoryPlaying)} className="text-white">{isStoryPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button>
                  <button onClick={() => { setIsStoryPlaying(false); setActiveTab('gallery'); }} className="text-white"><X size={22} /></button>
                </div>
              </div>
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950"><img src={album.photos[currentStoryIdx]} className="w-full h-full object-contain" /></div>
              <div className="absolute inset-0 z-20 flex">
                <div className="w-1/2 h-full cursor-pointer" onClick={() => handleStoryNavigation('prev')} />
                <div className="w-1/2 h-full cursor-pointer" onClick={() => handleStoryNavigation('next')} />
              </div>
            </div>
          )}
        </div>
      )}
      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)}>
          <button className="absolute top-5 right-5 text-white bg-white/10 p-2.5 rounded-full"><X size={22} /></button>
          <img src={lightboxPhoto} className="max-w-full max-h-[85vh] rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ALBUMLOADER
   ============================================================ */
function AlbumLoader({ shortId }) {
  const [album, setAlbum] = useState(null);
  const [status, setStatus] = useState('fetching');
  const [ap, setAp] = useState(0);
  const [vp, setVp] = useState(0);
  const [videoPreloaded, setVideoPreloaded] = useState(false);
  const videoPreloadRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await loadAlbumFromSheets(shortId);
        if (d) {
          setAlbum(d);
          setStatus('preloading');
          const urls = [d.loaderLogo, d.profileImage].concat(d.loaderBackgrounds || []).concat(d.photos || []).filter(Boolean);
          const videoUrl = d.introVideo;
          const totalItems = urls.length + (videoUrl ? 1 : 0);
          let loadedItems = 0;
          const updateProgress = () => { loadedItems++; setAp(Math.round((loadedItems / totalItems) * 100)); };
          urls.forEach((u) => { const img = new Image(); img.src = u; img.onload = updateProgress; img.onerror = updateProgress; });
          if (videoUrl) {
            const optimizedVideo = getOptimizedVideoUrl(videoUrl);
            const preloadVideo = document.createElement('video');
            preloadVideo.src = optimizedVideo;
            preloadVideo.preload = 'auto';
            preloadVideo.muted = true;
            preloadVideo.style.display = 'none';
            document.body.appendChild(preloadVideo);
            videoPreloadRef.current = preloadVideo;
            preloadVideo.load();
            let videoLoaded = false;
            preloadVideo.addEventListener('loadeddata', () => { if (!videoLoaded) { videoLoaded = true; setVideoPreloaded(true); updateProgress(); setTimeout(() => { if (videoPreloadRef.current) { document.body.removeChild(videoPreloadRef.current); videoPreloadRef.current = null; } }, 3000); } });
            preloadVideo.addEventListener('error', () => { if (!videoLoaded) { videoLoaded = true; updateProgress(); } });
            setTimeout(() => { if (!videoLoaded) { videoLoaded = true; updateProgress(); if (videoPreloadRef.current) { document.body.removeChild(videoPreloadRef.current); videoPreloadRef.current = null; } } }, 30000);
          }
          updateMetaTags(d);
        } else setStatus('error');
      } catch (e) { setStatus('error'); }
    })();
    return () => { if (videoPreloadRef.current) { try { document.body.removeChild(videoPreloadRef.current); } catch (e) {} videoPreloadRef.current = null; } };
  }, [shortId]);

  useEffect(() => {
    if (status !== 'preloading') return;
    const i = setInterval(() => {
      setVp((p) => {
        if (ap === 100) { if (p >= 100) { clearInterval(i); setTimeout(() => setStatus('ready'), 400); return 100; } return p + 1; }
        return p < ap ? p + 1 : p;
      });
    }, 50);
    return () => clearInterval(i);
  }, [status, ap]);

  if (status === 'error') return <div className="h-screen bg-black text-white flex flex-col items-center justify-center"><X size={48} className="text-red-500 mb-4"/><h2 className="text-xl">Album nao encontrado</h2></div>;
  if (status === 'fetching' || status === 'preloading') {
    const bg = album?.loaderBackgrounds?.length > 0 ? album.loaderBackgrounds : album?.photos || [];
    return (
      <div className="h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 opacity-20">
          {Array.from({ length: 15 }).map((_, i) => { const s = bg[i % (bg.length || 1)]; if (!s) return null; return <div key={i} className="aspect-square rounded-xl overflow-hidden bg-neutral-900"><img src={s} className="w-full h-full object-cover grayscale" /></div>; })}
        </div>
        <div className="relative z-10 text-center max-w-sm w-full">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#d4af37] bg-neutral-900 mx-auto mb-6 p-2">
            {album?.loaderLogo ? <img src={album.loaderLogo} className="w-full h-full object-contain" /> : album?.profileImage ? <img src={album.profileImage} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full bg-neutral-800 flex items-center justify-center rounded-full"><Camera size={24} className="text-neutral-600" /></div>}
          </div>
          <h2 className="text-2xl font-bold mb-1">{album?.clientName || 'Conectando...'}</h2>
          <p className="text-gray-400 text-sm mb-8">{album?.subtitle || 'Preparando experiencia...'}</p>
          <div className="space-y-3">
            <div className="flex justify-between text-xs"><span className="text-[#d4af37] font-bold animate-pulse">{status === 'preloading' ? 'Preparando Album' : 'Conectando...'}</span><span className="text-gray-400 font-mono">{vp}%</span></div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#d4af37] to-[#f3e5ab] rounded-full transition-all" style={{ width: vp + '%' }} /></div>
            {album?.introVideo && status === 'preloading' && <p className="text-[10px] text-gray-500">{videoPreloaded ? '✅ Vídeo carregado' : 'Carregando vídeo...'}</p>}
          </div>
        </div>
      </div>
    );
  }
  return <ClientApp album={album} />;
}

/* ============================================================
   ADMINDASHBOARD (dentro do shell — sem header próprio)
   ============================================================ */
function AdminDashboard({ albums, setAlbums, isLoading }) {
  const [copiedId, setCopiedId] = useState(null);

  const handleDeleteAlbum = (shortId) => {
    if (window.confirm('Excluir este álbum permanentemente? AS FOTOS SERÃO APAGADAS DO CLOUDINARY!')) {
      deleteAlbumFromSheets(shortId).then((success) => {
        if (success) { setAlbums(albums.filter((a) => a.shortId !== shortId)); alert('✅ Álbum e imagens excluídas!'); }
        else alert('❌ Erro ao excluir.');
      }).catch(() => alert('❌ Erro ao conectar.'));
    }
  };

  const handleSendEmail = (album) => {
    if (!album.clientEmail) { alert('❌ Álbum sem e-mail cadastrado! Edite e adicione um e-mail.'); return; }
    if (window.confirm(`Deseja enviar o e-mail de acesso para ${album.clientEmail}?`)) {
      sendEmailFromSheets(album).then((success) => {
        if (success) alert('✅ E-mail enviado com sucesso!');
        else alert('❌ Erro ao enviar e-mail.');
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold">Os Meus Envios</h2>
          <p className="text-gray-500 text-xs mt-0.5">Albuns armazenados de forma permanente.</p>
        </div>
        <button onClick={() => { window.location.hash = '#new'; }} className="bg-black text-white px-4 py-2 rounded-full font-medium flex items-center gap-1.5 hover:bg-gray-800 text-xs sm:text-sm">
          <Plus size={14} /> <span className="hidden sm:inline">Criar Album</span>
        </button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={36} className="animate-spin text-gray-400" /></div>
      ) : albums.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <div className="bg-gray-100 rounded-full p-3 mb-3 inline-block"><ImageIcon size={36} className="text-gray-400" /></div>
          <h3 className="text-base font-semibold text-gray-700">Nenhum album criado</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((album) => {
            const expired = isAlbumExpired(album);
            const daysLeft = getDaysRemaining(album);
            return (
              <div key={album.id} className={`bg-white rounded-2xl shadow-sm border p-4 flex flex-col ${expired ? 'border-red-300' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100"><img src={album.profileImage || (album.photos && album.photos[0])} className="w-full h-full object-cover" /></div>
                  <div className="flex-1"><h3 className="font-semibold text-base truncate">{album.clientName}</h3><p className="text-xs text-gray-500">{album.subtitle}</p></div>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl text-xs text-gray-600 mb-1.5">📸 {(album.photos || []).length} fotos | 🔑 ID: {album.shortId}</div>
                {album.expiryDate && <div className={`rounded-lg p-2 mb-2 flex items-center gap-1.5 text-[10px] ${expired ? 'bg-red-100 text-red-700' : daysLeft <= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}><Clock size={12} /><span>{expired ? 'Expirado' : daysLeft + ' dia(s) restantes'}</span></div>}
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex gap-1">
                    <button onClick={() => { window.location.hash = '#edit_' + album.id; }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg"><Edit3 size={16} /></button>
                    <button onClick={() => handleSendEmail(album)} className="p-1.5 text-gray-400 hover:text-[#00965e] rounded-lg"><Mail size={16} /></button>
                    <button onClick={() => handleDeleteAlbum(album.shortId)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                  <button onClick={() => { const url = window.location.origin + '/api/share?id=' + album.shortId; navigator.clipboard.writeText(url); setCopiedId(album.id); setTimeout(() => setCopiedId(null), 2000); }} className={`px-3 py-1.5 rounded-full font-medium text-xs flex items-center gap-1 ${copiedId === album.id ? 'bg-green-500 text-white' : 'bg-black text-white'}`}>
                    {copiedId === album.id ? <CheckCircle size={11} /> : <LinkIcon size={11} />}Copiar Link
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ADMINEDITOR
   ============================================================ */
function AdminEditor({ album, onSave, onCancel }) {
  const isNew = !album;
  const [formData, setFormData] = useState(album || {
    id: 'album_' + Math.random().toString(36).substr(2, 9),
    shortId: generateShortId(), clientName: '', subtitle: '', clientEmail: '', pin: '',
    profileImage: '', googleDriveUrl: '', whatsappNumber: '', storyMusic: '',
    musicStartTime: null, musicEndTime: null, introVideo: '', expiryDate: '',
    photos: [], featuredPhotos: [], loaderLogo: '', loaderBackgrounds: [],
    createdAt: new Date().toISOString()
  });
  const [activeTab, setActiveTab] = useState('dados');
  const [up, setUp] = useState(formData.photos || []);
  const [sf, setSf] = useState(formData.featuredPhotos || []);
  const [sp, setSp] = useState(formData.profileImage || '');
  const [ll, setLl] = useState(formData.loaderLogo || '');
  const [lb, setLb] = useState(formData.loaderBackgrounds || []);
  const [smf, setSmf] = useState(null);
  const [smp, setSmp] = useState(formData.storyMusic || '');
  const [mst, setMst] = useState(formData.musicStartTime || 0);
  const [met, setMet] = useState(formData.musicEndTime || null);
  const [ad, setAd] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(formData.introVideo || '');
  const [iu, setIu] = useState(false);
  const [upr, setUpr] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const f2b = (f) => new Promise((r, j) => { const rd = new FileReader(); rd.readAsDataURL(f); rd.onload = () => r(rd.result); rd.onerror = j; });
  const ri = (b64, mw = 1200) => new Promise((r) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); let w = img.width, h = img.height; if (w > mw) { h = (h * mw) / w; w = mw; } c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); r(c.toDataURL('image/jpeg', 0.8)); }; img.src = b64; });

  const hfu = async (e) => { const fs = Array.from(e.target.files); if (!fs.length) return; setIu(true); const np = up.slice(); let p = 0; for (const f of fs) { if (f.type.startsWith('image/')) { try { let b = await f2b(f); b = await ri(b, 1200); np.push(b); } catch (_) {} } p++; setUpr(Math.round((p / fs.length) * 100)); } setUp(np); setIu(false); setUpr(0); e.target.value = ''; };
  const hlu = async (e) => { const f = e.target.files[0]; if (!f) return; if (f.type.startsWith('image/')) { let b = await f2b(f); b = await ri(b, 800); setLl(b); } e.target.value = ''; };
  const hlbu = async (e) => { const fs = Array.from(e.target.files); if (!fs.length) return; setIu(true); const nb = lb.slice(); let p = 0; for (const f of fs) { if (f.type.startsWith('image/')) { let b = await f2b(f); b = await ri(b, 800); nb.push(b); } p++; setUpr(Math.round((p / fs.length) * 100)); } setLb(nb); setIu(false); setUpr(0); e.target.value = ''; };
  const hmu = (e) => { const f = e.target.files[0]; if (!f) return; if (f.type.startsWith('audio/')) { setSmf(f); const u = URL.createObjectURL(f); setSmp(u); const a = new Audio(u); a.addEventListener('loadedmetadata', () => { setAd(a.duration); if (!met) setMet(a.duration); }); a.load(); } e.target.value = ''; };
  const hvu = (e) => { const f = e.target.files[0]; if (!f) return; if (f.type.startsWith('video/')) { setVideoFile(f); setVideoPreview(URL.createObjectURL(f)); } else alert('Selecione um arquivo de vídeo'); e.target.value = ''; };
  const hrv = () => { setVideoFile(null); setVideoPreview(''); };
  const hrm = () => { setSmf(null); setSmp(''); setMst(0); setMet(null); setAd(null); };
  const hrp = (i) => { const np = up.slice(); np.splice(i, 1); setUp(np); if (sf.indexOf(i) !== -1) setSf(sf.filter((x) => x !== i)); if (sp === up[i]) setSp(''); };

  const hs = async (e) => {
    e.preventDefault();
    if (!formData.clientName) { alert("Preencha o Nome do Cliente."); return; }
    if (!formData.googleDriveUrl) { alert("Insira o link do Google Drive."); return; }
    if (!up.length) { alert("Selecione pelo menos uma foto."); return; }
    setIsSaving(true); setUpr(0); setUploadStatus('Iniciando...');
    try {
      const aid = formData.shortId, urls = [];
      const total = up.length + (smf ? 1 : 0) + (videoFile ? 1 : 0) + (ll && ll.indexOf('http') !== 0 ? 1 : 0) + (lb || []).length;
      let step = 0;
      for (const ph of up) {
        if (ph.startsWith('http')) { urls.push(ph); step++; continue; }
        const u = await uploadToCloudinary(ph, aid, 'image');
        if (!u) throw new Error("Falha ao enviar imagem.");
        urls.push(u); step++; setUpr(Math.round((step / total) * 100)); setUploadStatus('Enviando fotos...');
      }
      let fM = smp;
      if (smf) { setUploadStatus('Enviando musica...'); fM = await uploadToCloudinary(smf, aid, 'audio'); if (!fM) throw new Error("Falha ao enviar musica."); step++; setUpr(Math.round((step / total) * 100)); }
      let fVideo = videoPreview;
      if (videoFile) { setUploadStatus('Enviando video...'); setUpr(Math.round((step / total) * 100)); fVideo = await uploadToCloudinary(videoFile, aid, 'video'); if (!fVideo) throw new Error("Falha ao enviar video."); step++; setUpr(Math.round((step / total) * 100)); }
      let fL = ll;
      if (ll && ll.indexOf('http') !== 0) { fL = await uploadToCloudinary(ll, aid, 'image'); if (!fL) throw new Error("Falha ao enviar logo."); step++; }
      const fBgs = [];
      for (const bg of (lb || [])) {
        if (bg.startsWith('http')) fBgs.push(bg);
        else { const ub = await uploadToCloudinary(bg, aid, 'image'); if (!ub) throw new Error("Falha ao enviar fundo."); fBgs.push(ub); }
        step++;
      }
      const uf = [];
      for (const oi of sf) { const ni = urls.findIndex((u) => u === up[oi]); if (ni !== -1) uf.push(ni); }
      let fP = sp;
      if (sp && sp.indexOf('http') !== 0) { const pi = urls.findIndex((u) => u === sp); fP = pi !== -1 ? urls[pi] : urls[0]; }
      else if (!fP && urls.length) fP = urls[0];
      const fd = { ...formData, photos: urls, featuredPhotos: uf, profileImage: fP, loaderLogo: fL, loaderBackgrounds: fBgs, storyMusic: fM || '', musicStartTime: mst || 0, musicEndTime: met || ad || null, introVideo: fVideo || '', expiryDate: formData.expiryDate || '', updatedAt: new Date().toISOString() };
      setUpr(95); setUploadStatus('Salvando na planilha...');
      if (await saveAlbumToSheets(fd)) { setUpr(100); setUploadStatus('✅ Concluído!'); setTimeout(() => onSave(fd), 500); }
      else throw new Error("Falha ao salvar.");
    } catch (er) { alert('Erro: ' + er.message); }
    finally { setIsSaving(false); setUpr(0); setUploadStatus(''); }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] py-6 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold flex items-center gap-2">{isNew ? <Plus size={20} /> : <Edit3 size={20} />}{isNew ? 'Criar Novo Album' : 'Editar Album'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={hs} className="p-5 space-y-5">
          <div className="flex gap-4 border-b border-gray-100">
            <button type="button" onClick={() => setActiveTab('dados')} className={`pb-2.5 font-semibold flex items-center gap-1.5 border-b-2 text-sm ${activeTab === 'dados' ? 'text-[#d4af37] border-[#d4af37]' : 'text-gray-400 border-transparent'}`}><FileText size={16} /> Dados</button>
            <button type="button" onClick={() => setActiveTab('personalizar')} className={`pb-2.5 font-semibold flex items-center gap-1.5 border-b-2 text-sm ${activeTab === 'personalizar' ? 'text-[#d4af37] border-[#d4af37]' : 'text-gray-400 border-transparent'}`}><Settings size={16} /> Personalizar</button>
          </div>

          {activeTab === 'dados' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Nome do Cliente</label><input type="text" value={formData.clientName} onChange={(e) => setFormData({ ...formData, clientName: e.target.value })} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50" placeholder="Ex: Casamento Joao & Maria" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Subtitulo</label><input type="text" value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50" placeholder="Ex: 15 de Outubro, 2026" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label><input type="email" value={formData.clientEmail || ''} onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">PIN de Acesso</label><input type="text" value={formData.pin} onChange={(e) => setFormData({ ...formData, pin: e.target.value })} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Link do Google Drive</label><input type="url" value={formData.googleDriveUrl} onChange={(e) => setFormData({ ...formData, googleDriveUrl: e.target.value })} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">📱 WhatsApp</label><input type="tel" value={formData.whatsappNumber || ''} onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50" /></div>
              <div className="p-4 border border-orange-200 rounded-xl bg-orange-50/30"><label className="block text-sm font-semibold mb-1.5">📅 Prazo de Expiracao</label><input type="date" value={formData.expiryDate || ''} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} className="w-full border border-orange-200 rounded-lg p-2.5 text-sm bg-white" /></div>
              <div className="p-4 border border-blue-200 rounded-xl bg-blue-50/30">
                <label className="block text-sm font-semibold mb-1.5">🎬 Video de Abertura</label>
                {videoPreview ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-blue-200"><Video size={18} className="text-blue-600" /><div className="flex-1"><p className="text-xs font-medium">{videoFile ? videoFile.name : 'Video carregado'}</p></div><button type="button" onClick={hrv} className="text-red-500 p-1"><Trash2 size={14} /></button></div>
                    <video controls className="w-full rounded-lg" src={videoPreview} style={{ maxHeight: '200px' }} />
                  </div>
                ) : (
                  <label className="cursor-pointer inline-block"><div className="bg-blue-600 text-white text-xs font-semibold rounded-full py-2 px-4 flex items-center gap-1.5"><Video size={14} /> Selecionar Video (MP4)</div><input type="file" accept="video/*" onChange={hvu} className="hidden" disabled={iu || isSaving} /></label>
                )}
              </div>
              <div className="p-4 border border-purple-200 rounded-xl bg-purple-50/30">
                <label className="block text-sm font-semibold mb-1.5">🎵 Musica dos Stories</label>
                {smp ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-purple-200"><Music size={18} className="text-purple-600" /><div className="flex-1"><p className="text-xs font-medium">{smf ? smf.name : 'Musica carregada'}</p></div><button type="button" onClick={hrm} className="text-red-500 p-1"><Trash2 size={14} /></button></div>
                    <audio controls className="w-full" src={smp} />
                    <AudioTrimmer audioUrl={smp} startTime={mst} endTime={met || ad} duration={ad} onStartChange={setMst} onEndChange={setMet} />
                  </div>
                ) : (
                  <label className="cursor-pointer inline-block"><div className="bg-purple-600 text-white text-xs font-semibold rounded-full py-2 px-4 flex items-center gap-1.5"><Music size={14} /> Selecionar Musica (MP3)</div><input type="file" accept="audio/*" onChange={hmu} className="hidden" /></label>
                )}
              </div>
              <div className="p-4 border-2 border-dashed border-[#d4af37] rounded-xl bg-yellow-50/20">
                <label className="block text-sm font-semibold mb-2">📸 Fotos da Galeria</label>
                <label className="cursor-pointer"><div className="w-full bg-[#d4af37] text-black font-semibold rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 text-sm"><FolderUp size={16} />Selecionar Fotos</div><input type="file" accept="image/*" multiple onChange={hfu} className="hidden" /></label>
                {up.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium mb-2">{up.length} foto(s)</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-80 overflow-y-auto p-1.5">
                      {up.map((p, i) => (<div key={i} className="relative group"><img src={p} className="w-full aspect-square object-cover rounded-lg border" /><button type="button" onClick={() => hrp(i)} className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><Trash2 size={10} /></button></div>))}
                    </div>
                  </div>
                )}
              </div>
              {up.length > 0 && (
                <>
                  <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                    <label className="block text-sm font-semibold mb-2">📷 Foto de Perfil</label>
                    <div className="flex justify-center mb-3"><div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#d4af37] p-0.5">{sp ? <img src={sp} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full bg-neutral-800 rounded-full flex items-center justify-center"><Camera size={24} className="text-gray-400" /></div>}</div></div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-72 overflow-y-auto">
                      {up.slice(0, 50).map((p, i) => (<div key={i} onClick={() => setSp(p)} className={`relative cursor-pointer rounded-lg overflow-hidden ${sp === p ? 'ring-2 ring-[#d4af37]' : ''}`}><img src={p} className="w-full aspect-square object-cover" />{sp === p && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><CheckCircle size={20} className="text-[#d4af37]" /></div>}</div>))}
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                    <label className="block text-sm font-semibold mb-2">⭐ Fotos em Destaque</label>
                    <p className="text-xs text-gray-500 mb-3">Selecione ate 5 fotos para o fundo da tela de PIN</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-72 overflow-y-auto">
                      {up.slice(0, 50).map((p, i) => { const isSel = sf.indexOf(i) !== -1; return (<div key={i} onClick={() => { if (isSel) setSf(sf.filter((x) => x !== i)); else if (sf.length < 5) setSf([...sf, i]); }} className={`relative cursor-pointer rounded-lg overflow-hidden ${isSel ? 'ring-2 ring-[#d4af37]' : ''}`}><img src={p} className="w-full aspect-square object-cover" />{isSel && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><CheckCircle size={20} className="text-[#d4af37]" /></div>}</div>); })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'personalizar' && (
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                <label className="block text-sm font-semibold mb-2">Logomarca</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#d4af37] bg-neutral-900 flex items-center justify-center p-1.5">{ll ? <img src={ll} className="w-full h-full object-contain" /> : <Camera size={28} className="text-gray-600" />}</div>
                  <div>
                    <label className="cursor-pointer"><div className="bg-black text-white text-xs font-semibold rounded-full py-2 px-4 flex items-center gap-1.5"><Upload size={14} /> Enviar Logo</div><input type="file" accept="image/*" onChange={hlu} className="hidden" /></label>
                    {ll && <button type="button" onClick={() => setLl('')} className="text-red-500 text-xs mt-1.5">Remover</button>}
                  </div>
                </div>
              </div>
              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                <label className="block text-sm font-semibold mb-2">Imagens de Fundo</label>
                <label className="cursor-pointer inline-block mb-3"><div className="bg-black text-white text-xs font-semibold rounded-full py-2 px-4 flex items-center gap-1.5"><Grid size={14} /> Adicionar Imagens</div><input type="file" accept="image/*" multiple onChange={hlbu} className="hidden" /></label>
                {lb.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1.5 border bg-white rounded-lg">{lb.map((bg, i) => (<div key={i} className="relative group"><img src={bg} className="w-full aspect-square object-cover rounded-md" /><button type="button" onClick={() => setLb(lb.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><Trash2 size={10} /></button></div>))}</div>}
              </div>
            </div>
          )}

          {(iu || isSaving) && (
            <div>
              <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-[#d4af37] h-1.5 rounded-full" style={{ width: upr + '%' }}></div></div>
              <p className="text-xs text-gray-500 text-center mt-1">{uploadStatus || 'Salvando... ' + upr + '%'}</p>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-black hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{isNew ? 'Criar Album' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
