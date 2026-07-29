INSERT INTO "permissions" ("name", "description")
VALUES
  ('seller.purchase-requests.read', 'View business purchase requests'),
  ('seller.purchase-requests.write', 'Create and manage business purchase requests')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "roles"."id", "permissions"."id"
FROM "roles"
CROSS JOIN "permissions"
WHERE "roles"."name" = 'manager'
  AND "permissions"."name" IN (
    'seller.purchase-requests.read',
    'seller.purchase-requests.write'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "feature_permissions" ("feature_id", "permission_id")
SELECT "features"."id", "permissions"."id"
FROM "features"
CROSS JOIN "permissions"
WHERE "features"."key" = 'purchase_requests'
  AND "permissions"."name" IN (
    'seller.purchase-requests.read',
    'seller.purchase-requests.write'
  )
ON CONFLICT ("feature_id", "permission_id") DO NOTHING;
