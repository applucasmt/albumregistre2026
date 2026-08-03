import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Camera, Plus, Trash2, Edit3, Link as LinkIcon, Eye, 
  PlayCircle, Grid, Download, ArrowRight, Lock, 
  Pause, Play, Image as ImageIcon, CheckCircle, X, Loader2,
  Save, FolderUp, MessageCircle, Settings, FileText, Upload, Music, Volume2, VolumeX,
  Video, SkipForward, Scissors, Clock, AlertTriangle, Calendar,
  Share2, LogIn, LogOut, User
} from 'lucide-react';

const CLOUDINARY_CONFIG = {
  cloudName: 'gyzeubzm',
  uploadPreset: 'album_uploads',
  folder: 'albums'
};

const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwaNkmrY33Uf57_U1w5u1DRxNegt1xff9Us5hvicZiMVcXQj4d4Fe-wqwL_tSLdreY/exec';

const ADMIN_CREDENTIALS = {
  username: 'registre',
  password: 'registre2026@'
};

function extractDriveId(url) {
  if (!url) return null;
  const patterns = [/\/d\/([a-zA-Z0-9_-]+)/, /id=([a-zA-Z0-9_-]+)/, /\/file\/d\/([a-zA-Z0-9_-]+)/, /open\?id=([a-zA-Z0-9_-]+)/];
  for (const pattern of patterns) { const match = url.match(pattern); if (match) return match[1]; }
  return null;
}

function getDrivePreviewUrl(url) {
  const fileId = extractDriveId(url);
  if (fileId) return 'https://drive.google.com/file/d/' + fileId + '/preview';
  return url;
}

function detectVideoOrientation(url) {
  if (!url) return 'vertical';
  if (url.toLowerCase().indexOf('horizontal') !== -1 || url.toLowerCase().indexOf('landscape') !== -1) return 'horizontal';
  return 'vertical';
}

function uploadVideoToCloudinary(file, albumId) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    var formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', CLOUDINARY_CONFIG.folder + '/' + albumId);
    xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CONFIG.cloudName + '/video/upload', true);
    xhr.onload = function() { if (xhr.status >= 200 && xhr.status < 300) { var data = JSON.parse(xhr.responseText); resolve(data.secure_url); } else { reject(new Error('Erro no upload do video')); } };
    xhr.onerror = function() { reject(new Error('Erro de rede ao enviar video')); };
    xhr.send(formData);
  });
}

async function uploadToCloudinary(file, albumId, resourceType) {
  resourceType = resourceType || 'image';
  if (typeof file === 'string' && file.startsWith('http') && file.indexOf('cloudinary') !== -1) return file;
  if (resourceType === 'video' && file instanceof File) { return await uploadVideoToCloudinary(file, albumId); }
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', CLOUDINARY_CONFIG.folder + '/' + albumId);
    const response = await fetch('https://api.cloudinary.com/v1_1/' + CLOUDINARY_CONFIG.cloudName + '/' + resourceType + '/upload', { method: 'POST', body: formData });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error?.message || 'Erro no upload'); }
    const data = await response.json();
    return data.secure_url;
  } catch (error) { console.error('Erro no upload:', error); throw error; }
}

function updateFavicon(photoUrl) {
  if (!photoUrl) return;
  var existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
  existingFavicons.forEach(function(el) { el.remove(); });
  var canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  var ctx = canvas.getContext('2d');
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI * 2); ctx.closePath(); ctx.clip(); ctx.drawImage(img, 0, 0, 64, 64);
    var faviconUrl = canvas.toDataURL('image/png');
    var favicon = document.createElement('link'); favicon.rel = 'icon'; favicon.type = 'image/png'; favicon.href = faviconUrl; document.head.appendChild(favicon);
    var shortcutIcon = document.createElement('link'); shortcutIcon.rel = 'shortcut icon'; shortcutIcon.type = 'image/png'; shortcutIcon.href = faviconUrl; document.head.appendChild(shortcutIcon);
    var appleIcon = document.createElement('link'); appleIcon.rel = 'apple-touch-icon'; appleIcon.href = faviconUrl; document.head.appendChild(appleIcon);
  };
  img.onerror = function() {
    var fallbackUrl = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📸</text></svg>';
    var favicon = document.createElement('link'); favicon.rel = 'icon'; favicon.href = fallbackUrl; document.head.appendChild(favicon);
  };
  img.src = photoUrl;
}

function updateMetaTags(album) {
  if (!album) return;
  var rawPhotoUrl = album.profileImage || (album.photos && album.photos[0]) || '';
  var photoUrl = rawPhotoUrl;
  if (rawPhotoUrl.indexOf('cloudinary') !== -1) {
    var parts = rawPhotoUrl.split('/upload/');
    if (parts.length === 2) { photoUrl = parts[0] + '/upload/c_fill,w_1200,h_630,q_80/' + parts[1]; }
  }
  document.title = album.clientName || 'Album';
  const metaTags = [
    { property: 'og:title', content: album.clientName || 'Album Fotografico' },
    { property: 'og:description', content: album.subtitle || 'Veja minhas fotos neste album exclusivo' },
    { property: 'og:image', content: photoUrl },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:secure_url', content: photoUrl },
    { property: 'og:url', content: window.location.href },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: album.clientName || 'Album Fotografico' },
    { name: 'twitter:description', content: album.subtitle || '' },
    { name: 'twitter:image', content: photoUrl },
    { name: 'description', content: album.subtitle || '' }
  ];
  metaTags.forEach(function(tag) {
    var attr = tag.property ? 'property' : 'name';
    var meta = document.querySelector('meta[' + attr + '="' + (tag.property || tag.name) + '"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute(attr, tag.property || tag.name); document.head.appendChild(meta); }
    meta.setAttribute('content', tag.content);
  });
  updateFavicon(photoUrl);
}

const saveAlbumToSheets = async function(album) { try { const response = await fetch(SHEETS_API_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'save', id: album.shortId, album: album }) }); return (await response.json()).success; } catch (e) { return false; } };
const deleteAlbumFromSheets = async function(shortId) { try { const response = await fetch(SHEETS_API_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'delete', id: shortId }) }); return (await response.json()).success; } catch (e) { return false; } };
const loadAlbumFromSheets = async function(shortId) { try { const response = await fetch(SHEETS_API_URL + '?id=' + shortId); const data = await response.json(); return data.success && data.album ? data.album : null; } catch (e) { return null; } };
const loadAllAlbumsFromSheets = async function() { try { const response = await fetch(SHEETS_API_URL); const data = await response.json(); return data.success && data.albums ? data.albums : {}; } catch (e) { return {}; } };
const generateShortId = function() { return Math.random().toString(36).substring(2, 8); };

function isAlbumExpired(album) { if (!album) return false; if (album._isExpired === true) return true; if (album._isExpired === false) return false; if (album.expiryDate) { var now = new Date(); var expiry = new Date(album.expiryDate); return now > expiry; } return false; }
function formatExpiryDate(album) { var dateStr = album._expiryDate || album.expiryDate; if (!dateStr) return null; try { var d = new Date(dateStr); return d.toLocaleDateString('pt-BR'); } catch (e) { return dateStr; } }
function getDaysRemaining(album) { var dateStr = album._expiryDate || album.expiryDate; if (!dateStr) return null; try { var now = new Date(); var expiry = new Date(dateStr); var diff = expiry.getTime() - now.getTime(); return Math.ceil(diff / (1000 * 60 * 60 * 24)); } catch (e) { return null; } }

// Função de compartilhamento - envia link de preview do Google Apps Script
async function sharePhoto(photoUrl, album) {
  try {
    // Link de preview que gera HTML com meta tags (funciona no WhatsApp/Instagram)
    var previewUrl = SHEETS_API_URL + '?id=' + album.shortId + '&action=preview';
    // Link normal para navegadores
    var normalUrl = window.location.origin + '/#/album/' + album.shortId;
    
    const response = await fetch(photoUrl);
    const blob = await response.blob();
    const file = new File([blob], 'foto.jpg', { type: 'image/jpeg' });
    
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ 
        files: [file], 
        title: album.clientName || 'Álbum Fotográfico', 
        text: '📸 ' + (album.clientName || 'Álbum Fotográfico') + '\n' + (album.subtitle || '') + '\n\nVeja o álbum completo: ' + normalUrl
      });
    } else if (navigator.share) {
      await navigator.share({ 
        title: album.clientName || 'Álbum Fotográfico', 
        text: '📸 ' + (album.clientName || 'Álbum Fotográfico') + '\n' + (album.subtitle || '') + '\n\nVeja o álbum completo: ' + normalUrl, 
        url: previewUrl
      });
    } else {
      var text = encodeURIComponent('📸 ' + (album.clientName || 'Álbum Fotográfico') + '\n' + (album.subtitle || '') + '\n\nVeja o álbum completo: ' + normalUrl);
      window.open('https://wa.me/?text=' + text, '_blank');
    }
  } catch (error) { console.log('Compartilhamento cancelado:', error); }
}

