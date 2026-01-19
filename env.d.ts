// Type definitions for Cloudflare D1 bindings

interface CloudflareEnv {
    DB: D1Database
}

declare global {
    interface CloudflareEnv {
        DB: D1Database
    }
}

export { }
