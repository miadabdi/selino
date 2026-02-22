type EnvInput = Record<string, unknown>;
type EnvOutput = Record<string, string | number | boolean | undefined>;

const NODE_ENVS = ["development", "production", "test"] as const;
const SMS_PROVIDERS = ["console", "kavenegar", "smsir"] as const;

function readString(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number" || typeof raw === "boolean") {
    return `${raw}`.trim();
  }
  return undefined;
}

function readRequiredString(
  env: EnvInput,
  key: string,
  errors: string[],
): string {
  const value = readString(env[key]);
  if (!value) {
    errors.push(`${key} is required`);
    return "";
  }
  return value;
}

function readOptionalString(env: EnvInput, key: string, fallback = ""): string {
  const value = readString(env[key]);
  return value ?? fallback;
}

function readEnumValue<T extends readonly string[]>(
  env: EnvInput,
  key: string,
  allowed: T,
  fallback: T[number],
  errors: string[],
): T[number] {
  const value = readString(env[key]) ?? fallback;
  if ((allowed as readonly string[]).includes(value)) {
    return value as T[number];
  }
  errors.push(`${key} must be one of: ${allowed.join(", ")}`);
  return fallback;
}

function readPositiveInt(
  env: EnvInput,
  key: string,
  fallback: number,
  errors: string[],
): number {
  const raw = readString(env[key]);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    errors.push(`${key} must be a positive integer`);
    return fallback;
  }
  return parsed;
}

function readBoolean(
  env: EnvInput,
  key: string,
  fallback: boolean,
  errors: string[],
): boolean {
  const raw = readString(env[key]);
  if (!raw) return fallback;
  const normalized = raw.toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  errors.push(`${key} must be "true" or "false"`);
  return fallback;
}

