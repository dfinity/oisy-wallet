import { AppWorker } from '$lib/services/_worker.services';
import { initWorkerCleanupOnPageUnload } from '$lib/utils/page-unload.utils';
import type { MockInstance } from 'vitest';

describe('page-unload.utils', () => {
	describe('initWorkerCleanupOnPageUnload', () => {
		let terminateAllWorkersSpy: MockInstance;
		let reloadSpy: MockInstance;

		// Captured instead of dispatched on `window`, so the listeners registered
		// here cannot leak into other test files.
		const handlers = new Map<string, EventListener>();

		const pageHide = (persisted: boolean) => {
			const event = new Event('pagehide') as PageTransitionEvent;
			Object.defineProperty(event, 'persisted', { value: persisted });

			handlers.get('pagehide')?.(event);
		};

		const pageShow = () => {
			handlers.get('pageshow')?.(new Event('pageshow'));
		};

		beforeAll(() => {
			const addEventListenerSpy = vi
				.spyOn(window, 'addEventListener')
				.mockImplementation(() => undefined);

			initWorkerCleanupOnPageUnload();

			addEventListenerSpy.mock.calls.forEach(([type, listener]) => {
				handlers.set(type, listener as EventListener);
			});

			addEventListenerSpy.mockRestore();
		});

		beforeEach(() => {
			vi.clearAllMocks();

			terminateAllWorkersSpy = vi
				.spyOn(AppWorker, 'terminateAllWorkers')
				.mockImplementation(() => {});

			Object.defineProperty(window, 'location', {
				writable: true,
				value: { reload: vi.fn() }
			});

			reloadSpy = window.location.reload as unknown as MockInstance;
		});

		afterEach(() => {
			// The module tracks teardown in a private flag. Drain it so a test that
			// tore the workers down does not arm the reload guard for the next one.
			pageShow();

			terminateAllWorkersSpy.mockRestore();
		});

		it('should register both pagehide and pageshow listeners', () => {
			expect(handlers.has('pagehide')).toBeTruthy();
			expect(handlers.has('pageshow')).toBeTruthy();
		});

		it('should terminate all workers when the page is really unloading', () => {
			pageHide(false);

			expect(terminateAllWorkersSpy).toHaveBeenCalledOnce();
		});

		it('should keep workers alive when the page enters the back/forward cache', () => {
			pageHide(true);

			expect(terminateAllWorkersSpy).not.toHaveBeenCalled();
		});

		it('should not reload a document shown without a prior teardown', () => {
			pageShow();

			expect(reloadSpy).not.toHaveBeenCalled();
		});

		it('should not reload a document restored after a back/forward cache pagehide', () => {
			pageHide(true);
			pageShow();

			expect(reloadSpy).not.toHaveBeenCalled();
		});

		it('should reload a document shown again after its workers were torn down', () => {
			pageHide(false);
			pageShow();

			expect(reloadSpy).toHaveBeenCalledOnce();
		});

		it('should reload only once per teardown', () => {
			pageHide(false);
			pageShow();
			pageShow();

			expect(reloadSpy).toHaveBeenCalledOnce();
		});
	});
});
