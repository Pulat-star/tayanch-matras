# Tayanch — matras do‘koni uchun katalog sayt (dizayn konsepti)

Airweave (airweave.com/collections/mattresses) katalogi asosida tayyorlangan, O‘zbekiston bozoriga moslangan konsept. Loyiha statik HTML/CSS/JS’dan iborat, yig‘ish (build) talab qilinmaydi. Matnlar ikki tilda: o‘zbekcha (lotin) va ruscha.

## Ishga tushirish

ES modullar `file://` orqali ochilmaydi, shuning uchun istalgan statik server kerak:

```bash
cd tayanch-matras
python3 -m http.server 8765
# http://localhost:8765  ·  ruscha: http://localhost:8765/?lang=ru
```

## Fayllar

- `index.html` — sahifa belgilashi
- `styles.css` — dizayn tokenlari (yorug‘ va qorong‘i mavzu), adaptiv joylashuv
- `data.js` — mahsulotlar, o‘lchamlar, narxlar, zona sxemalari va UZ/RU matnlar
- `app.js` — til almashtirish, filtrlar, savat, mahsulot oynasi, zona konstruktori, scroll holati
- `scene.js` — Three.js 3D sahna: barcha modellar koddan yasaladi, tashqi 3D fayl yo‘q
- `ikat.js` — abr (ikat) naqsh generatori: sahifadagi tasma va matras yon matolari uchun

## 3D va animatsiyalar

- Bitta WebGL kanvas sahifadagi barcha 3D oynalarni chizadi (scissor usuli), shuning uchun telefonda ham yengil ishlaydi.
- Bosh ekran scroll bilan 4 bobdan o‘tadi: matras → qatlamlarga ajraladi (izohlar bilan) → uch zona va sxemalar (2-2-2 → 1-3-2 → 1-2-1) → matrasdan havo chiqadi.
- Katalog kartalari scroll qilinganda aylanadi, har bir mahsulotning o‘z animatsiyasi bor: qatlamlarga ajralish, zonalar, ko‘tariladigan bosh qismi (Mohir 2.1), buklanadigan ko‘rpacha, matras ustiga tushadigan topper. Kursor olib borilganda animatsiya kuchayadi.
- Mahsulot oynasida modelni sichqoncha yoki barmoq bilan aylantirish va slayder bilan qatlamlarga ajratish mumkin.
- Zona konstruktorida bloklar qattiqligi o‘zgarganda yotgan odam silueti shunga qarab botadi.
- `prefers-reduced-motion` yoqilgan bo‘lsa, animatsiyalar o‘chadi va boblar oddiy ro‘yxat bo‘lib ko‘rsatiladi. WebGL bo‘lmasa, CSS’da chizilgan zaxira rasm chiqadi.

Kutubxona: Three.js 0.169 (jsDelivr CDN, importmap orqali). Shriftlar: Unbounded, Golos Text, Martian Mono (Google Fonts, kirill va lotin).

## Haqiqiy do‘konga ulashdan oldin

- **Brend, manzil va telefon** (`Tayanch`, `+998 71 123 45 67`, showroom manzillari) — o‘ylab topilgan. Ularni haqiqiy ma’lumotlarga almashtiring.
- **Mahsulotlar, narxlar, kafolat va sinov muddatlari** — namuna. Ular `data.js` faylida turadi.
- **Maslahat formasi va buyurtma** hozircha hech qayerga yuborilmaydi, faqat bildirishnoma chiqaradi. Backend yoki Telegram-botni `app.js` ichidagi `initLead()` va `#checkout` ishlovchisiga ulang.
- Savat va tanlangan til brauzerning `localStorage`’ida saqlanadi.
