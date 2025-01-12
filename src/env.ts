/**
 * Function overload for getting a required environment variable.
 * @param name The name of the environment variable
 * @param opts Options with required set to true
 * @returns The environment variable value
 */
export function getEnvVariable(name: string, opts: { required: true }): string;

/**
 * Function overload for getting an optional environment variable.
 * @param name The name of the environment variable
 * @param opts Options with required optionally set to false
 * @returns The environment variable value or undefined
 */
export function getEnvVariable(
  name: string,
  opts?: { required?: false },
): string | undefined;

/**
 * Gets an environment variable value with optional required flag.
 * Throws error if required is true and value is not found.
 * @param name The name of the environment variable
 * @param opts Options with optional required flag
 * @returns The environment variable value or undefined if not required
 */
export function getEnvVariable(
  name: string,
  opts?: { required?: boolean },
): string | undefined {
  const value = Deno.env.get(name);
  if (!opts?.required) {
    return value;
  }
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  DENO_ENV: getEnvVariable("DENO_ENV"),
  DEV: getEnvVariable("DENO_ENV") === "development",
  COOKIE_SECRET: getEnvVariable("COOKIE_SECRET", { required: true }),
  PUBLIC_URL: getEnvVariable("PUBLIC_URL"),
  PORT: getEnvVariable("PORT"),
  LOG_LEVEL: getEnvVariable("LOG_LEVEL"),
  KV_PATH: getEnvVariable("KV_PATH"),
};
