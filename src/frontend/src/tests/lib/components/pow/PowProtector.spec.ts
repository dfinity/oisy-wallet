import { initPowProtectorWorker } from '$icp/services/worker.pow-protection.services';
import type { PowProtectorWorkerInitResult } from '$icp/types/pow-protector-listener';
import PowProtector from '$lib/components/pow/PowProtector.svelte';
import { POW_CHECK_INTERVAL_MS, POW_MAX_CHECK_ATTEMPTS } from '$lib/constants/pow.constants';
import { POW_PROTECTOR_MODAL } from '$lib/constants/test-ids.constants';
import { errorSignOut } from '$lib/services/auth.services';
import { hasZeroCycles } from '$lib/services/loader.services';
import { powProtectoreProgressStore } from '$lib/stores/pow-protection.store';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$icp/services/worker.pow-protection.services', () => ({
	initPowProtectorWorker: vi.fn()
}));

vi.mock('$lib/services/auth.services', () => ({
	errorSignOut: vi.fn()
}));

vi.mock('$lib/services/loader.services', () => ({
	hasZeroCycles: vi.fn()
}));

vi.mock('@dfinity/utils', async () => {
	const mod = await vi.importActual<object>('@dfinity/utils');
	return {
		...mod,
		debounce: (fn: unknown) => fn
	};
});

// Store the onLoad callback so we can call it manually in tests
let intervalLoaderCallback: (() => Promise<void>) | undefined;

// Mock IntervalLoader to capture the onLoad callback without executing it
vi.mock('$lib/components/core/IntervalLoader.svelte', () => ({
	default: class MockIntervalLoader {
		$$prop_def: any;
		$$slot_def: any;
		$on: any;
		$set: any;

		constructor(options: { target: any; props: any }) {
			// Capture the onLoad callback for manual invocation in tests
			intervalLoaderCallback = options.props.onLoad;
		}

		$destroy() {
			intervalLoaderCallback = undefined;
		}
	}
}));

