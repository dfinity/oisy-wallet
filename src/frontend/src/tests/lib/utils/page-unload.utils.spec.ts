import { AppWorker } from '$lib/services/_worker.services';
import { initWorkerCleanupOnPageUnload } from '$lib/utils/page-unload.utils';

describe('page-unload.utils', () => {
	describe('initWorkerCleanupOnPageUnload', () => {
		let terminateAllWorkersSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			vi.clearAllMocks();

			terminateAllWorkersSpy = vi
				.spyOn(AppWorker, 'terminateAllWorkers')
				.mockImplementation(() => {});
		});

		afterEach(() => {
			terminateAllWorkersSpy.mockRestore();
		});

		const dispatchPageHide = (persisted: boolean) => {
			const event = new Event('pagehide') as PageTransitionEvent;
			Object.defineProperty(event, 'persisted', { value: persisted });
			window.dispatchEvent(event);
		};

		it('should terminate all workers when the page is really unloading', () => {
			initWorkerCleanupOnPageUnload();

			dispatchPageHide(false);

			expect(terminateAllWorkersSpy).toHaveBeenCalledOnce();
		});

		it('should keep workers alive when the page enters the back/forward cache', () => {
			initWorkerCleanupOnPageUnload();

			dispatchPageHide(true);

			expect(terminateAllWorkersSpy).not.toHaveBeenCalled();
		});
	});
});
