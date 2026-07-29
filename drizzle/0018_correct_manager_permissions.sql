DELETE FROM "role_permissions"
USING "roles", "permissions"
WHERE "role_permissions"."role_id" = "roles"."id"
  AND "role_permissions"."permission_id" = "permissions"."id"
  AND "roles"."name" = 'manager'
  AND "permissions"."name" IN (
    'seller.purchase-requests.read',
    'seller.purchase-requests.write'
  );
--> statement-breakpoint
DELETE FROM "feature_permissions"
USING "permissions"
WHERE "feature_permissions"."permission_id" = "permissions"."id"
  AND "permissions"."name" IN (
    'seller.purchase-requests.read',
    'seller.purchase-requests.write'
  );
--> statement-breakpoint
DELETE FROM "permissions"
WHERE "name" IN (
    'seller.purchase-requests.read',
    'seller.purchase-requests.write'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "role_permissions"
    WHERE "role_permissions"."permission_id" = "permissions"."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "feature_permissions"
    WHERE "feature_permissions"."permission_id" = "permissions"."id"
  );
--> statement-breakpoint
INSERT INTO "features" ("key", "name", "description")
VALUES
  ('business_profile', 'اطلاعات کسب و کار', 'مدیریت پروفایل و نشانی های کسب و کار'),
  ('notifications', 'اعلان ها', 'صندوق اعلان ها و تنظیمات کانال های اطلاع رسانی')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "permissions" ("name", "description")
VALUES
  ('manager.dashboard.read', 'خواندن داده های داشبورد مدیر'),
  ('manager.business.read', 'مشاهده اطلاعات کسب و کار'),
  ('manager.business.update', 'ویرایش اطلاعات کسب و کار'),
  ('manager.addresses.manage', 'مدیریت نشانی های کسب و کار'),
  ('manager.team.read', 'مشاهده اعضای کسب و کار'),
  ('manager.team.manage', 'مدیریت اعضای کسب و کار'),
  ('manager.orders.manage', 'مدیریت وضعیت سفارش ها'),
  ('manager.suppliers.create', 'افزودن تامین کننده'),
  ('manager.suppliers.update', 'ویرایش تامین کننده'),
  ('manager.suppliers.delete', 'حذف تامین کننده'),
  ('manager.reports.export', 'خروجی گرفتن از گزارش ها'),
  ('manager.support.create', 'ایجاد درخواست پشتیبانی'),
  ('manager.support.reply', 'پاسخ به درخواست پشتیبانی'),
  ('manager.support.update', 'ویرایش وضعیت درخواست پشتیبانی'),
  ('notifications.read', 'مشاهده اعلان ها'),
  ('notifications.preferences.manage', 'مدیریت تنظیمات اعلان ها')
ON CONFLICT ("name") DO UPDATE
SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "roles"."id", "permissions"."id"
FROM "roles"
CROSS JOIN "permissions"
WHERE "roles"."name" = 'manager'
  AND "permissions"."name" IN (
    'manager.dashboard.read',
    'manager.business.read',
    'manager.business.update',
    'manager.addresses.manage',
    'manager.team.read',
    'manager.team.manage',
    'manager.orders.manage',
    'manager.suppliers.create',
    'manager.suppliers.update',
    'manager.suppliers.delete',
    'manager.reports.export',
    'manager.support.create',
    'manager.support.reply',
    'manager.support.update',
    'notifications.read',
    'notifications.preferences.manage'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "roles"."id", "permissions"."id"
FROM "roles"
CROSS JOIN "permissions"
WHERE "roles"."name" IN ('seller', 'seller_manager')
  AND "permissions"."name" IN (
    'notifications.read',
    'notifications.preferences.manage'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "feature_permissions" ("feature_id", "permission_id")
SELECT "features"."id", "permissions"."id"
FROM "features"
CROSS JOIN "permissions"
WHERE (
    "features"."key" = 'dashboard'
    AND "permissions"."name" = 'manager.dashboard.read'
  )
  OR (
    "features"."key" = 'business_profile'
    AND "permissions"."name" IN (
      'manager.business.read',
      'manager.business.update',
      'manager.addresses.manage'
    )
  )
  OR (
    "features"."key" = 'team'
    AND "permissions"."name" IN (
      'manager.team.read',
      'manager.team.manage'
    )
  )
  OR (
    "features"."key" = 'orders'
    AND "permissions"."name" = 'manager.orders.manage'
  )
  OR (
    "features"."key" = 'suppliers'
    AND "permissions"."name" IN (
      'manager.suppliers.create',
      'manager.suppliers.update',
      'manager.suppliers.delete'
    )
  )
  OR (
    "features"."key" = 'reports'
    AND "permissions"."name" = 'manager.reports.export'
  )
  OR (
    "features"."key" = 'support'
    AND "permissions"."name" IN (
      'manager.support.create',
      'manager.support.reply',
      'manager.support.update'
    )
  )
  OR (
    "features"."key" = 'notifications'
    AND "permissions"."name" IN (
      'notifications.read',
      'notifications.preferences.manage'
    )
  )
ON CONFLICT ("feature_id", "permission_id") DO NOTHING;
