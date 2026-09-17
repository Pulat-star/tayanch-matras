# Tayanch — matras do‘koni uchun 3D katalog sayt

Uch zonali matraslar sotadigan do‘kon uchun konsept sayt. Bosh ekranda matraslar yoritilgan podium atrofida vitrina bo‘lib turadi; matrasni bossangiz, o‘sha sahnaning o‘zida u yotib, qatlamlarga ajraladi va o‘ng tomonda ma’lumot oynasi ochiladi. Matnlar o‘zbekcha (lotin) va ruscha.

Yig‘ish (build) kerak emas: toza HTML, CSS va ES modullar.

## Ishga tushirish

```bash
cd tayanch-matras
python3 -m http.server 8765
# http://localhost:8765     ·  ruscha: http://localhost:8765/?lang=ru
```

ES modullar `file://` orqali ochilmaydi, shuning uchun oddiy statik server kerak.

## Fayllar

```
index.html                 sahifa belgilashi
assets/css/base.css        tokenlar, tipografika, sarlavha, vitrina
assets/css/sections.css    bo‘limlar, mahsulot oynasi, savat
assets/js/
  config.js                telefon, Telegram, arizalar uchun manzil  ← avval shuni to‘ldiring
  data.js                  mahsulotlar, o‘lchamlar, narxlar, test mantiqi
  i18n/uz.js · i18n/ru.js  barcha matnlar
  core.js                  holat, hodisalar, tarjima, narx hisobi
  app.js                   ishga tushirish tartibi
  ui/                      vitrina paneli, katalog, oyna, savat, test, formalar, animatsiyalar
  gl/                      3D: dvigatel, vitrina, scroll hikoyasi, modellar, teksturalar
```

## Nega sayt qotmaydi

- **Avval interfeys.** HTML va CSS darhol chiziladi; Three.js sahifa ochilgandan keyin, brauzer bo‘shaganda yuklanadi. 3D tayyor bo‘lguncha CSS’da chizilgan vitrina surati turadi.
- **Bosqichma-bosqich tayyorlash.** Har bir model alohida kadrda quriladi, orada brauzerga nafas beriladi.
- **Shaderlar oldindan.** Ko‘rsatishdan oldin `compileAsync` bilan kompilyatsiya qilinadi, teksturalar oldindan yuklanadi. Barcha sahnalar bir xil yorug‘lik to‘plamini oladi, shuning uchun shader dasturlari qayta ishlatiladi.
- **Faqat ko‘rinayotgani chiziladi.** Ekranda ko‘rinmayotgan sahna umuman chizilmaydi, hech narsa harakatlanmasa kadrlar to‘xtaydi.
- **Sifat o‘zi moslashadi.** Kadr sekinlashsa, piksel zichligi avtomatik pasayadi.
- **Katalog rasmlari.** Kartalardagi rasmlar o‘sha 3D modellardan bir martagina olinadi va oddiy rasm bo‘lib qoladi — scroll yengil bo‘ladi.

O‘lchov (Chrome, M1): sahifa ~0,9 s da chiziladi, 3D ~1,6 s da qo‘shiladi, ochilish davomida 60 ms dan uzun uzilish yo‘q.

## Konversiya uchun nima qilingan

- Bosh ekranda: aniq va’da, 100 kecha sinov, bepul yetkazish va muddatli to‘lov; ikkita harakat tugmasi.
- Har bir narx yonida oylik to‘lov ko‘rsatilgan.
- 4 savollik tanlash testi shaxsiy tavsiya beradi (model + zona sxemasi + o‘lcham) va darhol savatga qo‘shish taklif qiladi.
- Mahsulot oynasida: «kimga mos» ro‘yxati, zona sxemasi, tejaladigan summa, kafolatlar CTA yonida, «bir qadamda buyurtma» (faqat telefon raqami).
- Telefonda pastda doimiy panel: qo‘ng‘iroq, maslahat, savat.
- Savatda ikki qadamli buyurtma: ro‘yxat → ism, telefon, shahar, to‘lov usuli.
- Har bir muhim harakat `window.dataLayer` ga yoziladi (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `quiz_complete`, `generate_lead`) — Google Analytics yoki Meta pikselini ulash oson.

## Boshqaruv

- Vitrinani surish, strelkalar, nuqtalar, klaviatura ← → yoki trekpadda gorizontal skroll.
- Matrasni bosish — oyna ochiladi (manzil `#p/<id>` bo‘ladi, «orqaga» tugmasi ishlaydi).
- Oynada modelni barmoq yoki sichqoncha bilan aylantirish, «Qatlamlarni ajratish / Yig‘ish», ko‘rpacha uchun «Buklash / Ochish».
- `prefers-reduced-motion` yoqilgan bo‘lsa animatsiyalar o‘chadi, hikoya oddiy ro‘yxatga aylanadi. WebGL bo‘lmasa, sayt to‘liq ishlaydi — faqat 3D o‘rniga CSS rasmlar chiqadi.

## Haqiqiy do‘konga ulashdan oldin

1. `assets/js/config.js` — telefon, Telegram havolasi va arizalar yuboriladigan manzil (`leadEndpoint`). U bo‘sh bo‘lsa, formalar demo rejimda ishlaydi: ma’lumot hech qayerga ketmaydi, faqat konsolga yoziladi.
2. `assets/js/data.js` — mahsulotlar, narxlar, kafolat va sinov muddatlari. Narx 160×200 uchun beriladi, qolganlari koeffitsient bilan hisoblanadi.
3. `assets/js/i18n/uz.js` va `ru.js` — brend nomi, showroom manzillari, xizmat shartlari.
4. Mijoz sharhlari qo‘shilsa, konversiya yana oshadi (Google Maps yoki Instagram’dan haqiqiy sharhlar).

Brend nomi, telefon (`+998 71 123 45 67`) va showroom manzillari — o‘ylab topilgan, ularni almashtirish kerak.

## Texnik ma’lumot

Three.js 0.169 (jsDelivr CDN, importmap orqali), tashqi 3D fayl yo‘q — barcha modellar va matolar koddan chiziladi, jumladan matras yon tasmasidagi abr (ikat) naqshi. Shriftlar: Unbounded, Golos Text, Martian Mono, Cormorant Garamond (Google Fonts, lotin va kirill).
