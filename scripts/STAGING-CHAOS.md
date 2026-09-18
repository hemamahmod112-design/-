# تشغيل اختبارات Chaos على Staging

## متطلبات السلامة

لا يعمل السكربت إلا إذا كانت:

```bash
export ENVIRONMENT=staging
export CHAOS_ENABLED=true
export NODE_ENV=development
export STAGING_DATABASE_URL='mysql://USER:PASSWORD@STAGING_HOST:3306/souq_staging'
```

لا تستخدم `DATABASE_URL` أو أي سر إنتاجي. يجب أن تكون قاعدة Staging منفصلة، وأن تكون لديك نسخة احتياطية وقناة تنبيهات مخصصة.

## الوضع الافتراضي

الوضع الافتراضي هو `dry-run` ولا يسبب أي تأثير:

```bash
python3 scripts/staging-chaos.py health-check \
  --base-url https://staging.example.com
```

لتنفيذ تجربة محدودة بعد مراجعة النطاق:

```bash
python3 scripts/staging-chaos.py health-check \
  --base-url https://staging.example.com \
  --execute
```

## السيناريوهات المتاحة

### فحص الصحة

```bash
python3 scripts/staging-chaos.py health-check \
  --base-url https://staging.example.com --execute
```

### تنبيه اصطناعي

```bash
python3 scripts/staging-chaos.py synthetic-alert \
  --webhook-url https://staging.example.com/internal/alerts --execute
```

استخدم endpoint وsecret مخصصين لـ Staging. السكربت يرسل علامة `X-Chaos-Staging: true`.

### ملف مؤقت لمساحة القرص

```bash
python3 scripts/staging-chaos.py disk-fill \
  --fill-mb 64 --hold-seconds 30 --execute
```

يُنشئ ملفًا مؤقتًا فقط داخل `/tmp` ثم يحذفه تلقائيًا. الحد الأقصى 512MB.

### ضغط الاتصالات

```bash
python3 scripts/staging-chaos.py connection-pressure \
  --connections 10 --hold-seconds 30 --execute
```

يفتح جلسات قراءة فقط باستخدام `SELECT SLEEP(...)`، ولا ينشئ معاملات أو أقفالًا أو تغييرات بيانات. الحد الأقصى 40 اتصالًا.

### lock-wait

يبقى هذا السيناريو في الوضع الآمن `dry-run` حتى تتم مراجعته وتخصيصه لمخطط Staging؛ لا ينفّذ السكربت الحالي أي SQL قد يترك قفلًا مفتوحًا.

## حدود عامة

- الحد الأقصى للتجربة: 600 ثانية.
- `--execute` مطلوب للتنفيذ الفعلي.
- إيقاف العملية بـ `Ctrl-C` يفعّل cleanup في سيناريوهات الملفات والاتصالات.
- لا يوجد `DROP` أو `TRUNCATE` أو `DELETE` أو `db:push` أو تعديل تلقائي للصلاحيات.
- سجلات JSON الناتجة تصلح للإرسال إلى نظام المراقبة، ولا يجب أن تحتوي على أسرار.

## التحقق بعد كل تجربة

1. افحص Alertmanager ووقت وصول التنبيه.
2. نفّذ health check.
3. نفّذ `SELECT 1` على قاعدة Staging.
4. اختبر تسجيل الدخول وإنشاء متجر/منتج اختباري.
5. تأكد من عودة CPU والاتصالات ومساحة القرص إلى خط الأساس.
6. خزّن سجل التجربة مع `experiment_id` وموافقة المسؤول.
