// Type definitions for environment variables
// PostgreSQL Database Configuration

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            DATABASE_URL: string;
            NODE_ENV: 'development' | 'production' | 'test';
        }
    }
}

export { }

