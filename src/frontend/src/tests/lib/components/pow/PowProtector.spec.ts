import type * as PowEnv from '$env/pow.env';
import { PowProtectorWorker } from '$icp/services/worker.pow-protection.services';
import PowProtector from '$lib/components/pow/PowProtector.svelte';
import { POW_CHECK_INTERVAL_MS, POW_MAX_CHECK_ATTEMPTS } from '$lib/constants/pow.constants';
import { POW_PROTECTOR_MODAL } from '$lib/constants/test-ids.constants';
import { errorSignOut } from '$lib/services/auth.services';
import { isCyclesAllowanceSpent } from '$lib/services/loader.services';
import { powProtectoreProgressStore } from '$lib/stores/pow-protection.store';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

// Mock the POW feature environment variable with a getter function
vi.mock('$env/pow.env', () => ({
	get POW_FEATURE_ENABLED(): boolean {
		// This will be overridden in tests using vi.mocked
		return true;
	}
}));

vi.mock('$lib/services/auth.services', () => ({
	errorSignOut: vi.fn()
}));

vi.mock('$lib/services/loader.services', () => ({
	isCyclesAllowanceSpent: vi.fn()
}));

vi.mock('@dfinity/utils', async () => {
	const mod = await vi.importActual<object>('@dfinity/utils');
	return {
		...mod,
		debounce: (fn: unknown) => fn
	};
});

