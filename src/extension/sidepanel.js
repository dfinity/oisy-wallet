import { OISY_ORIGIN, OISY_PANEL_URL } from './config.js';

// OISY reports ready once its page has started; past this, the panel says OISY didn't load
// instead of leaving a blank frame.
const READY_TIMEOUT_MS = 15_000;

const frame = document.getElementById('oisy');
const loading = document.getElementById('loading');
const unreachable = document.getElementById('unreachable');

let readyTimer;
let loads = 0;

const show = (state) => {
	loading.hidden = state !== 'loading';
	unreachable.hidden = state !== 'unreachable';
	frame.hidden = state !== 'ready';
};

const load = () => {
	show('loading');
	clearTimeout(readyTimer);
	loads++;
	// A changing query makes Retry load the page again even when the address is the same.
	frame.src = `${OISY_PANEL_URL}?load=${loads}`;
	readyTimer = setTimeout(() => show('unreachable'), READY_TIMEOUT_MS);
};

window.addEventListener('message', (event) => {
	const fromOisyFrame = event.origin === OISY_ORIGIN && event.source === frame.contentWindow;
	if (!fromOisyFrame || event.data?.type !== 'oisy-panel-ready') {
		return;
	}
	clearTimeout(readyTimer);
	show('ready');
});

document.getElementById('retry').addEventListener('click', load);
document.getElementById('open-oisy').href = OISY_ORIGIN;

load();
