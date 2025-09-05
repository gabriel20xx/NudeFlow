import path from 'path';
import { fileURLToPath } from 'url';
import {
	PORT as SHARED_PORT,
	ENABLE_HTTPS as SHARED_ENABLE_HTTPS,
	SSL_KEY_PATH as SHARED_SSL_KEY_PATH,
	SSL_CERT_PATH as SHARED_SSL_CERT_PATH,
	NUDESHARED_DIR as SHARED_NUDESHARED_DIR,
	PRELOAD_RADIUS as SHARED_PRELOAD_RADIUS,
	DATABASE_URL as SHARED_DATABASE_URL,
	PGHOST as SHARED_PGHOST,
	PGPORT as SHARED_PGPORT,
	PGUSER as SHARED_PGUSER,
	PGPASSWORD as SHARED_PGPASSWORD,
	PGDATABASE as SHARED_PGDATABASE,
	DATABASE_SSL as SHARED_DATABASE_SSL,
	SQLITE_PATH as SHARED_SQLITE_PATH
} from '../../../NudeShared/config/sharedConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try { (await import('dotenv')).config({ path: path.resolve(__dirname, '../../.env') }); } catch { /* ignore dotenv missing in prod/test */ void 0; }

export const PORT = SHARED_PORT || 8080;
export const SITE_TITLE = process.env.SITE_TITLE || 'NudeFlow';
export const ENABLE_HTTPS = SHARED_ENABLE_HTTPS;
export const SSL_KEY_PATH = SHARED_SSL_KEY_PATH;
export const SSL_CERT_PATH = SHARED_SSL_CERT_PATH;
export const NUDESHARED_DIR = SHARED_NUDESHARED_DIR;
export const PRELOAD_RADIUS = SHARED_PRELOAD_RADIUS;
export const DATABASE_URL = SHARED_DATABASE_URL;
export const PGHOST = SHARED_PGHOST;
export const PGPORT = SHARED_PGPORT;
export const PGUSER = SHARED_PGUSER;
export const PGPASSWORD = SHARED_PGPASSWORD;
export const PGDATABASE = SHARED_PGDATABASE;
export const DATABASE_SSL = SHARED_DATABASE_SSL;
export const SQLITE_PATH = SHARED_SQLITE_PATH;
