// Keeps a copy of every file of the app, so it works offline. The build fills in the version and
// the list of files, and a new version replaces the cached copy.

const VERSION = "35beb1373f091f74";
const FILES = ["./", "audio/index.csv", "audio/tha-3585_%E0%B8%81_ko-kai.mp3", "audio/tha-3586_%E0%B8%82_kho-khai.mp3", "audio/tha-3587_%E0%B8%83_kho-khuat.mp3", "audio/tha-3588_%E0%B8%84_kho-khwai.mp3", "audio/tha-3589_%E0%B8%85_kho-khon.mp3", "audio/tha-3590_%E0%B8%86_kho-ra-khang.mp3", "audio/tha-3591_%E0%B8%87_ngo-ngu.mp3", "audio/tha-3592_%E0%B8%88_cho-chan.mp3", "audio/tha-3593_%E0%B8%89_cho-ching.mp3", "audio/tha-3594_%E0%B8%8A_cho-chang.mp3", "audio/tha-3595_%E0%B8%8B_so-so.mp3", "audio/tha-3596_%E0%B8%8C_cho-choe.mp3", "audio/tha-3597_%E0%B8%8D_yo-ying.mp3", "audio/tha-3598_%E0%B8%8E_do-cha-da.mp3", "audio/tha-3599_%E0%B8%8F_to-pa-tak.mp3", "audio/tha-3600_%E0%B8%90_tho-than.mp3", "audio/tha-3601_%E0%B8%91_tho-montho.mp3", "audio/tha-3602_%E0%B8%92_tho-phu-thao.mp3", "audio/tha-3603_%E0%B8%93_no-nen.mp3", "audio/tha-3604_%E0%B8%94_do-dek.mp3", "audio/tha-3605_%E0%B8%95_to-tao.mp3", "audio/tha-3606_%E0%B8%96_tho-thung.mp3", "audio/tha-3607_%E0%B8%97_tho-thahan.mp3", "audio/tha-3608_%E0%B8%98_tho-thong.mp3", "audio/tha-3609_%E0%B8%99_no-nu.mp3", "audio/tha-3610_%E0%B8%9A_bo-baimai.mp3", "audio/tha-3611_%E0%B8%9B_po-pla.mp3", "audio/tha-3612_%E0%B8%9C_pho-phueng.mp3", "audio/tha-3613_%E0%B8%9D_fo-fa.mp3", "audio/tha-3614_%E0%B8%9E_pho-phan.mp3", "audio/tha-3615_%E0%B8%9F_fo-fan.mp3", "audio/tha-3616_%E0%B8%A0_pho-sam-phao.mp3", "audio/tha-3617_%E0%B8%A1_mo-ma.mp3", "audio/tha-3618_%E0%B8%A2_yo-yak.mp3", "audio/tha-3619_%E0%B8%A3_ro-ruea.mp3", "audio/tha-3620_%E0%B8%A4_Tua-rue.mp3", "audio/tha-3621_%E0%B8%A5_lo-ling.mp3", "audio/tha-3623_%E0%B8%A7_wo-waen.mp3", "audio/tha-3624_%E0%B8%A8_so-sala.mp3", "audio/tha-3625_%E0%B8%A9_so-rue-si.mp3", "audio/tha-3626_%E0%B8%AA_so-suea.mp3", "audio/tha-3627_%E0%B8%AB_ho-hip.mp3", "audio/tha-3628_%E0%B8%AC_lo-chu-la.mp3", "audio/tha-3629_%E0%B8%AD_o-ang.mp3", "audio/tha-3630_%E0%B8%AE_ho-nok-huk.mp3", "audio/tha-3631_%E0%B8%AF_paiyan-noi.mp3", "audio/tha-3633_%E0%B8%B1_Mai-han-a-kat.mp3", "audio/tha-3635_%E0%B8%B3_sara-am.mp3", "audio/tha-3637_%E0%B8%B5_sara-ii.mp3", "audio/tha-3638_%E0%B8%B6_sara-ue.mp3", "audio/tha-3639_%E0%B8%B7_sara-uue.mp3", "audio/tha-3649_%E0%B9%81_sara-ae.mp3", "audio/tha-3654_%E0%B9%86_mai-yamok.mp3", "audio/tha-3655_%E0%B9%87_Mai-tai-khu.mp3", "audio/tha-3656_%E0%B9%88_mai-ek.mp3", "audio/tha-3657_%E0%B9%89_mai-tho.mp3", "audio/tha-3658_%E0%B9%8A_mai-tri.mp3", "audio/tha-3659_%E0%B9%8B_mai-chattawa.mp3", "audio/tha-3660_%E0%B9%8C_thanthakhat.mp3", "audio/tha-3661_%E0%B9%8D_Nikkhahit.mp3", "audio/tha-3664_%E0%B9%90_sun.mp3", "audio/tha-3665_%E0%B9%91_nueng.mp3", "audio/tha-3666_%E0%B9%92_song.mp3", "audio/tha-3667_%E0%B9%93_sam.mp3", "audio/tha-3668_%E0%B9%94_si.mp3", "audio/tha-3669_%E0%B9%95_ha.mp3", "audio/tha-3670_%E0%B9%96_hok.mp3", "audio/tha-3671_%E0%B9%97_chet.mp3", "audio/tha-3672_%E0%B9%98_paet.mp3", "audio/tha-3673_%E0%B9%99_kao.mp3", "audio/tha-781_Fon-thong.mp3", "audio/tha-782_Fan-nu.mp3", "audio/thai-alphabet_%E0%B8%B0_sara-a.mp3", "audio/thai-alphabet_%E0%B8%B2_sara-aa.mp3", "audio/thai-alphabet_%E0%B8%B4_sara-i.mp3", "audio/thai-alphabet_%E0%B8%B8_sara-u.mp3", "audio/thai-alphabet_%E0%B8%B9_sara-uu.mp3", "audio/thai-alphabet_%E0%B9%80_sara-e.mp3", "audio/thai-alphabet_%E0%B9%82_sara-o.mp3", "audio/thai-alphabet_%E0%B9%83_sara-ai-mai-muan.mp3", "audio/thai-alphabet_%E0%B9%84_sara-ai-mai-malai.mp3", "fonts/NOTO_LICENSE.txt", "fonts/ROBOTO_LICENSE.txt", "fonts/noto_sans_marks_regular.ttf", "fonts/roboto-latin-ext-wght-normal.woff2", "fonts/roboto-latin-wght-normal.woff2", "fonts/roboto-math-wght-normal.woff2", "fonts/thai_looped_regular.ttf", "fonts/thai_looped_semibold.ttf", "icons/apple-touch-icon.png", "icons/favicon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "index.html", "js/app.js", "js/audio.js", "js/components.js", "js/data.js", "js/dom.js", "js/flashcards.js", "js/home.js", "js/icons.js", "js/quiz.js", "js/store.js", "js/strings.js", "letters.csv", "manifest.webmanifest", "styles.css"];
const CACHE = `kokai-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    // Skips the browser's own cache, which can still hold the files of the previous version.
    caches.open(CACHE)
      .then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Other pages can share the directory of the app, such as its privacy policy, so only the app's
  // own address is answered with the cached page.
  const scope = new URL(self.registration.scope).pathname;
  if (event.request.mode === 'navigate' && url.pathname !== scope && url.pathname !== `${scope}index.html`) return;
  const request = event.request.mode === 'navigate' ? new Request('./') : event.request;
  event.respondWith(
    caches.match(request, { ignoreSearch: url.origin === location.origin }).then((cached) => {
      if (!cached) return fetch(event.request);
      const range = event.request.headers.get('range');
      return range ? partialResponse(cached, range) : cached;
    }),
  );
});

/** Answers a request for part of a file, which Safari makes to play recordings. */
async function partialResponse(response, range) {
  const blob = await response.blob();
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) return response;
  let start = match[1] === '' ? blob.size - Number(match[2]) : Number(match[1]);
  const end = match[1] === '' || match[2] === '' ? blob.size - 1 : Math.min(Number(match[2]), blob.size - 1);
  start = Math.max(0, start);
  if (start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${blob.size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}