function SharePopup(props) {
  if (!props.isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={props.onClose}>
      <div style={{ background: '#1a1a1a', borderRadius: '24px', padding: '28px 24px', maxWidth: '340px', width: '90%', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={function(e) { e.stopPropagation(); }}>
        <h3 style={{ color: 'white', fontSize: '1.15rem', fontWeight: 600, marginBottom: '4px' }}>Compartilhar Foto</h3>
        <div style={{ width: '140px', height: '140px', borderRadius: '12px', overflow: 'hidden', margin: '0 auto 20px', border: '2px solid rgba(255,255,255,0.1)' }}><img src={props.photoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
        <button onClick={function() { sharePhoto(props.photoUrl, props.album); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'linear-gradient(135deg, #d4af37, #c4a137)', color: '#000', border: 'none', borderRadius: '16px', padding: '14px 20px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', width: '100%', marginBottom: '12px' }}><Share2 size={20} /> Compartilhar Agora</button>
        <button onClick={props.onClose} style={{ background: 'rgba(255,255,255,0.08)', color: '#ccc', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '0.85rem', cursor: 'pointer', width: '100%' }}>Cancelar</button>
      </div>
    </div>
  );
}

function AudioTrimmer(props) {
  var audioUrl = props.audioUrl, startTime = props.startTime, endTime = props.endTime, duration = props.duration, onStartChange = props.onStartChange, onEndChange = props.onEndChange;
  var _useState = useState(duration || 0), audioDuration = _useState[0], setAudioDuration = _useState[1];
  var trackRef = useRef(null), previewAudioRef = useRef(null);
  useEffect(function() { if (!duration && audioUrl) { var a = new Audio(audioUrl); a.addEventListener('loadedmetadata', function() { setAudioDuration(a.duration); }); a.load(); } }, [audioUrl, duration]);
  var maxDuration = audioDuration || 60;
  var startPercent = ((startTime || 0) / maxDuration) * 100;
  var endPercent = endTime ? (endTime / maxDuration) * 100 : 100;
  var playPreview = function(s, e) { if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; } var a = new Audio(audioUrl); a.currentTime = s; a.volume = 0.7; previewAudioRef.current = a; a.play(); var stop = function() { if (a.currentTime >= e) { a.pause(); a.removeEventListener('timeupdate', stop); } }; a.addEventListener('timeupdate', stop); setTimeout(function() { if (a && !a.paused) a.pause(); }, 5000); };
  var _useState2 = useState(null), isDragging = _useState2[0], setIsDragging = _useState2[1];
  var handleMouseDown = function(h, e) { e.stopPropagation(); setIsDragging(h); var mm = function(e) { if (!trackRef.current) return; var r = trackRef.current.getBoundingClientRect(); var x = Math.max(0, Math.min(e.clientX - r.left, r.width)); var t = (x / r.width) * maxDuration; if (h === 'start') { if (t < (endTime || maxDuration)) onStartChange(Math.max(0, t)); } else { if (t > (startTime || 0)) onEndChange(Math.min(maxDuration, t)); } }; var mu = function() { setIsDragging(null); playPreview(startTime || 0, endTime || maxDuration); document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); }; document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu); };
  var handleTouchStart = function(h, e) { e.stopPropagation(); setIsDragging(h); var tm = function(e) { if (!trackRef.current) return; var r = trackRef.current.getBoundingClientRect(); var x = Math.max(0, Math.min(e.touches[0].clientX - r.left, r.width)); var t = (x / r.width) * maxDuration; if (h === 'start') { if (t < (endTime || maxDuration)) onStartChange(Math.max(0, t)); } else { if (t > (startTime || 0)) onEndChange(Math.min(maxDuration, t)); } }; var tu = function() { setIsDragging(null); playPreview(startTime || 0, endTime || maxDuration); document.removeEventListener('touchmove', tm); document.removeEventListener('touchend', tu); }; document.addEventListener('touchmove', tm); document.addEventListener('touchend', tu); };
  var sd = (endTime || maxDuration) - (startTime || 0);
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl p-4 border border-purple-100">
        <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Scissors size={16} className="text-purple-600" /><span className="text-sm font-medium text-gray-700">Selecionar trecho</span></div><div className="flex items-center gap-3"><span className="text-xs text-purple-600 font-medium">{sd.toFixed(1)}s</span><button type="button" onClick={function() { playPreview(startTime || 0, endTime || maxDuration); }} className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full"><Play size={12} fill="currentColor" /> Preview</button></div></div>
        <div ref={trackRef} className="relative h-14 bg-gray-100 rounded-lg cursor-pointer overflow-hidden select-none">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-200/30 to-purple-400/30" /><div className="absolute top-0 bottom-0 bg-gradient-to-r from-purple-500/50 to-purple-600/50 border-l-2 border-r-2 border-purple-500" style={{ left: startPercent + '%', width: (endPercent - startPercent) + '%' }} />
          <div className="absolute top-0 bottom-0 w-5 cursor-ew-resize z-10 flex items-center justify-center" style={{ left: 'calc(' + startPercent + '% - 10px)' }} onMouseDown={function(e) { handleMouseDown('start', e); }} onTouchStart={function(e) { handleTouchStart('start', e); }}><div className="w-2 h-10 bg-white rounded-full shadow-lg border border-purple-300" /><div className="absolute -top-5 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">{(startTime || 0).toFixed(1)}s</div></div>
          <div className="absolute top-0 bottom-0 w-5 cursor-ew-resize z-10 flex items-center justify-center" style={{ left: 'calc(' + endPercent + '% - 10px)' }} onMouseDown={function(e) { handleMouseDown('end', e); }} onTouchStart={function(e) { handleTouchStart('end', e); }}><div className="w-2 h-10 bg-white rounded-full shadow-lg border border-purple-300" /><div className="absolute -top-5 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">{(endTime || maxDuration).toFixed(1)}s</div></div>
        </div>
        <div className="flex justify-between mt-1.5 px-1"><span className="text-[10px] text-gray-400">0s</span><span className="text-[10px] text-gray-400">{maxDuration.toFixed(0)}s</span></div>
      </div>
    </div>
  );
}

