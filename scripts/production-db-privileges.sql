-- سوقنا: صلاحيات MySQL/TiDB للإنتاج
--
-- لا تضع كلمات المرور في Git. مرّرها إلى mysql عبر متغيرات سرية أو أدخلها
-- تفاعليًا عند CREATE USER. نفّذ هذا الملف بحساب DBA فقط.
--
-- استبدل:
--   souq_prod       باسم قاعدة الإنتاج
--   APP_HOST        بنطاق/عنوان خادم التطبيق أو '%' عند الضرورة فقط
--   MIGRATION_HOST  بنطاق/عنوان بيئة CI أو خادم الترحيل
--
-- مبدأ الفصل:
--   souq_app      لتشغيل التطبيق فقط (DML، بلا ALTER/CREATE/DROP)
--   souq_migrator لتطبيق Drizzle migrations (DDL + DML)، وليس لحركة التطبيق اليومية

CREATE USER IF NOT EXISTS 'souq_app'@'APP_HOST' IDENTIFIED BY 'REPLACE_WITH_SECRET_APP_PASSWORD';
CREATE USER IF NOT EXISTS 'souq_migrator'@'MIGRATION_HOST' IDENTIFIED BY 'REPLACE_WITH_SECRET_MIGRATION_PASSWORD';

-- احذف أي منح قديمة أوسع من السياسة قبل تطبيق المنح الحالية.
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'souq_app'@'APP_HOST';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'souq_migrator'@'MIGRATION_HOST';

-- مستخدم التطبيق: أقل صلاحيات عملية لعمليات CRUD الحالية.
GRANT SELECT, INSERT, UPDATE, DELETE
ON `souq_prod`.* TO 'souq_app'@'APP_HOST';

-- مستخدم الترحيل: يستخدم فقط من بيئة CI/CD أو خادم إدارة موثوق.
-- CREATE TEMPORARY TABLES مطلوب لبعض أدوات schema/migration، وREFERENCES
-- اختياري لبعض إصدارات MySQL/TiDB عند إنشاء القيود.
GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, INDEX, DROP,
      CREATE TEMPORARY TABLES, REFERENCES
ON `souq_prod`.* TO 'souq_migrator'@'MIGRATION_HOST';

-- لا تمنح FILE أو SUPER أو PROCESS أو SHUTDOWN أو GRANT OPTION.
FLUSH PRIVILEGES;

-- تحقق يدويًا بعد التنفيذ:
-- SHOW GRANTS FOR 'souq_app'@'APP_HOST';
-- SHOW GRANTS FOR 'souq_migrator'@'MIGRATION_HOST';
--
-- بعد اكتمال الترحيل، يمكن تعطيل مستخدم الترحيل:
-- ALTER USER 'souq_migrator'@'MIGRATION_HOST' ACCOUNT LOCK;
-- أو حذفه وفق سياسة المؤسسة:
-- DROP USER 'souq_migrator'@'MIGRATION_HOST';
