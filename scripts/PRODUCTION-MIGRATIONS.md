# تشغيل ترحيلات الإنتاج بأمان

## المبدأ

يستخدم التطبيق حساب `souq_app` بصلاحيات تشغيل محدودة، بينما يستخدم Drizzle حسابًا منفصلًا باسم `souq_migrator` لتطبيق ملفات الترحيل الملتزم بها. لا تشغّل الترحيل بحساب التطبيق الدائم، ولا تستخدم `db:push` في الإنتاج.

## قبل التنفيذ

1. نفّذ نسخة احتياطية متسقة لقاعدة البيانات.
2. انشر commit معروفًا من `main` وتحقق من وجود `drizzle/0003_modern_blackheart.sql`.
3. نفّذ ملف `production-db-privileges.sql` بحساب DBA بعد استبدال أسماء القاعدة والمضيفين وكلمات المرور خارج Git.
4. استخدم staging أولًا، ثم نفّذ الإنتاج في نافذة صيانة مناسبة.

## تطبيق الترحيل

من جذر المستودع:

```bash
pnpm install --frozen-lockfile --prod=false
export NODE_ENV=production
export DATABASE_URL='mysql://souq_migrator:PASSWORD@DB_HOST:3306/souq_prod?ssl={"rejectUnauthorized":true}'
export ALLOW_PRODUCTION_MIGRATION=yes
./scripts/migrate-production.sh
```

السكريبت يتحقق من أن البيئة إنتاج، وأن `DATABASE_URL` موجود وليس placeholder أو localhost، ثم يشغل `drizzle-kit migrate` فقط. لا يشغّل `drizzle-kit generate` ولا يعدّل ملفات الترحيل.

## التحقق بعد التنفيذ

```bash
mysql "$DATABASE_URL" -e "SHOW TABLES;"
mysql "$DATABASE_URL" -e "DESCRIBE stores; DESCRIBE orderItems; DESCRIBE products; DESCRIBE orders;"
mysql "$DATABASE_URL" -e "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC;"
```

يجب ظهور `stores` و`orderItems`، وعمودَي `storeId` و`customerId`، وسجل الترحيل `0003_modern_blackheart`.

اختبر قابلية التكرار على staging، ثم شغّل الترحيل مرة ثانية. يجب ألا يعيد إنشاء الجداول أو يغير البيانات.

## بعد الترحيل

1. استخدم `souq_app` في `DATABASE_URL` الخاص بخدمة التطبيق، وليس `souq_migrator`.
2. أعد تشغيل التطبيق، ثم نفّذ health check وتسجيل دخول اختباري.
3. راقب سجلات التطبيق وقاعدة البيانات.
4. اقفل مستخدم الترحيل أو احذفه بعد انتهاء النافذة:

```sql
ALTER USER 'souq_migrator'@'MIGRATION_HOST' ACCOUNT LOCK;
```

## التراجع

لا تعدّل ملف ترحيل مطبقًا ولا تحذف سجل `__drizzle_migrations`. إذا فشل الترحيل، احفظ رسالة الخطأ ونسخة القاعدة، ثم أنشئ ترحيل إصلاح جديد بعد مراجعة الحالة. استخدم استعادة النسخة الاحتياطية فقط وفق إجراء الاسترجاع المعتمد.

## ملاحظات أمنية

- لا تضع `DATABASE_URL` أو كلمات المرور في Git أو سجلات CI.
- لا تستخدم `GRANT OPTION` أو `FILE` أو `SUPER` أو `PROCESS` للتطبيق.
- قيّد `APP_HOST` و`MIGRATION_HOST` بعناوين موثوقة بدل `%` متى أمكن.
- إذا كان مزود القاعدة لا يدعم `REFERENCES` أو `CREATE TEMPORARY TABLES`، احذف المنحة غير المدعومة بعد اختبار Drizzle على staging.
