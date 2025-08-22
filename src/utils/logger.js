// Robust shared logger loader with multiple fallback search paths.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadSharedLogger() {
	const candidates = new Set();
	if (process.env.NUDESHARED_DIR) candidates.add(path.join(process.env.NUDESHARED_DIR, 'logger.js'));
	candidates.add(path.join(path.sep, 'app', 'NudeShared', 'src', 'logger.js'));
	candidates.add(path.join(__dirname, '..', '..', '..', 'NudeShared', 'logger.js'));
	candidates.add(path.join(__dirname, '..', '..', 'NudeShared', 'logger.js'));
	candidates.add(path.join(__dirname, '..', 'NudeShared', 'logger.js'));
	candidates.add(path.join(process.cwd(), 'NudeShared', 'logger.js'));
	candidates.add(path.join(path.sep, 'NudeShared', 'logger.js'));
	for (const fp of candidates) {
		try {
			if (fs.existsSync(fp)) {
				const mod = await import(pathToFileURL(fp).href);
				if (mod && mod.default) return mod.default;
				return mod;
			}
		} catch (err) { // swallowing individual path load errors is intentional; they are expected when probing
			void err; // ensure block is non-empty for eslint no-empty rule
		}
	}
	return {
		debug: () => {},
		info: (...a) => console.log('[INFO][SharedLoggerFallback]', ...a),
		warn: (...a) => console.warn('[WARN][SharedLoggerFallback]', ...a),
		error: (...a) => console.error('[ERROR][SharedLoggerFallback]', ...a),
		success: (...a) => console.log('[SUCCESS][SharedLoggerFallback]', ...a)
	};
}
const Logger = await loadSharedLogger();
export default Logger;
