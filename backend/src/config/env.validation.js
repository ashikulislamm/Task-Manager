import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z.string({ required_error: 'MONGODB_URI environment variable is required' }).min(1),
  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET environment variable is required' })
    .min(8, 'JWT_SECRET must be at least 8 characters long'),
  CLIENT_URL: z.string({ required_error: 'CLIENT_URL environment variable is required' }).min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const validateEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Environment validation failed:');
    result.error.errors.forEach((err) => {
      console.error(`   - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }

  // Override process.env with parsed values (like coerced PORT)
  Object.assign(process.env, result.data);
};

export default validateEnv;