function LoginScreen(props) {
  var onLogin = props.onLogin;
  var _useStateLogin = useState(''), username = _useStateLogin[0], setUsername = _useStateLogin[1];
  var _useStateLogin2 = useState(''), password = _useStateLogin2[0], setPassword = _useStateLogin2[1];
  var _useStateLogin3 = useState(false), loginError = _useStateLogin3[0], setLoginError = _useStateLogin3[1];
  var handleLogin = function(e) { e.preventDefault(); if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) { sessionStorage.setItem('adminLoggedIn', 'true'); onLogin(true); setLoginError(false); } else { setLoginError(true); setPassword(''); } };
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8"><div className="bg-[#d4af37] p-4 rounded-2xl inline-block mb-4"><Camera size={32} className="text-black" /></div><h1 className="text-2xl font-bold text-white mb-1">Studio Dashboard</h1><p className="text-gray-400 text-sm">Área restrita</p></div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-400 mb-1.5">Usuário</label><div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" value={username} onChange={function(e) { setUsername(e.target.value); }} placeholder="Digite seu usuário" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-white outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent transition-all placeholder:text-gray-600" /></div></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1.5">Senha</label><div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input type="password" value={password} onChange={function(e) { setPassword(e.target.value); }} placeholder="Digite sua senha" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-white outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent transition-all placeholder:text-gray-600" /></div></div>
          {loginError && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2"><AlertTriangle size={16} className="text-red-400" /><p className="text-red-400 text-xs">Usuário ou senha inválidos.</p></div>}
          <button type="submit" className="w-full bg-[#d4af37] hover:bg-[#c4a137] text-black font-bold p-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg mt-6"><LogIn size={18} /> Entrar</button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  var _useState3 = useState(window.location.hash), hash = _useState3[0], setHash = _useState3[1];
  var _useState4 = useState([]), albums = _useState4[0], setAlbums = _useState4[1];
  var _useState5 = useState(true), isLoading = _useState5[0], setIsLoading = _useState5[1];
  var _useStateAuth = useState(function() { return sessionStorage.getItem('adminLoggedIn') === 'true'; }), isAdminLoggedIn = _useStateAuth[0], setIsAdminLoggedIn = _useStateAuth[1];
  useEffect(function() { var oh = function() { setHash(window.location.hash); }; window.addEventListener('hashchange', oh); return function() { window.removeEventListener('hashchange', oh); }; }, []);
  useEffect(function() { (async function() { setIsLoading(true); setAlbums(Object.values(await loadAllAlbumsFromSheets())); setIsLoading(false); })(); }, [hash]);
  if (hash.startsWith('#/album/')) return <AlbumLoader shortId={hash.replace('#/album/', '')} />;
  if (hash === '#new' || hash.startsWith('#edit_') || hash === '' || hash === '#') { if (!isAdminLoggedIn) { return <LoginScreen onLogin={function(loggedIn) { setIsAdminLoggedIn(loggedIn); }} />; } }
  if (hash === '#new') return <AdminEditor onSave={function(a) { setAlbums([a, ...albums]); window.location.hash = ''; }} onCancel={function() { window.location.hash = ''; }} />;
  if (hash.startsWith('#edit_')) { var album = albums.find(function(a) { return a.id === hash.replace('#edit_', ''); }); return <AdminEditor album={album} onSave={function(u) { setAlbums(albums.map(function(a) { return a.id === u.id ? u : a; })); window.location.hash = ''; }} onCancel={function() { window.location.hash = ''; }} />; }
  return <AdminDashboard albums={albums} setAlbums={setAlbums} isLoading={isLoading} isAdminLoggedIn={isAdminLoggedIn} setIsAdminLoggedIn={setIsAdminLoggedIn} />;
}

function ClientApp(props) {
  var album = props.album;
  var _useState6 = useState(''), pinInput = _useState6[0], setPinInput = _useState6[1];
  var _useState7 = useState(!album.pin), isAuthenticated = _useState7[0], setIsAuthenticated = _useState7[1];
  var _useState8 = useState(false), pinError = _useState8[0], setPinError = _useState8[1];
  var _useState9 = useState(album.introVideo ? 'video' : 'stories'), activeTab = _useState9[0], setActiveTab = _useState9[1];
  var _useState10 = useState(0), currentStoryIdx = _useState10[0], setCurrentStoryIdx = _useState10[1];
  var _useState11 = useState(true), isStoryPlaying = _useState11[0], setIsStoryPlaying = _useState11[1];
  var _useState12 = useState(0), storyProgress = _useState12[0], setStoryProgress = _useState12[1];
  var storyTimerRef = useRef(null), storyStartTimeRef = useRef(null);
  var _useState13 = useState(null), lightboxPhoto = _useState13[0], setLightboxPhoto = _useState13[1];
  var _useState14 = useState(0), bgImageIdx = _useState14[0], setBgImageIdx = _useState14[1];
  var audioRef = useRef(null);
  var _useState15 = useState(false), isMuted = _useState15[0], setIsMuted = _useState15[1];
  var _useState16 = useState(false), audioLoaded = _useState16[0], setAudioLoaded = _useState16[1];
  var _useState17 = useState(false), showIntroVideo = _useState17[0], setShowIntroVideo = _useState17[1];
  var _useState18 = useState(false), videoEnded = _useState18[0], setVideoEnded = _useState18[1];
  var _useState19 = useState(false), videoError = _useState19[0], setVideoError = _useState19[1];
  var _useState20 = useState(true), showVideoOverlay = _useState20[0], setShowVideoOverlay = _useState20[1];
  var videoRef = useRef(null);
  var galleryRef = useRef(null);
  var _useState21 = useState(12), visiblePhotos = _useState21[0], setVisiblePhotos = _useState21[1];
  var _useState22 = useState(false), isLoadingMore = _useState22[0], setIsLoadingMore = _useState22[1];
  var storyBarsRef = useRef(null);
  var _useState23 = useState(false), showSharePopup = _useState23[0], setShowSharePopup = _useState23[1];
  var _useState24 = useState(null), sharePhotoUrl = _useState24[0], setSharePhotoUrl = _useState24[1];
  
  var albumExpired = isAlbumExpired(album);
  var expiryDateFormatted = formatExpiryDate(album);
  var daysRemaining = getDaysRemaining(album);
  
  var featuredList = useMemo(function() {
    return album.featuredPhotos?.length > 0 ? album.featuredPhotos.map(function(idx) { return album.photos[idx]; }).filter(Boolean) : album.photos?.slice(0, 5) || [];
  }, [album]);

  useEffect(function() { if (album) updateMetaTags(album); }, [album]);
  useEffect(function() { if (!isAuthenticated && featuredList.length > 1) { var i = setInterval(function() { setBgImageIdx(function(p) { return (p + 1) % featuredList.length; }); }, 5000); return function() { clearInterval(i); }; } }, [isAuthenticated, featuredList]);
  useEffect(function() { if (isAuthenticated && !album.introVideo) { setVideoEnded(true); } }, [isAuthenticated, album.introVideo]);
  useEffect(function() { if (isAuthenticated && album.introVideo && !videoEnded && !videoError && !albumExpired) { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setAudioLoaded(false); } setShowIntroVideo(true); setShowVideoOverlay(true); setActiveTab('video'); } }, [isAuthenticated, album.introVideo, videoEnded, videoError, albumExpired]);
  
  useEffect(function() {
    if (showIntroVideo && videoRef.current) {
      var video = videoRef.current;
      var stallTimeout = null;
      var hasStartedPlaying = false;
      var handlePlaying = function() { hasStartedPlaying = true; setShowVideoOverlay(false); };
      var handleWaiting = function() { if (hasStartedPlaying) { if (stallTimeout) clearTimeout(stallTimeout); stallTimeout = setTimeout(function() { if (video.readyState < 3) { setShowVideoOverlay(true); } }, 500); } };
      var handleCanPlay = function() { if (stallTimeout) clearTimeout(stallTimeout); if (hasStartedPlaying) { setShowVideoOverlay(false); } };
      var handleStalled = function() { if (hasStartedPlaying) { if (stallTimeout) clearTimeout(stallTimeout); stallTimeout = setTimeout(function() { setShowVideoOverlay(true); }, 1000); } };
      var handleCanPlayThrough = function() { if (stallTimeout) clearTimeout(stallTimeout); setShowVideoOverlay(false); };
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('stalled', handleStalled);
      video.addEventListener('canplaythrough', handleCanPlayThrough);
      video.play().catch(function() { setShowVideoOverlay(true); });
      return function() { video.removeEventListener('playing', handlePlaying); video.removeEventListener('waiting', handleWaiting); video.removeEventListener('canplay', handleCanPlay); video.removeEventListener('stalled', handleStalled); video.removeEventListener('canplaythrough', handleCanPlayThrough); if (stallTimeout) clearTimeout(stallTimeout); };
    }
  }, [showIntroVideo]);
  useEffect(function() { if (showIntroVideo && showVideoOverlay) { var timer = setTimeout(function() { setShowVideoOverlay(false); }, 5000); return function() { clearTimeout(timer); }; } }, [showIntroVideo, showVideoOverlay]);
  useEffect(function() { if (showIntroVideo) { var t = setTimeout(function() { handleVideoEnded(); }, 600000); return function() { clearTimeout(t); }; } }, [showIntroVideo]);
  
  useEffect(function() { if (activeTab === 'stories' && album.storyMusic && isAuthenticated && !showIntroVideo && videoEnded && !albumExpired) { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } var a = new Audio(album.storyMusic); a.loop = true; a.volume = 0.5; audioRef.current = a; var s = album.musicStartTime || 0; var e = album.musicEndTime || null; a.addEventListener('loadedmetadata', function() { if (s > 0) a.currentTime = s; }); if (e) a.addEventListener('timeupdate', function l() { if (a.currentTime >= e) a.currentTime = s; }); a.addEventListener('canplaythrough', function() { setAudioLoaded(true); if (isStoryPlaying && !showIntroVideo) a.play().catch(function() { setAudioLoaded(false); }); }); a.addEventListener('error', function() { setAudioLoaded(false); }); return function() { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setAudioLoaded(false); } }; } if (!album.storyMusic && audioRef.current) { audioRef.current.pause(); audioRef.current = null; setAudioLoaded(false); } }, [activeTab, album.storyMusic, isAuthenticated, showIntroVideo, videoEnded, albumExpired]);
  useEffect(function() { if (audioRef.current && audioLoaded) { if (activeTab === 'stories' && isStoryPlaying && !showIntroVideo && videoEnded && !albumExpired) audioRef.current.play().catch(function() {}); else audioRef.current.pause(); } }, [isStoryPlaying, activeTab, audioLoaded, showIntroVideo, videoEnded, albumExpired]);
  useEffect(function() { if (audioRef.current) audioRef.current.muted = isMuted; }, [isMuted]);
  useEffect(function() { if (storyBarsRef.current && album.photos?.length > 0) { var activeBar = storyBarsRef.current.children[currentStoryIdx]; if (activeBar) { activeBar.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } } }, [currentStoryIdx, album.photos]);
  useEffect(function() { if (activeTab === 'stories' && storyBarsRef.current && album.photos?.length > 0) { var activeBar = storyBarsRef.current.children[currentStoryIdx]; if (activeBar) { setTimeout(function() { activeBar.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' }); }, 100); } } }, [activeTab]);
  useEffect(function() { if (activeTab === 'stories' && isStoryPlaying && album.photos?.length > 0 && !showIntroVideo && videoEnded && !albumExpired) { var d = 4000; storyStartTimeRef.current = Date.now() - (storyProgress * d); storyTimerRef.current = setInterval(function() { var el = Date.now() - storyStartTimeRef.current; var p = el / d; if (p >= 1) { if (currentStoryIdx < album.photos.length - 1) { setCurrentStoryIdx(function(v) { return v + 1; }); setStoryProgress(0); storyStartTimeRef.current = Date.now(); } else { setIsStoryPlaying(false); setActiveTab('gallery'); clearInterval(storyTimerRef.current); } } else { setStoryProgress(p); } }, 100); } else { if (storyTimerRef.current) { clearInterval(storyTimerRef.current); storyTimerRef.current = null; } } return function() { if (storyTimerRef.current) clearInterval(storyTimerRef.current); }; }, [activeTab, isStoryPlaying, currentStoryIdx, album.photos, showIntroVideo, videoEnded, albumExpired]);

  var loadMorePhotos = useCallback(function() { if (isLoadingMore || visiblePhotos >= (album.photos?.length || 0)) return; setIsLoadingMore(true); setTimeout(function() { setVisiblePhotos(function(v) { return Math.min(v + 12, album.photos?.length || 0); }); setIsLoadingMore(false); }, 300); }, [visiblePhotos, album.photos, isLoadingMore]);
  useEffect(function() { if (activeTab !== 'gallery') return; var o = new IntersectionObserver(function(e) { if (e[0].isIntersecting) loadMorePhotos(); }, { threshold: 0.1 }); var s = document.getElementById('scroll-sentinel'); if (s) o.observe(s); return function() { o.disconnect(); }; }, [activeTab, loadMorePhotos, visiblePhotos]);

  var handlePinSubmit = function(e) { e.preventDefault(); if (pinInput === album.pin) { setIsAuthenticated(true); setPinError(false); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } } else { setPinError(true); setPinInput(''); } };
  var handleDownloadRedirect = function() { if (album.googleDriveUrl) { var a = document.createElement('a'); a.href = album.googleDriveUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click(); } else alert('Link nao configurado.'); };
  var handleWhatsAppContact = function() { if (album.whatsappNumber?.trim()) { var p = album.whatsappNumber.replace(/\D/g, ''); if (p.indexOf('55') !== 0) p = '55' + p; window.open('https://wa.me/' + p + '?text=' + encodeURIComponent('Ola! Vi seu album "' + album.clientName + '" e gostaria de saber mais informacoes.'), '_blank'); } };
  var handleStoryNavigation = function(d) { if (d === 'prev' && currentStoryIdx > 0) { setCurrentStoryIdx(function(v) { return v - 1; }); setStoryProgress(0); storyStartTimeRef.current = Date.now(); } else if (d === 'next') { if (currentStoryIdx < album.photos.length - 1) { setCurrentStoryIdx(function(v) { return v + 1; }); setStoryProgress(0); storyStartTimeRef.current = Date.now(); } else { setIsStoryPlaying(false); setActiveTab('gallery'); } } };
  var toggleMute = function(e) { e.stopPropagation(); setIsMuted(!isMuted); };
  var handleVideoEnded = function() { setShowIntroVideo(false); setVideoEnded(true); setShowVideoOverlay(false); setActiveTab('stories'); setCurrentStoryIdx(0); setIsStoryPlaying(true); setStoryProgress(0); };
  var handleSkipVideo = function() { handleVideoEnded(); };
  var handleVideoError = function() { setVideoError(true); setShowIntroVideo(false); handleVideoEnded(); };
  var handleSharePhoto = function(photoUrl) { setSharePhotoUrl(photoUrl); setShowSharePopup(true); };
  var handleCloseSharePopup = function() { setShowSharePopup(false); setSharePhotoUrl(null); };
  var handleShareCurrentStory = function() { if (album.photos && album.photos[currentStoryIdx]) { handleSharePhoto(album.photos[currentStoryIdx]); } };
  var hasWhatsApp = album.whatsappNumber?.trim();

  if (isAuthenticated && showIntroVideo && album.introVideo && !albumExpired) {
    var orientation = detectVideoOrientation(album.introVideo);
    var isVertical = orientation === 'vertical';
    return (
      <div onClick={function() { if (showVideoOverlay) setShowVideoOverlay(false); }} style={{ margin: 0, padding: 0, background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 9999, overflow: 'hidden', cursor: showVideoOverlay ? 'pointer' : 'default' }}>
        <style>{'@keyframes pulse-play{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.08);opacity:1}}'}</style>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', position: 'relative' }}>
          <div style={{ width: isVertical ? 'min(100%, 420px)' : 'min(100%, 90vw)', maxHeight: '100dvh', aspectRatio: isVertical ? '9/16' : '16/9', position: 'relative', overflow: 'hidden', borderRadius: isVertical ? '20px' : '12px', background: '#000', boxShadow: '0 20px 50px rgba(0,0,0,.4)' }}>
            <video ref={videoRef} src={album.introVideo} autoPlay playsInline muted={false} preload="auto" onEnded={handleVideoEnded} onError={handleVideoError} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
            {showVideoOverlay && <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', zIndex: 10, pointerEvents: 'none' }}><div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(212,175,55,0.25)', border: '3px solid rgba(212,175,55,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', animation: 'pulse-play 2s ease-in-out infinite' }}><Play size={38} fill="rgba(212,175,55,0.95)" color="rgba(212,175,55,0.95)" style={{ marginLeft: '3px' }} /></div><div style={{ textAlign: 'center' }}><p style={{ color: 'white', fontSize: '1.05rem', fontWeight: 600, margin: '0 0 6px 0' }}>Aguarde o video esta carregando</p><p style={{ color: 'rgba(212,175,55,0.9)', fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>o video sera iniciado automaticamente</p></div></div>}
          </div>
        </div>
        <button onClick={function(e) { e.stopPropagation(); handleSkipVideo(); }} style={{ position: 'fixed', bottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', color: 'white', padding: '0.7rem 1.3rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}><SkipForward size={16} /> Pular Video</button>
      </div>
    );
  }

  if (isAuthenticated && albumExpired) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 via-[#0a0a0a] to-[#0a0a0a] z-[1]" />
        <div className="max-w-md w-full bg-black/60 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl relative z-10"><div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center mx-auto mb-6"><AlertTriangle size={40} className="text-red-400" /></div><h2 className="text-2xl font-bold tracking-tight mb-2 text-white">Album Expirado</h2><p className="text-gray-400 text-sm mb-2">Este album nao esta mais disponivel.</p>{expiryDateFormatted && <p className="text-red-400/80 text-xs mb-6">Data de expiracao: {expiryDateFormatted}</p>}<div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6"><p className="text-gray-300 text-sm">Entre em contato com o fotografo.</p></div>{hasWhatsApp ? <button onClick={handleWhatsAppContact} className="w-full bg-[#25D366] hover:bg-[#20b859] text-white font-bold p-3 rounded-xl flex items-center justify-center gap-2 shadow-lg"><MessageCircle size={20} />Falar com o Fotografo</button> : <div className="text-gray-500 text-sm">WhatsApp nao disponivel.</div>}</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 relative overflow-hidden">
        {featuredList.map(function(url, i) { return <div key={i} className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 scale-105 blur-[3px]" style={{ backgroundImage: 'url(' + url + ')', opacity: i === bgImageIdx ? 0.35 : 0, zIndex: 1 }} />; })}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 z-[2]" />
        <div className="max-w-md w-full bg-black/40 backdrop-blur-xl border border-white/15 rounded-3xl p-8 text-center shadow-2xl relative z-10">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#d4af37] shadow-2xl mx-auto mb-4 bg-neutral-900 p-1"><img src={album.profileImage || album.photos[0] || 'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?q=80&w=150&auto=format&fit=crop'} alt="Capa" className="w-full h-full object-cover rounded-full" /></div>
          <h2 className="text-2xl font-bold tracking-tight mb-1 text-white">{album.clientName}</h2>
          <p className="text-[#d4af37] text-xs uppercase tracking-widest font-semibold mb-6">{album.subtitle || 'Album Privado'}</p>
          {album.expiryDate && <div className={'mb-6 rounded-xl p-3 flex items-center gap-2 ' + (albumExpired ? 'bg-red-500/10 border border-red-500/30' : daysRemaining <= 7 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-white/5 border border-white/10')}><Clock size={16} className={albumExpired ? 'text-red-400' : daysRemaining <= 7 ? 'text-yellow-400' : 'text-[#d4af37]'} /><div className="text-left flex-1"><p className={'text-xs ' + (albumExpired ? 'text-red-400' : 'text-gray-300')}>{albumExpired ? 'Album expirado em ' + expiryDateFormatted : 'Album disponivel ate ' + expiryDateFormatted}</p>{!albumExpired && daysRemaining !== null && <p className={'text-[10px] ' + (daysRemaining <= 7 ? 'text-yellow-400' : 'text-gray-500')}>{daysRemaining <= 0 ? 'Expira hoje' : daysRemaining === 1 ? '1 dia restante' : daysRemaining + ' dias restantes'}</p>}</div></div>}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-6 flex items-center gap-3 justify-center text-gray-300 text-sm"><Lock size={16} className="text-[#d4af37]" /><span>Introduza o PIN de acesso</span></div>
          <form onSubmit={handlePinSubmit} className="space-y-4"><input type="password" value={pinInput} onChange={function(e) { setPinInput(e.target.value); }} placeholder="Digite o PIN secreto" className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-center text-xl tracking-widest outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent placeholder:text-gray-500 text-white" />{pinError && <p className="text-red-500 text-xs">PIN invalido.</p>}<button type="submit" className="w-full bg-[#d4af37] hover:bg-[#c4a137] text-black font-bold p-3 rounded-xl flex items-center justify-center gap-2 shadow-lg">Desbloquear <ArrowRight size={18} /></button></form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] text-white pb-12 relative">
      <SharePopup isOpen={showSharePopup} photoUrl={sharePhotoUrl} album={album} onClose={handleCloseSharePopup} />
      <div className="relative w-full h-32 sm:h-44 lg:h-56 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center blur-sm opacity-40 scale-105" style={{ backgroundImage: 'url(' + (album.profileImage || album.photos[0]) + ')' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/70 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full px-3 sm:px-6 pb-1 sm:pb-1.5 flex flex-row items-end justify-start gap-2 sm:gap-2.5">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-[#d4af37] shadow-lg bg-neutral-900 p-0.5 flex-shrink-0"><img src={album.profileImage || album.photos[0] || 'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?q=80&w=150&auto=format&fit=crop'} className="w-full h-full object-cover rounded-full" /></div>
          <div className="flex flex-col pb-0.5"><h1 className="text-base sm:text-xl font-bold text-white leading-tight">{album.clientName}</h1><p className="text-[#d4af37] text-[8px] sm:text-[11px] uppercase tracking-widest font-medium leading-tight">{album.subtitle || 'Album Fotografico'}</p></div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-1 sm:mt-1.5">
        <div className="flex justify-center border-b border-white/10 gap-5 sm:gap-6">
          {album.introVideo && <button onClick={function() { setActiveTab('video'); }} className={'pb-1.5 sm:pb-2 text-[11px] sm:text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ' + (activeTab === 'video' ? 'border-[#d4af37] text-[#d4af37]' : 'border-transparent text-gray-400 hover:text-white')}><Video size={13} /> Video</button>}
          <button onClick={function() { setActiveTab('stories'); setCurrentStoryIdx(0); setIsStoryPlaying(true); setStoryProgress(0); }} className={'pb-1.5 sm:pb-2 text-[11px] sm:text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ' + (activeTab === 'stories' ? 'border-[#d4af37] text-[#d4af37]' : 'border-transparent text-gray-400 hover:text-white')}><PlayCircle size={13} /> Stories</button>
          <button onClick={function() { setActiveTab('gallery'); setIsStoryPlaying(false); }} className={'pb-1.5 sm:pb-2 text-[11px] sm:text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ' + (activeTab === 'gallery' ? 'border-[#d4af37] text-[#d4af37]' : 'border-transparent text-gray-400 hover:text-white')}><Grid size={13} /> Galeria</button>
        </div>
      </div>
      {album.expiryDate && daysRemaining !== null && daysRemaining <= 7 && <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-3"><div className={'rounded-xl p-3 flex items-center gap-2 ' + (albumExpired ? 'bg-red-500/10 border border-red-500/30' : 'bg-yellow-500/10 border border-yellow-500/30')}><Clock size={16} className={albumExpired ? 'text-red-400' : 'text-yellow-400'} /><p className={'text-xs ' + (albumExpired ? 'text-red-400' : 'text-yellow-400')}>{albumExpired ? 'Este album expirou.' : 'Este album expira em ' + daysRemaining + ' dia(s).'}</p></div></div>}
      {activeTab === 'video' && album.introVideo && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-3 sm:mt-4"><div className="flex items-center justify-between mb-3 sm:mb-4"><h2 className="text-sm sm:text-base font-semibold text-gray-200">Video de Abertura</h2><button onClick={function() { setActiveTab('stories'); setCurrentStoryIdx(0); setIsStoryPlaying(true); setStoryProgress(0); }} className="flex items-center gap-1 text-[10px] sm:text-xs bg-[#d4af37] hover:bg-[#c4a137] text-black font-semibold px-3 py-1.5 rounded-full shadow-md"><SkipForward size={12} /> Pular para Stories</button></div><div style={{ display: 'flex', justifyContent: 'center' }}><div style={{ width: '100%', maxWidth: '420px', aspectRatio: '9/16', maxHeight: '70vh', position: 'relative', overflow: 'hidden', borderRadius: '20px', background: '#000' }}><video src={album.introVideo} controls autoPlay playsInline preload="auto" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} /></div></div></div>
      )}
      {activeTab === 'gallery' && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-3 sm:mt-4"><div className="flex items-center justify-between mb-3 sm:mb-4"><h2 className="text-sm sm:text-base font-semibold text-gray-200">Galeria ({(album.photos || []).length})</h2><div className="flex gap-1.5 sm:gap-2">{hasWhatsApp && <button onClick={handleWhatsAppContact} className="flex items-center gap-1 text-[10px] sm:text-xs bg-[#25D366] hover:bg-[#20b859] text-white font-semibold px-3 py-1.5 rounded-full shadow-md"><MessageCircle size={12} /> Falar com o fotografo</button>}<button onClick={handleDownloadRedirect} className="flex items-center gap-1 text-[10px] sm:text-xs bg-[#d4af37] hover:bg-[#c4a137] text-black font-semibold px-3 py-1.5 rounded-full shadow-md"><Download size={12} /> Baixar</button></div></div>
          {album.photos?.length > 0 ? (<div ref={galleryRef} className="columns-2 md:columns-3 lg:columns-4 gap-2 sm:gap-3 space-y-2 sm:space-y-3">{album.photos.slice(0, visiblePhotos).map(function(p, i) { return <div key={i} className="relative group cursor-pointer break-inside-avoid rounded-lg overflow-hidden bg-gray-900 border border-white/10"><img src={p} alt={'Foto ' + (i+1)} className="w-full h-auto object-cover" loading="lazy" onClick={function() { setLightboxPhoto(p); }} /><div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center" onClick={function() { setLightboxPhoto(p); }}><Eye size={18} className="text-white opacity-0 group-hover:opacity-100" /></div><button onClick={function(e) { e.stopPropagation(); handleSharePhoto(p); }} className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80" title="Compartilhar"><Share2 size={14} /></button></div>; })}</div>) : <div className="text-center py-14 text-gray-500"><ImageIcon size={36} className="mx-auto mb-2 opacity-50" /><p className="text-xs">Nenhuma foto.</p></div>}
          {visiblePhotos < (album.photos?.length || 0) && <div id="scroll-sentinel" className="flex justify-center py-5">{isLoadingMore ? <Loader2 size={18} className="animate-spin text-[#d4af37]" /> : <p className="text-gray-500 text-xs">Rolando...</p>}</div>}</div>
      )}
      {activeTab === 'stories' && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center sm:p-6">
          {album.photos?.length > 0 && (
            <div className="relative w-full h-full sm:max-w-[400px] sm:max-h-[90vh] sm:rounded-[40px] bg-black overflow-hidden shadow-2xl sm:border-[8px] border-neutral-900 flex flex-col">
              <div className="absolute top-4 sm:top-5 inset-x-0 z-30 px-1 flex justify-center">
                <div ref={storyBarsRef} style={{ display: 'flex', gap: '2px', overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: '2px', maxWidth: 'calc(100% - 20px)', justifyContent: 'center' }}>
                  {album.photos.map(function(_, idx) { var distance = Math.abs(idx - currentStoryIdx); var opacity; if (distance === 0) { opacity = 1; } else if (distance <= 3) { opacity = 0.7 - (distance * 0.1); } else if (distance <= 8) { opacity = 0.4 - ((distance - 3) * 0.05); } else { opacity = 0.1; } var barWidth; if (distance === 0) { barWidth = '10px'; } else if (distance <= 2) { barWidth = '6px'; } else { barWidth = '4px'; } var width; if (idx < currentStoryIdx) width = '100%'; else if (idx === currentStoryIdx) width = (storyProgress * 100) + '%'; else width = '0%'; return (<div key={idx} style={{ minWidth: barWidth, width: barWidth, height: '3px', flexShrink: 0, opacity: opacity, transition: 'opacity 0.3s ease, width 0.3s ease' }} className="bg-white/30 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full" style={{ width: width, transition: idx === currentStoryIdx ? 'none' : 'width 0.3s ease' }} /></div>); })}
                </div>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '20px', height: '100%', background: 'linear-gradient(to right, rgba(10,10,10,1), rgba(10,10,10,0))', pointerEvents: 'none', zIndex: 1 }} /><div style={{ position: 'absolute', top: 0, right: 0, width: '20px', height: '100%', background: 'linear-gradient(to left, rgba(10,10,10,1), rgba(10,10,10,0))', pointerEvents: 'none', zIndex: 1 }} />
              </div>
              <div className="absolute top-8 sm:top-9 inset-x-4 sm:inset-x-5 flex justify-between items-center z-30 px-1">
                <div className="flex items-center gap-2.5"><div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-white/20 bg-neutral-800 p-0.5"><img src={album.profileImage || album.photos[0]} alt="Perfil" className="w-full h-full object-cover rounded-full" /></div><div className="flex flex-col"><span className="text-xs sm:text-sm font-semibold text-white leading-none mb-0.5">{album.clientName}</span><span className="text-[9px] sm:text-[11px] text-white/80 font-medium leading-none">{album.subtitle || 'Album Fotografico'}</span></div></div>
                <div className="flex gap-3 sm:gap-2.5 items-center">{album.storyMusic && <button onClick={toggleMute} className="text-white hover:opacity-70">{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>}<button onClick={function(e) { e.stopPropagation(); handleShareCurrentStory(); }} className="text-white hover:opacity-70 transition-opacity" title="Compartilhar"><Share2 size={16} /></button><button onClick={function() { setIsStoryPlaying(!isStoryPlaying); }} className="text-white hover:opacity-70">{isStoryPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button><button onClick={function() { setIsStoryPlaying(false); setActiveTab('gallery'); if (audioRef.current) audioRef.current.pause(); }} className="text-white hover:opacity-70"><X size={22} /></button></div>
              </div>
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950"><img src={album.photos[currentStoryIdx]} alt={'Story ' + (currentStoryIdx + 1)} className="w-full h-full object-contain" /></div>
              <div className="absolute inset-0 z-20 flex"><div className="w-[50%] h-full cursor-pointer" onClick={function() { handleStoryNavigation('prev'); }} /><div className="w-[50%] h-full cursor-pointer" onClick={function() { handleStoryNavigation('next'); }} /></div>
              {album.storyMusic && audioLoaded && !isMuted && <div className="absolute bottom-20 left-3 z-30 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1"><Music size={10} className="text-[#d4af37] animate-pulse" /><span className="text-[9px] text-white/90">Musica</span></div>}
              {hasWhatsApp && <div className="absolute bottom-5 left-0 right-0 z-30 flex justify-center px-3"><button onClick={handleWhatsAppContact} className="bg-[#25D366] hover:bg-[#20b859] text-white font-semibold py-2.5 px-5 rounded-full flex items-center gap-1.5 text-sm shadow-lg"><MessageCircle size={16} /> Falar com o fotografo</button></div>}
            </div>
          )}
        </div>
      )}
      {lightboxPhoto && <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"><button onClick={function() { setLightboxPhoto(null); }} className="absolute top-5 right-5 text-white bg-white/10 p-2.5 rounded-full hover:bg-white/20 z-50"><X size={22} /></button><img src={lightboxPhoto} className="max-w-full max-h-[85vh] rounded-lg object-contain" /></div>}
    </div>
  );
}

function AlbumLoader(props) {
  var shortId = props.shortId;
  var _useState25 = useState(null), album = _useState25[0], setAlbum = _useState25[1];
  var _useState26 = useState('fetching'), status = _useState26[0], setStatus = _useState26[1];
  var _useState27 = useState(0), ap = _useState27[0], setAp = _useState27[1];
  var _useState28 = useState(0), vp = _useState28[0], setVp = _useState28[1];
  useEffect(function() { (async function() { try { var d = await loadAlbumFromSheets(shortId); if (d) { setAlbum(d); setStatus('preloading'); var urls = [d.loaderLogo, d.profileImage].concat(d.loaderBackgrounds||[]).concat(d.photos||[]).filter(Boolean); var l=0; urls.forEach(function(u) { var img=new Image(); img.src=u; img.onload=img.onerror=function(){l++;setAp(Math.round((l/urls.length)*100));}; }); updateMetaTags(d); } else setStatus('error'); } catch(e) { setStatus('error'); } })(); }, [shortId]);
  useEffect(function() { if (status!=='preloading') return; var i=setInterval(function(){setVp(function(p){if(ap===100){if(p>=100){clearInterval(i);setTimeout(function(){setStatus('ready');},400);return 100;}return p+1;}return p<ap?p+1:p;});},50); return function(){clearInterval(i);}; }, [status,ap]);
  if (status==='error') return <div className="h-screen bg-black text-white flex flex-col items-center justify-center"><X size={48} className="text-red-500 mb-4"/><h2 className="text-xl">Album nao encontrado</h2></div>;
  if (status==='fetching'||status==='preloading') { var bg=album?.loaderBackgrounds?.length>0?album.loaderBackgrounds:album?.photos||[]; return <div className="h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden"><style>{'@keyframes fadeRandom{0%,100%{opacity:0;transform:scale(.9)}50%{opacity:.7;transform:scale(1.05)}}@keyframes slide{from{transform:translateX(-100%)}to{transform:translateX(300%)}}'}</style><div className="absolute inset-0 z-0 flex items-center justify-center"><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 w-full h-[120%] rotate-[-4deg] scale-110 opacity-30">{Array.from({length:25}).map(function(_,i){var s=bg[i%(bg.length||1)];if(!s)return null;return <div key={i} className="relative w-full aspect-square rounded-xl overflow-hidden bg-neutral-900" style={{animation:'fadeRandom '+(3+Math.random()*4)+'s infinite ease-in-out '+(Math.random()*2)+'s'}}><img src={s} className="w-full h-full object-cover grayscale brightness-75" alt="" /></div>;})}</div></div><div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/90 via-[#0a0a0a]/60 to-[#0a0a0a] z-0" /><div className="relative z-10 text-center max-w-sm w-full flex flex-col items-center"><div className="relative w-48 h-48 mb-6 flex items-center justify-center"><div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#d4af37] shadow-[0_0_40px_rgba(212,175,55,0.4)] bg-neutral-900 relative flex items-center justify-center p-2">{album?.loaderLogo ? <img src={album.loaderLogo} alt="Logo" className="w-full h-full object-contain" /> : album?.profileImage || album?.photos?.[0] ? <img src={album.profileImage || album.photos[0]} alt="Perfil" className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full bg-neutral-800 animate-pulse flex items-center justify-center rounded-full"><Camera size={24} className="text-neutral-600" /></div>}</div></div><h2 className="text-2xl font-bold tracking-tight text-white mb-1">{album?.clientName || 'Conectando...'}</h2><p className="text-gray-400 text-sm mb-8">{album?.subtitle || 'Preparando experiencia visual...'}</p><span className="text-xs text-[#d4af37] tracking-widest uppercase font-bold mb-3 block animate-pulse">Criando seu Album {status === 'preloading' ? vp + '%' : ''}</span><div className="w-48 bg-white/10 h-[5px] rounded-full overflow-hidden border border-white/5 relative mx-auto">{status === 'fetching' ? <div className="h-full w-1/3 bg-gradient-to-r from-[#d4af37] to-[#f3e5ab] rounded-full animate-[slide_1.5s_ease-in-out_infinite]" /> : <div className="h-full bg-gradient-to-r from-[#d4af37] to-[#f3e5ab] transition-all duration-300 ease-out rounded-full" style={{width: vp + '%'}} />}</div></div></div>; }
  return <ClientApp album={album} />;
}

function AdminDashboard(props) {
  var albums = props.albums, setAlbums = props.setAlbums, isLoading = props.isLoading, isAdminLoggedIn = props.isAdminLoggedIn, setIsAdminLoggedIn = props.setIsAdminLoggedIn;
  var _useState29 = useState(null), copiedId = _useState29[0], setCopiedId = _useState29[1];
  var handleLogout = function() { sessionStorage.removeItem('adminLoggedIn'); sessionStorage.removeItem('adminUser'); setIsAdminLoggedIn(false); };
  var handleDeleteAlbum = function(shortId) { if(window.confirm('Excluir este álbum permanentemente?')) { deleteAlbumFromSheets(shortId).then(function(success) { if (success) { setAlbums(albums.filter(function(a) { return a.shortId !== shortId; })); alert('✅ Álbum excluído!'); } else { alert('❌ Erro ao excluir.'); } }).catch(function() { alert('❌ Erro ao conectar.'); }); } };
  // Link de cópia com preview do Google Apps Script
  var handleCopyLink = function(album) {
    var previewUrl = SHEETS_API_URL + '?id=' + album.shortId + '&action=preview';
    navigator.clipboard.writeText(previewUrl);
    setCopiedId(album.id);
    setTimeout(function() { setCopiedId(null); }, 2000);
  };
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2"><div className="bg-black text-[#d4af37] p-1.5 rounded-lg"><Camera size={20} /></div><h1 className="text-lg sm:text-xl font-semibold">Studio Dashboard</h1></div>
        <div className="flex items-center gap-2"><button onClick={function() { window.location.hash = '#new'; }} className="bg-black text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium flex items-center gap-1.5 hover:bg-gray-800 transition-all text-xs sm:text-sm shadow-sm"><Plus size={14} /> <span className="hidden sm:inline">Criar Album</span></button><button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-all" title="Sair"><LogOut size={14} /></button></div>
      </header>
      <main className="max-w-7xl mx-auto p-4 sm:p-6"><div className="mb-6"><h2 className="text-xl sm:text-2xl font-semibold">Os Meus Envios</h2><p className="text-gray-500 text-xs mt-0.5">Albuns armazenados de forma permanente.</p></div>{isLoading ? <div className="flex justify-center py-16"><Loader2 size={36} className="animate-spin text-gray-400" /></div> : albums.length === 0 ? <div className="bg-white rounded-2xl border border-gray-200 p-10 sm:p-14 text-center"><div className="bg-gray-100 rounded-full p-3 mb-3 inline-block"><ImageIcon size={36} className="text-gray-400" /></div><h3 className="text-base font-semibold text-gray-700">Nenhum album criado</h3></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">{albums.map(function(album) { var expired = isAlbumExpired(album); var daysLeft = getDaysRemaining(album); return <div key={album.id} className={'bg-white rounded-2xl shadow-sm border hover:shadow-md transition-shadow p-4 flex flex-col ' + (expired ? 'border-red-300 bg-red-50/30' : 'border-gray-100')}><div className="flex items-center gap-3 mb-3"><div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100"><img src={album.profileImage || 'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?q=80&w=150&auto=format&fit=crop'} alt="Cover" className="w-full h-full object-cover" /></div><div className="flex-1"><h3 className="font-semibold text-base truncate">{album.clientName}</h3><p className="text-xs text-gray-500">{album.subtitle}</p></div></div><div className="bg-gray-50 p-2.5 rounded-xl text-xs text-gray-600 mb-1.5">📸 {(album.photos || []).length} fotos | 🔑 ID: {album.shortId}</div>{album.expiryDate && <div className={'rounded-lg p-2 mb-2 flex items-center gap-1.5 text-[10px] ' + (expired ? 'bg-red-100 text-red-700' : daysLeft <= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')}><Clock size={12} /><span>{expired ? 'Expirado' : daysLeft + ' dia(s) restantes'}</span></div>}<div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100"><div className="flex gap-1"><button onClick={function() { window.location.hash = '#edit_' + album.id; }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg"><Edit3 size={16} /></button><button onClick={function() { handleDeleteAlbum(album.shortId); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 size={16} /></button></div><button onClick={function() { handleCopyLink(album); }} className={'px-3 py-1.5 rounded-full font-medium text-xs flex items-center gap-1 ' + (copiedId === album.id ? 'bg-green-500 text-white' : 'bg-black text-white')}>{copiedId === album.id ? <CheckCircle size={11} /> : <LinkIcon size={11} />}Copiar Link</button></div></div>; })}</div>}</main>
    </div>
  );
}

function AdminEditor(props) {
  var album = props.album, onSave = props.onSave, onCancel = props.onCancel, isNew = !album;
  var _useState30 = useState(album || { id: 'album_' + Math.random().toString(36).substr(2, 9), shortId: generateShortId(), clientName: '', subtitle: '', pin: '', profileImage: '', googleDriveUrl: '', whatsappNumber: '', storyMusic: '', musicStartTime: null, musicEndTime: null, introVideo: '', expiryDate: '', photos: [], featuredPhotos: [], loaderLogo: '', loaderBackgrounds: [], createdAt: new Date().toISOString() }), formData = _useState30[0], setFormData = _useState30[1];
  var _useState31 = useState('dados'), activeTab = _useState31[0], setActiveTab = _useState31[1];
  var _useState32 = useState(formData.photos || []), up = _useState32[0], setUp = _useState32[1];
  var _useState33 = useState(formData.featuredPhotos || []), sf = _useState33[0], setSf = _useState33[1];
  var _useState34 = useState(formData.profileImage || ''), sp = _useState34[0], setSp = _useState34[1];
  var _useState35 = useState(formData.loaderLogo || ''), ll = _useState35[0], setLl = _useState35[1];
  var _useState36 = useState(formData.loaderBackgrounds || []), lb = _useState36[0], setLb = _useState36[1];
  var _useState37 = useState(null), smf = _useState37[0], setSmf = _useState37[1];
  var _useState38 = useState(formData.storyMusic || ''), smp = _useState38[0], setSmp = _useState38[1];
  var _useState39 = useState(formData.musicStartTime || 0), mst = _useState39[0], setMst = _useState39[1];
  var _useState40 = useState(formData.musicEndTime || null), met = _useState40[0], setMet = _useState40[1];
  var _useState41 = useState(null), ad = _useState41[0], setAd = _useState41[1];
  var _useStateVideo = useState(null), videoFile = _useStateVideo[0], setVideoFile = _useStateVideo[1];
  var _useStateVideoPrev = useState(formData.introVideo || ''), videoPreview = _useStateVideoPrev[0], setVideoPreview = _useStateVideoPrev[1];
  var _useState42 = useState(false), iu = _useState42[0], setIu = _useState42[1];
  var _useState43 = useState(0), upr = _useState43[0], setUpr = _useState43[1];
  var _useState44 = useState(false), isSaving = _useState44[0], setIsSaving = _useState44[1];
  var _useState45 = useState(''), uploadStatus = _useState45[0], setUploadStatus = _useState45[1];
  var f2b = function(f) { return new Promise(function(r, j) { var rd = new FileReader(); rd.readAsDataURL(f); rd.onload = function() { r(rd.result); }; rd.onerror = j; }); };
  var ri = function(b64, mw) { mw = mw || 1200; return new Promise(function(r) { var img = new Image(); img.onload = function() { var c = document.createElement('canvas'); var w = img.width, h = img.height; if (w > mw) { h = (h * mw) / w; w = mw; } c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); r(c.toDataURL('image/jpeg', 0.8)); }; img.src = b64; }); };
  var hfu = async function(e) { var fs = Array.from(e.target.files); if (!fs.length) return; setIu(true); var np = up.slice(); var p = 0; for (var i = 0; i < fs.length; i++) { var f = fs[i]; if (f.type.startsWith('image/')) { try { var b = await f2b(f); b = await ri(b, 1200); np.push(b); } catch (_) {} } p++; setUpr(Math.round((p / fs.length) * 100)); } setUp(np); setIu(false); setUpr(0); e.target.value = ''; };
  var hlu = async function(e) { var f = e.target.files[0]; if (!f) return; if (f.type.startsWith('image/')) { var b = await f2b(f); b = await ri(b, 800); setLl(b); } e.target.value = ''; };
  var hlbu = async function(e) { var fs = Array.from(e.target.files); if (!fs.length) return; setIu(true); var nb = lb.slice(); var p = 0; for (var i = 0; i < fs.length; i++) { var f = fs[i]; if (f.type.startsWith('image/')) { var b = await f2b(f); b = await ri(b, 800); nb.push(b); } p++; setUpr(Math.round((p / fs.length) * 100)); } setLb(nb); setIu(false); setUpr(0); e.target.value = ''; };
  var hmu = function(e) { var f = e.target.files[0]; if (!f) return; if (f.type.startsWith('audio/')) { setSmf(f); var u = URL.createObjectURL(f); setSmp(u); var a = new Audio(u); a.addEventListener('loadedmetadata', function() { setAd(a.duration); if (!met) setMet(a.duration); }); a.load(); } e.target.value = ''; };
  var hvu = function(e) { var f = e.target.files[0]; if (!f) return; if (f.type.startsWith('video/')) { setVideoFile(f); var url = URL.createObjectURL(f); setVideoPreview(url); } else { alert('Selecione um arquivo de vídeo (MP4, MOV, etc.)'); } e.target.value = ''; };
  var hrv = function() { setVideoFile(null); setVideoPreview(''); };
  var hrm = function() { setSmf(null); setSmp(''); setMst(0); setMet(null); setAd(null); };
  var hrp = function(i) { var np = up.slice(); np.splice(i, 1); setUp(np); if (sf.indexOf(i) !== -1) setSf(sf.filter(function(x) { return x !== i; })); if (sp === up[i]) setSp(''); };
  var hs = async function(e) { e.preventDefault(); if (!formData.clientName) { alert("Preencha o Nome do Cliente."); return; } if (!formData.googleDriveUrl) { alert("Insira o link do Google Drive."); return; } if (!up.length) { alert("Selecione pelo menos uma foto."); return; } setIsSaving(true); setUpr(0); setUploadStatus('Iniciando...'); try { var aid = formData.shortId, urls = []; var total = up.length + (smf ? 1 : 0) + (videoFile ? 1 : 0) + (ll && ll.indexOf('http') !== 0 ? 1 : 0) + (lb || []).length; var step = 0; for (var i = 0; i < up.length; i++) { var ph = up[i]; if (ph.startsWith('http')) { urls.push(ph); step++; continue; } var u = await uploadToCloudinary(ph, aid, 'image'); if (!u) throw new Error("Falha ao enviar imagem."); urls.push(u); step++; setUpr(Math.round((step / total) * 100)); setUploadStatus('Enviando fotos...'); } var fM = smp; if (smf) { setUploadStatus('Enviando musica...'); fM = await uploadToCloudinary(smf, aid, 'video'); if (!fM) throw new Error("Falha ao enviar musica."); step++; setUpr(Math.round((step / total) * 100)); } var fVideo = videoPreview; if (videoFile) { setUploadStatus('Enviando video...'); setUpr(Math.round((step / total) * 100)); fVideo = await uploadToCloudinary(videoFile, aid, 'video'); if (!fVideo) throw new Error("Falha ao enviar video."); step++; setUpr(Math.round((step / total) * 100)); } var fL = ll; if (ll && ll.indexOf('http') !== 0) { fL = await uploadToCloudinary(ll, aid, 'image'); if (!fL) throw new Error("Falha ao enviar logo."); step++; } var fBgs = []; for (var j = 0; j < (lb || []).length; j++) { var bg = lb[j]; if (bg.startsWith('http')) fBgs.push(bg); else { var ub = await uploadToCloudinary(bg, aid, 'image'); if (!ub) throw new Error("Falha ao enviar fundo."); fBgs.push(ub); } step++; } var uf = []; for (var k = 0; k < sf.length; k++) { var oi = sf[k], ni = urls.findIndex(function(u) { return u === up[oi]; }); if (ni !== -1) uf.push(ni); } var fP = sp; if (sp && sp.indexOf('http') !== 0) { var pi = urls.findIndex(function(u) { return u === sp; }); fP = pi !== -1 ? urls[pi] : urls[0]; } else if (!fP && urls.length) fP = urls[0]; var fd = Object.assign({}, formData, { photos: urls, featuredPhotos: uf, profileImage: fP, loaderLogo: fL, loaderBackgrounds: fBgs, storyMusic: fM || '', musicStartTime: mst || 0, musicEndTime: met || ad || null, introVideo: fVideo || '', expiryDate: formData.expiryDate || '', updatedAt: new Date().toISOString() }); setUpr(95); setUploadStatus('Salvando na planilha...'); if (await saveAlbumToSheets(fd)) { setUpr(100); setUploadStatus('✅ Concluído!'); setTimeout(function() { onSave(fd); alert('Album salvo!'); }, 500); } else throw new Error("Falha ao salvar."); } catch (er) { alert('Erro: ' + er.message); } finally { setIsSaving(false); setUpr(0); setUploadStatus(''); } };

  return (
    <div className="min-h-screen bg-[#f5f5f7] py-6 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 sm:px-6 py-3.5 border-b border-gray-100 flex justify-between items-center bg-white"><h2 className="text-lg font-semibold flex items-center gap-2">{isNew ? <Plus size={20} /> : <Edit3 size={20} />}{isNew ? 'Criar Novo Album' : 'Editar Album'}</h2><button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
        <form onSubmit={hs} className="p-5 sm:p-6 space-y-5">
          <div className="flex gap-4 mb-4 border-b border-gray-100"><button type="button" onClick={function() { setActiveTab('dados'); }} className={'pb-2.5 font-semibold flex items-center gap-1.5 border-b-2 text-sm ' + (activeTab === 'dados' ? 'text-[#d4af37] border-[#d4af37]' : 'text-gray-400 border-transparent hover:text-gray-600')}><FileText size={16} /> Dados Basicos</button><button type="button" onClick={function() { setActiveTab('personalizar'); }} className={'pb-2.5 font-semibold flex items-center gap-1.5 border-b-2 text-sm ' + (activeTab === 'personalizar' ? 'text-[#d4af37] border-[#d4af37]' : 'text-gray-400 border-transparent hover:text-gray-600')}><Settings size={16} /> Personalizar Loading</button></div>
          {activeTab === 'dados' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-700 mb-1">Nome do Cliente</label><input type="text" value={formData.clientName} onChange={function(e) { setFormData(Object.assign({}, formData, { clientName: e.target.value })); }} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none" placeholder="Ex: Casamento Joao & Maria" /></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Subtitulo</label><input type="text" value={formData.subtitle} onChange={function(e) { setFormData(Object.assign({}, formData, { subtitle: e.target.value })); }} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none" placeholder="Ex: 15 de Outubro, 2026" /></div></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">PIN de Acesso</label><input type="text" value={formData.pin} onChange={function(e) { setFormData(Object.assign({}, formData, { pin: e.target.value })); }} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none" placeholder="Ex: 1234" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Link do Google Drive (Download)</label><input type="url" value={formData.googleDriveUrl} onChange={function(e) { setFormData(Object.assign({}, formData, { googleDriveUrl: e.target.value })); }} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none" placeholder="https://drive.google.com/drive/folders/..." /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">📱 WhatsApp</label><input type="tel" value={formData.whatsappNumber || ''} onChange={function(e) { setFormData(Object.assign({}, formData, { whatsappNumber: e.target.value })); }} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" placeholder="Ex: 11912345678" /></div>
              <div className="p-4 border border-orange-200 rounded-xl bg-orange-50/30"><label className="block text-sm font-semibold text-gray-900 mb-1.5">📅 Prazo de Expiracao do Album (opcional)</label><div className="flex items-center gap-2"><Calendar size={16} className="text-orange-500" /><input type="date" value={formData.expiryDate || ''} onChange={function(e) { setFormData(Object.assign({}, formData, { expiryDate: e.target.value })); }} className="w-full border border-orange-200 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" /></div></div>
              <div className="p-4 border border-blue-200 rounded-xl bg-blue-50/30"><label className="block text-sm font-semibold text-gray-900 mb-1.5">🎬 Video de Abertura (Upload MP4)</label>{videoPreview ? (<div className="space-y-3"><div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-blue-200"><Video size={18} className="text-blue-600" /><div className="flex-1"><p className="text-xs font-medium">{videoFile ? videoFile.name : 'Video carregado'}</p></div><button type="button" onClick={hrv} className="text-red-500 p-1"><Trash2 size={14} /></button></div><video controls className="w-full rounded-lg" src={videoPreview} style={{ maxHeight: '200px' }} /></div>) : (<label className="cursor-pointer inline-block"><div className="bg-blue-600 text-white text-xs font-semibold rounded-full py-2 px-4 flex items-center gap-1.5 hover:bg-blue-700"><Video size={14} /> Selecionar Video (MP4)</div><input type="file" accept="video/*" onChange={hvu} className="hidden" disabled={iu || isSaving} /></label>)}</div>
              <div className="p-4 border border-purple-200 rounded-xl bg-purple-50/30"><label className="block text-sm font-semibold text-gray-900 mb-1.5">🎵 Musica dos Stories</label><p className="text-xs text-gray-500 mb-3"><strong className="text-purple-700">A musica so toca nos Stories.</strong></p>{smp ? (<div className="space-y-3"><div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-purple-200"><Music size={18} className="text-purple-600" /><div className="flex-1"><p className="text-xs font-medium">{smf ? smf.name : 'Musica carregada'}</p></div><button type="button" onClick={hrm} className="text-red-500 p-1"><Trash2 size={14} /></button></div><audio controls className="w-full" src={smp} /><AudioTrimmer audioUrl={smp} startTime={mst} endTime={met || ad} duration={ad} onStartChange={setMst} onEndChange={setMet} /></div>) : (<label className="cursor-pointer inline-block"><div className="bg-purple-600 text-white text-xs font-semibold rounded-full py-2 px-4 flex items-center gap-1.5 hover:bg-purple-700"><Music size={14} /> Selecionar Musica (MP3)</div><input type="file" accept="audio/*" onChange={hmu} className="hidden" /></label>)}</div>
              <div className="p-4 border-2 border-dashed border-[#d4af37] rounded-xl bg-yellow-50/20"><label className="block text-sm font-semibold text-gray-900 mb-2">📸 Fotos da Galeria</label><label className="cursor-pointer"><div className="w-full bg-[#d4af37] text-black font-semibold rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 hover:bg-[#c4a137] text-sm"><FolderUp size={16} />Selecionar Fotos</div><input type="file" accept="image/*" multiple onChange={hfu} className="hidden" /></label>{(up || []).length > 0 && <div className="mt-3"><p className="text-xs font-medium mb-2">{(up || []).length} foto(s)</p><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-80 overflow-y-auto p-1.5">{(up || []).map(function(p, i) { return <div key={i} className="relative group"><img src={p} className="w-full aspect-square object-cover rounded-lg border" /><button type="button" onClick={function() { hrp(i); }} className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><Trash2 size={10} /></button></div>; })}</div></div>}</div>
              {(up || []).length > 0 && (<><div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50"><label className="block text-sm font-semibold mb-2">📷 Foto de Perfil</label><div className="flex justify-center mb-3"><div className="w-20 h-20 rounded-full overflow-hidden border-3 border-[#d4af37] bg-neutral-900 p-0.5">{sp ? <img src={sp} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full bg-neutral-800 rounded-full flex items-center justify-center"><Camera size={24} className="text-gray-400" /></div>}</div></div><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-72 overflow-y-auto">{(up || []).slice(0, 50).map(function(p, i) { return <div key={i} onClick={function() { setSp(p); }} className={'relative cursor-pointer rounded-lg overflow-hidden ' + (sp === p ? 'ring-3 ring-[#d4af37] scale-95' : 'hover:scale-95')}><img src={p} className="w-full aspect-square object-cover" />{sp === p && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><CheckCircle size={20} className="text-[#d4af37]" /></div>}</div>; })}</div></div><div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50"><label className="block text-sm font-semibold mb-2">⭐ Fotos em Destaque</label><p className="text-xs text-gray-500 mb-3">Selecione ate 5 fotos para o fundo da tela de PIN</p><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-72 overflow-y-auto">{(up || []).slice(0, 50).map(function(p, i) { var isSel = sf.indexOf(i) !== -1; return <div key={i} onClick={function() { if (isSel) setSf(sf.filter(function(x) { return x !== i; })); else if (sf.length < 5) setSf(sf.concat([i])); }} className={'relative cursor-pointer rounded-lg overflow-hidden ' + (isSel ? 'ring-3 ring-[#d4af37] scale-95' : 'hover:scale-95')}><img src={p} className="w-full aspect-square object-cover" />{isSel && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><CheckCircle size={20} className="text-[#d4af37]" /></div>}</div>; })}</div></div></>)}
            </div>
          )}
          {activeTab === 'personalizar' && (
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50"><label className="block text-sm font-semibold mb-2">Logomarca</label><div className="flex flex-col sm:flex-row items-center gap-4"><div className="w-24 h-24 rounded-full overflow-hidden border-3 border-[#d4af37] bg-neutral-900 flex items-center justify-center p-1.5">{ll ? <img src={ll} className="w-full h-full object-contain" /> : <Camera size={28} className="text-gray-600" />}</div><div><label className="cursor-pointer"><div className="bg-black text-white text-xs font-semibold rounded-full py-2 px-4 flex items-center gap-1.5 hover:bg-gray-800"><Upload size={14} /> Enviar Logo</div><input type="file" accept="image/*" onChange={hlu} className="hidden" /></label>{ll && <button type="button" onClick={function() { setLl(''); }} className="text-red-500 text-xs mt-1.5">Remover</button>}</div></div></div>
              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50"><label className="block text-sm font-semibold mb-2">Imagens de Fundo</label><label className="cursor-pointer inline-block mb-3"><div className="bg-black text-white text-xs font-semibold rounded-full py-2 px-4 flex items-center gap-1.5 hover:bg-gray-800"><Grid size={14} /> Adicionar Imagens</div><input type="file" accept="image/*" multiple onChange={hlbu} className="hidden" /></label>{(lb || []).length > 0 && <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1.5 border bg-white rounded-lg">{(lb || []).map(function(bg, i) { return <div key={i} className="relative group"><img src={bg} className="w-full aspect-square object-cover rounded-md" /><button type="button" onClick={function() { setLb(lb.filter(function(_, j) { return j !== i; })); }} className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><Trash2 size={10} /></button></div>; })}</div>}</div>
            </div>
          )}
          {(iu || isSaving) && <div><div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-[#d4af37] h-1.5 rounded-full transition-all" style={{ width: upr + '%' }}></div></div><p className="text-xs text-gray-500 text-center mt-1">{uploadStatus || 'Salvando... ' + upr + '%'}</p></div>}
          <div className="pt-4 flex justify-end gap-2 border-t border-gray-100"><button type="button" onClick={onCancel} className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button><button type="submit" disabled={isSaving} className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-black hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5">{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{isNew ? 'Criar Album' : 'Salvar'}</button></div>
        </form>
      </div>
    </div>
  );
}
