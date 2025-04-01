// scripts/checkCoverageRatchet.ts
import fs from 'fs';

const current = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf-8'));
// Load this from CI or your last known good coverage:
const baseline = JSON.parse(fs.readFileSync('coverage/baseline-summary.json', 'utf-8'));

let failed = false;

for (const key in current.total) {
	const currentPct = current.total[key].pct;
	const baselinePct = baseline.total[key].pct;

	if (currentPct < baselinePct) {
		console.error(`❌ Coverage for "${key}" dropped: ${baselinePct}% → ${currentPct}%`);
		failed = true;
	}
}

if (failed) {
	process.exit(1);
} else {
	console.log('✅ Coverage ratchet passed.');
}
