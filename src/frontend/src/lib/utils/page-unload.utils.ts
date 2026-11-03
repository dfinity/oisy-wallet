import { browser } from '$app/environment';
import { AppWorker } from '$lib/services/_worker.services';

let terminated = false;

const onPageHide = ($event: PageTransitionEvent) => {
	// When the page enters the back/forward cache it may be restored later, so
	// its workers must stay alive. Only tear down on a real unload.
	if ($event.persisted) {
		return;
	}

	terminated = true;

	AppWorker.terminateAllWorkers();
};

const onPageShow = () => {
	// A document that fired `pagehide` with `persisted: false` is discarded and
	// can never be shown again, so getting here after a teardown means the
	// browser misreported the flag. The threads are gone but their wrappers are
	// not, and `postMessage` would keep queueing into dead workers without ever
	// erroring — balances would silently stop updating. A reload is the only
	// recovery. Deliberately not gated on `$event.persisted`: WebKit is known to
	// misreport it on restore too, which would disable this guard exactly where
	// it is most needed.
	if (!terminated) {
		return;
	}

	terminated = false;

	window.location.reload();
};

/**
 * Frees the page's worker threads as soon as the document is discarded.
 *
 * Each enabled token spawns a wallet worker (~14 MB of memory apiece), and on
 * reload the old document's workers stay resident while the new document
 * spawns its own — memory roughly doubles at exactly the moment users watch
 * it. Terminating the workers on `pagehide` releases the old generation
 * immediately instead of waiting for the browser to tear the document down.
 *
 * The paired `pageshow` listener is a safety net for browsers that misreport
 * `persisted`: it reloads a document that came back after its workers were
 * torn down, turning silent permanent breakage into one reload.
 */
export const initWorkerCleanupOnPageUnload = () => {
	if (!browser) {
		return;
	}

	window.addEventListener('pagehide', onPageHide);
	window.addEventListener('pageshow', onPageShow);
};