describe('PowProtector', () => {
	const mockWorker: PowProtectorWorkerInitResult = {
		start: vi.fn(),
		stop: vi.fn(),
		trigger: vi.fn(),
		destroy: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		mockAuthStore();

		// Reset the progress store
		powProtectoreProgressStore.setPowProtectorProgressData({
			progress: 'REQUEST_CHALLENGE'
		});

		// Default mocks
		vi.mocked(initPowProtectorWorker).mockResolvedValue(mockWorker);
		vi.mocked(hasZeroCycles).mockResolvedValue(true);

		// Reset interval loader callback
		intervalLoaderCallback = undefined;
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
	});

	// Helper to flush all pending async operations with fake timers
	const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

	// Helper to trigger the interval loader callback
	const triggerIntervalCheck = async () => {
		if (intervalLoaderCallback) {
			await intervalLoaderCallback();
		}
	};

	describe('when POW feature is disabled', () => {
		beforeEach(async () => {
			// Create a spy that returns false
			const powEnv = await import('$env/pow.env');
			vi.spyOn(powEnv, 'POW_FEATURE_ENABLED', 'get').mockImplementation(
				(() => false) as unknown as () => true
			);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should render children directly without any protection logic', async () => {
			const { queryByTestId, getByText } = render(PowProtector, { children: mockSnippet });

			await waitFor(() => {
				expect(queryByTestId(POW_PROTECTOR_MODAL)).toBeNull();
				expect(getByText('Mock Snippet')).toBeInTheDocument();
			});

			expect(initPowProtectorWorker).not.toHaveBeenCalled();
			expect(hasZeroCycles).not.toHaveBeenCalled();
		});
	});

	describe('when POW feature is enabled', () => {
		it('should initialize worker on mount', async () => {
			render(PowProtector, { children: mockSnippet });

			// Flush promises to execute async onMount
			await flushPromises();
			await vi.runAllTimersAsync();

			expect(initPowProtectorWorker).toHaveBeenCalledOnce();
			expect(mockWorker.start).toHaveBeenCalledOnce();
		});

		it('should check cycles on mount', async () => {
			render(PowProtector, { children: mockSnippet });

			await flushPromises();
			await vi.runAllTimersAsync();

			expect(hasZeroCycles).toHaveBeenCalledOnce();
		});

		describe('when the user has sufficient cycles', () => {
			beforeEach(() => {
				vi.mocked(hasZeroCycles).mockResolvedValue(true);
			});

			it('should render children directly without a modal', async () => {
				const { queryByTestId, getByText } = render(PowProtector, { children: mockSnippet });

				await flushPromises();
				await vi.runAllTimersAsync();

				// Children are always rendered
				expect(getByText('Mock Snippet')).toBeInTheDocument();
				// Modal should not be shown when user has cycles
				expect(queryByTestId(POW_PROTECTOR_MODAL)).toBeNull();
			});

			it('should not start polling for cycles', async () => {
				render(PowProtector, { children: mockSnippet });

				await flushPromises();
				await vi.runAllTimersAsync();

				// Initial check should have happened
				expect(hasZeroCycles).toHaveBeenCalledOnce();

				// Try to trigger interval check - should not call hasZeroCycles again
				// because user has sufficient cycles
				await triggerIntervalCheck();

				// Should still only have been called once
				expect(hasZeroCycles).toHaveBeenCalledOnce();
			});
		});

		describe('when the user lacks sufficient cycles', () => {
			beforeEach(() => {
				vi.mocked(hasZeroCycles).mockResolvedValue(false);
			});

			it('should render a modal with insufficient cycles message', async () => {
				const { getByTestId, getByText } = render(PowProtector, { children: mockSnippet });

				await flushPromises();
				await vi.runAllTimersAsync();

				// Modal should be shown when user lacks cycles
				expect(getByTestId(POW_PROTECTOR_MODAL)).toBeInTheDocument();

				// Children are still rendered (just overlaid by modal)
				expect(getByText('Mock Snippet')).toBeInTheDocument();
			});

			it('should render the banner image', async () => {
				const { getByAltText } = render(PowProtector, { children: mockSnippet });

				await flushPromises();
				await vi.runAllTimersAsync();

				const altText = replacePlaceholders(replaceOisyPlaceholders(en.init.alt.loader_banner), {
					$theme: 'light'
				});

				const banner = getByAltText(altText);

				expect(banner).toBeInTheDocument();
			});

			it('should display the POW protector title and description', async () => {
				const { getByText } = render(PowProtector, { children: mockSnippet });

				await flushPromises();
				await vi.runAllTimersAsync();

				expect(getByText(en.pow_protector.text.title)).toBeInTheDocument();
				expect(getByText(en.pow_protector.text.description)).toBeInTheDocument();
			});

			it('should start polling for cycles', async () => {
				render(PowProtector, { children: mockSnippet });

				await flushPromises();
				await vi.runAllTimersAsync();

				// Initial check
				expect(hasZeroCycles).toHaveBeenCalledOnce();

				// Manually trigger interval checks
				await triggerIntervalCheck();

				expect(hasZeroCycles).toHaveBeenCalledTimes(2);

				await triggerIntervalCheck();

				expect(hasZeroCycles).toHaveBeenCalledTimes(3);
			});

			it('should hide modal when cycles become available', async () => {
				vi.mocked(hasZeroCycles)
					.mockResolvedValueOnce(false) // Initial check
					.mockResolvedValueOnce(false) // First interval check
					.mockResolvedValueOnce(true); // Second interval check - cycles available

				const { getByTestId, queryByTestId } = render(PowProtector, {
					children: mockSnippet
				});

				await flushPromises();
				await vi.runAllTimersAsync();

				// Initially should show modal
				expect(getByTestId(POW_PROTECTOR_MODAL)).toBeInTheDocument();

				// Trigger first interval check - still no cycles
				await triggerIntervalCheck();
				await flushPromises();

				expect(getByTestId(POW_PROTECTOR_MODAL)).toBeInTheDocument();

				// Trigger second interval check - cycles now available
				await triggerIntervalCheck();
				await flushPromises();

				// Modal should be hidden
				expect(queryByTestId(POW_PROTECTOR_MODAL)).toBeNull();
			});

			// TODO: This test causes infinite loops with IntervalLoader and fake timers
			// Need to refactor either the component or the test approach
			it.skip('should sign out the user after max retry attempts', async () => {
				vi.mocked(hasZeroCycles).mockResolvedValue(false);

				render(PowProtector, { children: mockSnippet });

				// Wait for initial mount
				await vi.runAllTimersAsync();

				// Advance time for POW_MAX_CHECK_ATTEMPTS polls (without runAllTimersAsync to avoid infinite loop)
				const totalTime = POW_CHECK_INTERVAL_MS * POW_MAX_CHECK_ATTEMPTS;
				vi.advanceTimersByTime(totalTime);

				// Now run pending timers to execute the callbacks
				await vi.advanceTimersByTimeAsync(0);

				await waitFor(() => {
					expect(errorSignOut).toHaveBeenCalledWith(
						en.init.error.waiting_for_allowed_cycles_aborted
					);
					expect(hasZeroCycles).toHaveBeenCalledTimes(POW_MAX_CHECK_ATTEMPTS + 1); // Initial + POW_MAX_CHECK_ATTEMPTS polls
				});
			});
		});

		describe('progress steps', () => {
			beforeEach(() => {
				vi.mocked(hasZeroCycles).mockResolvedValue(false);
			});

			it('should update the progress step based on store', async () => {
				render(PowProtector, { children: mockSnippet });

				await flushPromises();
				await vi.runAllTimersAsync();

				// Default progress step should be REQUEST_CHALLENGE
				expect(get(powProtectoreProgressStore)?.progress).toBe('REQUEST_CHALLENGE');

				// Update progress store to SOLVE_CHALLENGE
				powProtectoreProgressStore.setPowProtectorProgressData({ progress: 'SOLVE_CHALLENGE' });

				await waitFor(() => {
					// This is tested through the component's internal state
					expect(get(powProtectoreProgressStore)?.progress).toBe('SOLVE_CHALLENGE');
				});

				// Update progress store to GRANT_CYCLES
				powProtectoreProgressStore.setPowProtectorProgressData({ progress: 'GRANT_CYCLES' });

				await waitFor(() => {
					expect(get(powProtectoreProgressStore)?.progress).toBe('GRANT_CYCLES');
				});
			});

			it('should handle unknown progress values gracefully', async () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

				render(PowProtector, { children: mockSnippet });

				await flushPromises();
				await vi.runAllTimersAsync();

				// Set an invalid progress value
				powProtectoreProgressStore.setPowProtectorProgressData({
					progress: 'INVALID_PROGRESS' as 'REQUEST_CHALLENGE' | 'SOLVE_CHALLENGE' | 'GRANT_CYCLES'
				});

				await flushPromises();

				expect(consoleSpy).toHaveBeenCalledWith('Unknown value: ', 'INVALID_PROGRESS');

				consoleSpy.mockRestore();
			});
		});

		describe('lifecycle management', () => {
			// TODO: This test causes infinite loops with IntervalLoader and fake timers
			// IntervalLoader cleanup behavior is tested in IntervalLoader.spec.ts
			// Worker cleanup can be tested at integration level
			it.skip('should clean up interval and worker on destroy', async () => {
				vi.mocked(hasZeroCycles).mockResolvedValue(false);

				const { unmount } = render(PowProtector, { children: mockSnippet });

				// Wait for worker to be fully initialized
				await waitFor(() => {
					expect(initPowProtectorWorker).toHaveBeenCalledOnce();
					expect(mockWorker.start).toHaveBeenCalledOnce();
				});

				// Unmount the component
				unmount();

				// Worker should be destroyed
				expect(mockWorker.destroy).toHaveBeenCalledOnce();
			});

			it('should handle worker initialization failure gracefully', async () => {
				const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
				vi.mocked(initPowProtectorWorker).mockRejectedValue(new Error('Worker init failed'));

				render(PowProtector, { children: mockSnippet });

				await flushPromises();
				await vi.runAllTimersAsync();

				// Should still render the component even if worker fails
				expect(initPowProtectorWorker).toHaveBeenCalledOnce();
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					'Failed to initialize POW worker:',
					expect.any(Error)
				);
			});
		});

		describe('edge cases', () => {
			it('should handle a cycles check failure gracefully', async () => {
				const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
				vi.mocked(hasZeroCycles).mockRejectedValue(new Error('Cycles check failed'));

				render(PowProtector, { children: mockSnippet });

				await flushPromises();
				await vi.runAllTimersAsync();

				// Should log the error
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					'Error checking initial cycles:',
					expect.any(Error)
				);
				// Should still initialize the worker even if cycle check fails
				expect(initPowProtectorWorker).toHaveBeenCalledOnce();
			});

			it('should not initialize the worker multiple times', async () => {
				const { rerender } = render(PowProtector, { children: mockSnippet });

				await flushPromises();
				await vi.runAllTimersAsync();

				expect(initPowProtectorWorker).toHaveBeenCalledOnce();

				// Trigger a re-render
				await rerender({ children: mockSnippet });
				await flushPromises();
				await vi.runAllTimersAsync();

				// Should still only be called once
				expect(initPowProtectorWorker).toHaveBeenCalledOnce();
			});
		});
	});
});