export function validateEnv(env: EnvInput): EnvOutput {
  const errors: string[] = [];

  const output: EnvOutput = {
    ...env,
    NODE_ENV: readEnumValue(env, "NODE_ENV", NODE_ENVS, "development", errors),
    PORT: readPositiveInt(env, "PORT", 3000, errors),

    DATABASE_URL: readRequiredString(env, "DATABASE_URL", errors),
    POSTGRES_DB: readOptionalString(env, "POSTGRES_DB", "selino"),
    POSTGRES_USER: readOptionalString(env, "POSTGRES_USER", "selino_user"),
    POSTGRES_PASSWORD: readOptionalString(env, "POSTGRES_PASSWORD", ""),
    POSTGRES_PORT: readPositiveInt(env, "POSTGRES_PORT", 5432, errors),
    POSTGRES_TEST_DB: readOptionalString(
      env,
      "POSTGRES_TEST_DB",
      "selino_test",
    ),
    POSTGRES_TEST_PORT: readPositiveInt(
      env,
      "POSTGRES_TEST_PORT",
      5433,
      errors,
    ),

    JWT_SECRET: readRequiredString(env, "JWT_SECRET", errors),
    JWT_EXPIRES_IN: readOptionalString(env, "JWT_EXPIRES_IN", "7d"),
    REFRESH_TOKEN_EXPIRES_IN_DAYS: readPositiveInt(
      env,
      "REFRESH_TOKEN_EXPIRES_IN_DAYS",
      30,
      errors,
    ),

    GOOGLE_CLIENT_ID: readRequiredString(env, "GOOGLE_CLIENT_ID", errors),
    GOOGLE_CLIENT_SECRET: readRequiredString(
      env,
      "GOOGLE_CLIENT_SECRET",
      errors,
    ),
    GOOGLE_CALLBACK_URL: readRequiredString(env, "GOOGLE_CALLBACK_URL", errors),

    RABBITMQ_URI: readRequiredString(env, "RABBITMQ_URI", errors),
    RABBITMQ_USER: readOptionalString(env, "RABBITMQ_USER", "selino_rmq"),
    RABBITMQ_PASS: readOptionalString(env, "RABBITMQ_PASS", ""),
    RABBITMQ_PORT: readPositiveInt(env, "RABBITMQ_PORT", 5672, errors),
    RABBITMQ_CONSOLE_PORT: readPositiveInt(
      env,
      "RABBITMQ_CONSOLE_PORT",
      15672,
      errors,
    ),

    SMS_PROVIDER: readEnumValue(
      env,
      "SMS_PROVIDER",
      SMS_PROVIDERS,
      "console",
      errors,
    ),
    KAVENEGAR_API_KEY: readOptionalString(env, "KAVENEGAR_API_KEY", ""),
    KAVENEGAR_SENDER: readOptionalString(env, "KAVENEGAR_SENDER", ""),
    SMSIR_API_KEY: readOptionalString(env, "SMSIR_API_KEY", ""),
    SMSIR_LINE_NUMBER: readPositiveInt(env, "SMSIR_LINE_NUMBER", 0, errors),
    SMSIR_VERIFY_TEMPLATE_ID: readPositiveInt(
      env,
      "SMSIR_VERIFY_TEMPLATE_ID",
      0,
      errors,
    ),
    SMSIR_VERIFY_CODE_PARAM: readOptionalString(
      env,
      "SMSIR_VERIFY_CODE_PARAM",
      "CODE",
    ),

    SMTP_HOST: readOptionalString(env, "SMTP_HOST", ""),
    SMTP_PORT: readPositiveInt(env, "SMTP_PORT", 587, errors),
    SMTP_USERNAME: readOptionalString(env, "SMTP_USERNAME", ""),
    SMTP_PASSWORD: readOptionalString(env, "SMTP_PASSWORD", ""),
    SMTP_FROM: readOptionalString(env, "SMTP_FROM", "noreply@selino.local"),

    STORAGE_ENDPOINT: readOptionalString(env, "STORAGE_ENDPOINT", ""),
    STORAGE_REGION: readRequiredString(env, "STORAGE_REGION", errors),
    STORAGE_ACCESS_KEY_ID: readRequiredString(
      env,
      "STORAGE_ACCESS_KEY_ID",
      errors,
    ),
    STORAGE_SECRET_ACCESS_KEY: readRequiredString(
      env,
      "STORAGE_SECRET_ACCESS_KEY",
      errors,
    ),
    STORAGE_FORCE_PATH_STYLE: readBoolean(
      env,
      "STORAGE_FORCE_PATH_STYLE",
      false,
      errors,
    ),
    STORAGE_PUBLIC_URL_BASE: readOptionalString(
      env,
      "STORAGE_PUBLIC_URL_BASE",
      "",
    ),
    STORAGE_BUCKET_PRODUCT_MEDIA: readRequiredString(
      env,
      "STORAGE_BUCKET_PRODUCT_MEDIA",
      errors,
    ),
    STORAGE_BUCKET_PROFILE_MEDIA: readRequiredString(
      env,
      "STORAGE_BUCKET_PROFILE_MEDIA",
      errors,
    ),
    STORAGE_PRODUCT_MEDIA_MAX_FILE_SIZE_BYTES: readPositiveInt(
      env,
      "STORAGE_PRODUCT_MEDIA_MAX_FILE_SIZE_BYTES",
      10 * 1024 * 1024,
      errors,
    ),
    STORAGE_PROFILE_MEDIA_MAX_FILE_SIZE_BYTES: readPositiveInt(
      env,
      "STORAGE_PROFILE_MEDIA_MAX_FILE_SIZE_BYTES",
      5 * 1024 * 1024,
      errors,
    ),

    OTP_TTL_MINUTES: readPositiveInt(env, "OTP_TTL_MINUTES", 20, errors),
    OTP_LENGTH: readPositiveInt(env, "OTP_LENGTH", 6, errors),
    USER_PROFILE_PICTURE_SIZE: readPositiveInt(
      env,
      "USER_PROFILE_PICTURE_SIZE",
      512,
      errors,
    ),
    FILES_PRESIGNED_URL_TTL_SECONDS: readPositiveInt(
      env,
      "FILES_PRESIGNED_URL_TTL_SECONDS",
      3600,
      errors,
    ),
    PURCHASE_REQUEST_EXPIRY_CHECK_INTERVAL_MS: readPositiveInt(
      env,
      "PURCHASE_REQUEST_EXPIRY_CHECK_INTERVAL_MS",
      60_000,
      errors,
    ),
    PURCHASE_REQUEST_ACTIVE_WINDOW_MINUTES: readPositiveInt(
      env,
      "PURCHASE_REQUEST_ACTIVE_WINDOW_MINUTES",
      15,
      errors,
    ),
    UPLOAD_MAX_PRODUCT_PICTURE_BYTES: readPositiveInt(
      env,
      "UPLOAD_MAX_PRODUCT_PICTURE_BYTES",
      10 * 1024 * 1024,
      errors,
    ),
    UPLOAD_MAX_PRODUCT_PICTURE_COUNT: readPositiveInt(
      env,
      "UPLOAD_MAX_PRODUCT_PICTURE_COUNT",
      15,
      errors,
    ),
    UPLOAD_MAX_STORE_LOGO_BYTES: readPositiveInt(
      env,
      "UPLOAD_MAX_STORE_LOGO_BYTES",
      10 * 1024 * 1024,
      errors,
    ),
    UPLOAD_MAX_PROFILE_IMAGE_BYTES: readPositiveInt(
      env,
      "UPLOAD_MAX_PROFILE_IMAGE_BYTES",
      10 * 1024 * 1024,
      errors,
    ),
  };

  if (output.SMS_PROVIDER === "kavenegar") {
    readRequiredString(output, "KAVENEGAR_API_KEY", errors);
    readRequiredString(output, "KAVENEGAR_SENDER", errors);
  } else if (output.SMS_PROVIDER === "smsir") {
    readRequiredString(output, "SMSIR_API_KEY", errors);
    if (!output.SMSIR_LINE_NUMBER) {
      errors.push("SMSIR_LINE_NUMBER is required when SMS_PROVIDER=smsir");
    }
  }

  if (output.SMTP_HOST && !output.SMTP_FROM) {
    errors.push("SMTP_FROM is required when SMTP_HOST is set");
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\\n- ${errors.join("\\n- ")}`,
    );
  }

  return output;
}