describe('PowProtector', () => {
	const mockWorker: PowProtectorWorker = {
		start: vi.fn(),
		trigger: vi.fn(),
		destroy: vi.fn()
	} as unknown as PowProtectorWorker;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		mockAuthStore();

		// Reset the progress store
		powProtectoreProgressStore.setPowProtectorProgressData({
			progress: 'REQUEST_CHALLENGE'
		});

		// Default mocks
		vi.spyOn(PowProtectorWorker, 'init').mockResolvedValue(mockWorker);
		// Default: cycles allowance is NOT spent (user has sufficient cycles)
		vi.mocked(isCyclesAllowanceSpent).mockResolvedValue(false);
	});

	afterEach(() => {
		try {
			vi.runOnlyPendingTimers();
		} catch {
			// Ignore error if timers are not mocked
		}
		vi.useRealTimers();
	});

	// Helper to flush microtasks with fake timers
	const flushMicrotasks = async () => {
		await vi.advanceTimersByTimeAsync(0);
	};

	describe('when POW feature is disabled', () => {
		let originalPowEnv: typeof PowEnv;

		beforeEach(async () => {
			// Store original and create a spy that returns false
			originalPowEnv = await import('$env/pow.env');
			vi.spyOn(originalPowEnv, 'POW_FEATURE_ENABLED', 'get').mockReturnValue(false);
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

			expect(PowProtectorWorker.init).not.toHaveBeenCalled();
			expect(isCyclesAllowanceSpent).not.toHaveBeenCalled();
		});
	});

	describe('when POW feature is enabled', () => {
		it('should initialize worker on mount', async () => {
			render(PowProtector, { children: mockSnippet });

			// Flush microtasks to allow onMount to complete
			await flushMicrotasks();

			expect(PowProtectorWorker.init).toHaveBeenCalledOnce();
			expect(mockWorker.start).toHaveBeenCalledOnce();
		});

		it('should check cycles on mount', async () => {
			render(PowProtector, { children: mockSnippet });

			// Flush microtasks to allow onMount to complete
			await flushMicrotasks();

			expect(isCyclesAllowanceSpent).toHaveBeenCalledOnce();
		});

		describe('when the user has sufficient cycles', () => {
			beforeEach(() => {
				// Cycles allowance is NOT spent (user has sufficient cycles)
				vi.mocked(isCyclesAllowanceSpent).mockResolvedValue(false);
			});

			it('should render children directly without a modal', async () => {
				const { queryByTestId, getByText } = render(PowProtector, { children: mockSnippet });

				await flushMicrotasks();

				expect(queryByTestId(POW_PROTECTOR_MODAL)).toBeNull();
				expect(getByText('Mock Snippet')).toBeInTheDocument();
			});

			it('should not start polling for cycles', async () => {
				render(PowProtector, { children: mockSnippet });

				await flushMicrotasks();

				// Initial check should have happened
				expect(isCyclesAllowanceSpent).toHaveBeenCalledOnce();

				// Advance time - should not trigger more checks since cycles are available
				await vi.advanceTimersByTimeAsync(POW_CHECK_INTERVAL_MS * 2);

				expect(isCyclesAllowanceSpent).toHaveBeenCalledOnce(); // Only initial call
			});
		});

		describe('when the user lacks sufficient cycles', () => {
			beforeEach(() => {
				// Cycles allowance IS spent (user lacks sufficient cycles)
				vi.mocked(isCyclesAllowanceSpent).mockResolvedValue(true);
			});

			it('should render a modal with insufficient cycles message', async () => {
				const { getByTestId, queryByText } = render(PowProtector, { children: mockSnippet });

				await flushMicrotasks();

				expect(getByTestId(POW_PROTECTOR_MODAL)).toBeInTheDocument();
				// Children are NOT rendered when modal is showing (they're in the else branch)
				expect(queryByText('Mock Snippet')).toBeNull();
			});

			it('should render the banner image', async () => {
				const { getByAltText } = render(PowProtector, { children: mockSnippet });

				await flushMicrotasks();

				const altText = replacePlaceholders(replaceOisyPlaceholders(en.init.alt.loader_banner), {
					$theme: 'light'
				});

				await waitFor(() => {
					const banner = getByAltText(altText);

					expect(banner).toBeInTheDocument();
				});
			});

			it('should display the POW protector title and description', async () => {
				const { getByText } = render(PowProtector, { children: mockSnippet });

				await flushMicrotasks();

				expect(getByText(en.pow_protector.text.title)).toBeInTheDocument();
				expect(getByText(en.pow_protector.text.description)).toBeInTheDocument();
			});

			it('should start polling for cycles', async () => {
				render(PowProtector, { children: mockSnippet });

				await flushMicrotasks();

				// Initial check
				expect(isCyclesAllowanceSpent).toHaveBeenCalledOnce();

				// Advance time by one interval
				await vi.advanceTimersByTimeAsync(POW_CHECK_INTERVAL_MS);

				expect(isCyclesAllowanceSpent).toHaveBeenCalledTimes(2);

				// Advance time by another interval
				await vi.advanceTimersByTimeAsync(POW_CHECK_INTERVAL_MS);

				expect(isCyclesAllowanceSpent).toHaveBeenCalledTimes(3);
			});

			it('should stop polling and render children when cycles become available', async () => {
				vi.mocked(isCyclesAllowanceSpent)
					.mockResolvedValueOnce(true) // Initial check - cycles spent
					.mockResolvedValueOnce(true) // First poll - still spent
					.mockResolvedValueOnce(false); // Second poll - now has cycles

				const { getByTestId, getByText, queryByTestId } = render(PowProtector, {
					children: mockSnippet
				});

				await flushMicrotasks();

				// Initially should show modal
				expect(getByTestId(POW_PROTECTOR_MODAL)).toBeInTheDocument();

				// Advance time to trigger first poll - still no cycles
				await vi.advanceTimersByTimeAsync(POW_CHECK_INTERVAL_MS);
				await flushMicrotasks();

				expect(getByTestId(POW_PROTECTOR_MODAL)).toBeInTheDocument();

				// Advance time to trigger second poll - cycles now available
				await vi.advanceTimersByTimeAsync(POW_CHECK_INTERVAL_MS);
				await flushMicrotasks();

				// Poll for DOM update with small time advances to let Svelte react
				let attempts = 0;
				const maxAttempts = 50;
				while (queryByTestId(POW_PROTECTOR_MODAL) !== null && attempts < maxAttempts) {
					await vi.advanceTimersByTimeAsync(10);
					await flushMicrotasks();
					attempts++;
				}

				// Should now render children and hide modal
				expect(queryByTestId(POW_PROTECTOR_MODAL)).toBeNull();
				expect(getByText('Mock Snippet')).toBeInTheDocument();

				// No more polling should happen
				await vi.advanceTimersByTimeAsync(POW_CHECK_INTERVAL_MS);

				expect(isCyclesAllowanceSpent).toHaveBeenCalledTimes(3);
			});

			it('should sign out the user after max retry attempts', async () => {
				vi.mocked(isCyclesAllowanceSpent).mockResolvedValue(true);

				render(PowProtector, { children: mockSnippet });

				await flushMicrotasks();

				// Initial check should have happened
				expect(isCyclesAllowanceSpent).toHaveBeenCalledOnce();

				// Advance time for POW_MAX_CHECK_ATTEMPTS - 1 more attempts
				for (let i = 0; i < POW_MAX_CHECK_ATTEMPTS - 1; i++) {
					await vi.advanceTimersByTimeAsync(POW_CHECK_INTERVAL_MS);
				}

				// Should have reached max attempts and signed out
				expect(errorSignOut).toHaveBeenCalledWith(en.init.error.waiting_for_allowed_cycles_aborted);
				expect(isCyclesAllowanceSpent).toHaveBeenCalledTimes(POW_MAX_CHECK_ATTEMPTS);
			});
		});

		describe('progress steps', () => {
			beforeEach(() => {
				// Cycles allowance IS spent (user lacks sufficient cycles)
				vi.mocked(isCyclesAllowanceSpent).mockResolvedValue(true);
			});

			it('should update the progress step based on store', async () => {
				render(PowProtector, { children: mockSnippet });

				// Default progress step should be REQUEST_CHALLENGE
				await waitFor(() => {
					expect(get(powProtectoreProgressStore)?.progress).toBe('REQUEST_CHALLENGE');
				});

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

				// Set an invalid progress value
				powProtectoreProgressStore.setPowProtectorProgressData({
					progress: 'INVALID_PROGRESS' as 'REQUEST_CHALLENGE' | 'SOLVE_CHALLENGE' | 'GRANT_CYCLES'
				});

				await waitFor(() => {
					expect(consoleSpy).toHaveBeenCalledWith('Unknown value: ', 'INVALID_PROGRESS');
				});

				consoleSpy.mockRestore();
			});
		});

		describe('lifecycle management', () => {
			it('should clean up interval and worker on destroy', async () => {
				// Cycles allowance IS spent so polling starts
				vi.mocked(isCyclesAllowanceSpent).mockResolvedValue(true);

				const { unmount } = render(PowProtector, { children: mockSnippet });

				await flushMicrotasks();

				expect(PowProtectorWorker.init).toHaveBeenCalledOnce();
				expect(mockWorker.start).toHaveBeenCalledOnce();

				// Verify polling started
				await vi.advanceTimersByTimeAsync(POW_CHECK_INTERVAL_MS);

				expect(isCyclesAllowanceSpent).toHaveBeenCalledTimes(2);

				// Unmount the component
				unmount();
				await flushMicrotasks();

				// Worker should be destroyed
				expect(mockWorker.destroy).toHaveBeenCalledOnce();

				// Polling should stop
				const callCount = vi.mocked(isCyclesAllowanceSpent).mock.calls.length;
				await vi.advanceTimersByTimeAsync(POW_CHECK_INTERVAL_MS * 2);

				expect(isCyclesAllowanceSpent).toHaveBeenCalledTimes(callCount);
			});

			it('should handle worker initialization failure gracefully', async () => {
				const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
				vi.mocked(PowProtectorWorker.init).mockRejectedValue(new Error('Worker init failed'));

				render(PowProtector, { children: mockSnippet });

				await flushMicrotasks();

				// Should still render the component even if worker fails
				expect(PowProtectorWorker.init).toHaveBeenCalledOnce();
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					'Failed to initialize POW worker:',
					expect.any(Error)
				);

				consoleErrorSpy.mockRestore();
			});
		});

		describe('edge cases', () => {
			it('should handle a cycles check failure gracefully', async () => {
				const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
				vi.mocked(isCyclesAllowanceSpent).mockRejectedValue(new Error('Cycles check failed'));

				render(PowProtector, { children: mockSnippet });

				await flushMicrotasks();

				// Should log the error
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					'Error checking initial cycles:',
					expect.any(Error)
				);
				// Should still initialize the worker even if cycle check fails
				expect(PowProtectorWorker.init).toHaveBeenCalledOnce();

				consoleErrorSpy.mockRestore();
			});

			it('should not initialize the worker multiple times', async () => {
				const { rerender } = render(PowProtector, { children: mockSnippet });

				await flushMicrotasks();

				expect(PowProtectorWorker.init).toHaveBeenCalledOnce();

				// Trigger a re-render
				rerender({ children: mockSnippet });

				await flushMicrotasks();

				// Should still only be called once
				expect(PowProtectorWorker.init).toHaveBeenCalledOnce();
			});
		});
	});
});
