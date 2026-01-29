const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local or .env
try {
    const dotenv = require('dotenv');
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envPathDefault = path.resolve(process.cwd(), '.env');

    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log('📁 Loaded environment from .env.local');
    } else if (fs.existsSync(envPathDefault)) {
        dotenv.config({ path: envPathDefault });
        console.log('📁 Loaded environment from .env');
    }
} catch (e) {
    // dotenv might not be available in production, that's OK
    console.log('📁 Using system environment variables');
}

// Configuration
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectWithRetry() {
    if (!process.env.DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL environment variable is not set.');
        console.error('   Please set DATABASE_URL in your environment or .env.local file');
        console.error('   Example: postgresql://user:password@localhost:5432/database');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`🔌 Attempting database connection (${attempt}/${MAX_RETRIES})...`);
            const client = await pool.connect();
            console.log('✅ Connected to PostgreSQL database!');
            return { pool, client };
        } catch (err) {
            console.error(`❌ Connection attempt ${attempt} failed:`, err.message);
            if (attempt < MAX_RETRIES) {
                console.log(`⏳ Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
                await sleep(RETRY_DELAY_MS);
            } else {
                console.error('❌ Max retries reached. Could not connect to database.');
                process.exit(1);
            }
        }
    }
}

async function migrate() {
    console.log('');
    console.log('🚀 RSL Smart Vote - Database Migration');
    console.log('=========================================');

    const { pool, client } = await connectWithRetry();

    try {
        const schemaPath = path.join(__dirname, '..', 'schema.sql');
        if (!fs.existsSync(schemaPath)) {
            console.error('❌ Error: schema.sql not found at', schemaPath);
            process.exit(1);
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📋 Running migration...');
        await client.query('BEGIN');
        await client.query(schemaSql);
        await client.query('COMMIT');

        // Verify tables were created
        const { rows: tables } = await client.query(`
            SELECT tablename FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
        `);

        console.log('');
        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('📊 Tables in database:');
        tables.forEach(t => console.log(`   - ${t.tablename}`));
        console.log('');
        console.log(`   Total: ${tables.length} tables`);
        console.log('');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

