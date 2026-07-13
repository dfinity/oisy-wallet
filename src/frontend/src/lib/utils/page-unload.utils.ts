import { browser } from '$app/environment';
import { AppWorker } from '$lib/services/_worker.services';

const onPageHide = ($event: PageTransitionEvent) => {
	// When the page enters the back/forward cache it may be restored later, so
	// its workers must stay alive. Only tear down on a real unload.
	if ($event.persisted) {
		return;
	}

	AppWorker.terminateAllWorkers();
};

/**
 * Frees the page's worker threads as soon as the document is discarded.
 *
 * Each enabled token spawns a wallet worker (~14 MB of memory apiece), and on
 * reload the old document's workers stay resident while the new document
 * spawns its own — memory roughly doubles at exactly the moment users watch
 * it. Terminating the workers on `pagehide` releases the old generation
 * immediately instead of waiting for the browser to tear the document down.
 */
export const initWorkerCleanupOnPageUnload = () => {
	if (!browser) {
		return;
	}

	window.addEventListener('pagehide', onPageHide);
};
