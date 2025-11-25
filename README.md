# بوت Lavalink على Node.js

خطوات سريعة لتشغيل البوت على VPS مع توافق كامل مع Lavalink وتشغيل يوتيوب بدون كوكيز.

## المكونات الأساسية
- **Node.js 18+**
- **Lavalink** (Java 17، آخر إصدار من [Lavalink.jar](https://github.com/freyacodes/Lavalink))
- **مكتبة `discord.js` v14** و`erela.js` لإدارة الاتصالات والأوامر والموسيقى

## التحضير
1. انسخ `.env.example` إلى `.env` وعبّئ القيم.
2. احرص أن Lavalink شغّال على VPS مع Java 17، وبيانات `host/port/password` نفسها في `.env`.
3. ثبّت الحزم:
   ```bash
   npm install
   ```

## إعداد Lavalink
1. نزّل `Lavalink.jar` وشغّله عبر:
   ```bash
   java -jar Lavalink.jar
   ```
2. عدّل `application.yml` ليتضمن نفس `server.password`، والـ`port`، واختر `server.secure` إذا كنت تستخدم TLS.
3. تأكد من فتح المنفذ في فايروول VPS.

## تشغيل البوت
```bash
npm start
```
البوت يتصل بـ Lavalink تلقائياً بعد `ready`.

## أوامر بوت الموسيقى
| الأمر | الوصف |
| --- | --- |
| `!play <اسم أو رابط>` | يضيف أغنية ثم يشغّلها (يدعم بحث `ytsearch`). |
| `!skip` | يتخطى الأغنية الحالية. |
| `!stop` | يوقف القناة ويفك البوت. |
| `!queue` | يعرض الخمس أغاني القادمة. |
| `!volume <1-150>` | يضبط مستوى الصوت. |

## ملاحظات
- البوت يعتمد على `ytsearch:` داخل `erela.js`، لذلك لا يحتاج كوكيز أو إضافات خارجية.
- إذا أردت مراقبة حالة Lavalink، أضف `health` endpoint أو طبّع لوغ `nodeError`.
- أعد تشغيل البوت عند تحديث Lavalink أو تغيير إعدادات `.env`.
