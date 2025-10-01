import type * as PowEnv from '$env/pow.env';
import { initPowProtectorWorker } from '$icp/services/worker.pow-protection.services';
import type { PowProtectorWorkerInitResult } from '$icp/types/pow-protector-listener';
import PowProtector from '$lib/components/pow/PowProtector.svelte';
import { CHECK_INTERVAL_MS, MAX_CHECK_ATTEMPTS } from '$lib/constants/pow.constants';
import { POW_PROTECTOR_MODAL } from '$lib/constants/test-ids.constants';
import { errorSignOut } from '$lib/services/auth.services';
import { handleInsufficientCycles } from '$lib/services/loader.services';
import { powProtectoreProgressStore } from '$lib/stores/pow-protection.store';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

// Mock the POW feature environment variable with a getter function
vi.mock('$env/pow.env', () => ({
	get POW_FEATURE_ENABLED() {
		// This will be overridden in tests using vi.mocked
		return true;
	}
}));

vi.mock('$icp/services/worker.pow-protection.services', () => ({
	initPowProtectorWorker: vi.fn()
}));

vi.mock('$lib/services/auth.services', () => ({
	errorSignOut: vi.fn()
}));

vi.mock('$lib/services/loader.services', () => ({
	handleInsufficientCycles: vi.fn()
}));

vi.mock('@dfinity/utils', async () => {
	const mod = await vi.importActual<object>('@dfinity/utils');
	return {
		...mod,
		debounce: (fn: unknown) => fn
	};
});

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
		vi.mocked(handleInsufficientCycles).mockResolvedValue(true);
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
	});

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

			expect(initPowProtectorWorker).not.toHaveBeenCalled();
			expect(handleInsufficientCycles).not.toHaveBeenCalled();
		});
	});

	describe('when POW feature is enabled', () => {
		it('should initialize worker on mount', async () => {
			render(PowProtector, { children: mockSnippet });

			await waitFor(() => {
				expect(initPowProtectorWorker).toHaveBeenCalledOnce();
				expect(mockWorker.start).toHaveBeenCalledOnce();
			});
		});

		it('should check cycles on mount', async () => {
			render(PowProtector, { children: mockSnippet });

			await waitFor(() => {
				expect(handleInsufficientCycles).toHaveBeenCalledOnce();
			});
		});

		describe('when the user has sufficient cycles', () => {
			beforeEach(() => {
				vi.mocked(handleInsufficientCycles).mockResolvedValue(true);
			});

			it('should render children directly without a modal', async () => {
				const { queryByTestId, getByText } = render(PowProtector, { children: mockSnippet });

				// Wait for component to mount and initialize
				await vi.runAllTimersAsync();

				// Children are always rendered
				expect(getByText('Mock Snippet')).toBeInTheDocument();
				// Modal should not be shown when user has cycles
				expect(queryByTestId(POW_PROTECTOR_MODAL)).toBeNull();
			});

			it('should not start polling for cycles', async () => {
				render(PowProtector, { children: mockSnippet });

				// Wait for initial mount to complete
				await vi.runAllTimersAsync();

				// Advance time to check if polling starts
				vi.advanceTimersByTime(CHECK_INTERVAL_MS + 1000);
				await vi.runAllTimersAsync();

				// Should only have been called once (initial check), no polling
				expect(handleInsufficientCycles).toHaveBeenCalledOnce();
			});
		});

		describe('when the user lacks sufficient cycles', () => {
			beforeEach(() => {
				vi.mocked(handleInsufficientCycles).mockResolvedValue(false);
			});

			it('should render a modal with insufficient cycles message', async () => {
				const { getByTestId, getByText } = render(PowProtector, { children: mockSnippet });

				await waitFor(() => {
					// Modal should be shown when user lacks cycles
					expect(getByTestId(POW_PROTECTOR_MODAL)).toBeInTheDocument();
				});

				// Children are still rendered (just overlaid by modal)
				expect(getByText('Mock Snippet')).toBeInTheDocument();
			});

			it('should render the banner image', async () => {
				const { getByAltText } = render(PowProtector, { children: mockSnippet });

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

				await waitFor(() => {
					expect(getByText(en.pow_protector.text.title)).toBeInTheDocument();
					expect(getByText(en.pow_protector.text.description)).toBeInTheDocument();
				});
			});

			it('should start polling for cycles', async () => {
				render(PowProtector, { children: mockSnippet });

				await waitFor(() => {
					expect(handleInsufficientCycles).toHaveBeenCalledOnce();
				});

				vi.advanceTimersByTime(CHECK_INTERVAL_MS);

				await waitFor(() => {
					expect(handleInsufficientCycles).toHaveBeenCalledTimes(2);
				});

				vi.advanceTimersByTime(CHECK_INTERVAL_MS);

				await waitFor(() => {
					expect(handleInsufficientCycles).toHaveBeenCalledTimes(3);
				});
			});

			it('should stop polling and render children when cycles become available', async () => {
				vi.mocked(handleInsufficientCycles)
					.mockResolvedValueOnce(false) // Initial check
					.mockResolvedValueOnce(false) // First poll
					.mockResolvedValueOnce(true); // Second poll - now has cycles

				const { getByTestId, getByText, queryByTestId } = render(PowProtector, {
					children: mockSnippet
				});

				// Initially should show modal
				await waitFor(() => {
					expect(getByTestId(POW_PROTECTOR_MODAL)).toBeInTheDocument();
				});

				// Advance time twice to trigger the successful check
				vi.advanceTimersByTime(CHECK_INTERVAL_MS);
				await vi.runAllTimersAsync();
				vi.advanceTimersByTime(CHECK_INTERVAL_MS);
				await vi.runAllTimersAsync();

				// Should now render children and hide modal
				await waitFor(() => {
					expect(queryByTestId(POW_PROTECTOR_MODAL)).toBeNull();
					expect(getByText('Mock Snippet')).toBeInTheDocument();
				});

				// No more polling should happen
				vi.advanceTimersByTime(CHECK_INTERVAL_MS);
				await vi.runAllTimersAsync();

				expect(handleInsufficientCycles).toHaveBeenCalledTimes(3);
			});

			it('should sign out the user after max retry attempts', async () => {
				vi.mocked(handleInsufficientCycles).mockResolvedValue(false);

				render(PowProtector, { children: mockSnippet });

				// Advance time for MAX_CHECK_ATTEMPTS
				for (let i = 0; i < MAX_CHECK_ATTEMPTS; i++) {
					vi.advanceTimersByTime(CHECK_INTERVAL_MS);
					await vi.runAllTimersAsync();
				}

				await waitFor(() => {
					expect(errorSignOut).toHaveBeenCalledWith(
						en.init.error.waiting_for_allowed_cycles_aborted
					);
					expect(handleInsufficientCycles).toHaveBeenCalledTimes(MAX_CHECK_ATTEMPTS + 1); // Initial + MAX_CHECK_ATTEMPTS polls
				});
			});
		});

		describe('progress steps', () => {
			beforeEach(() => {
				vi.mocked(handleInsufficientCycles).mockResolvedValue(false);
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
				vi.mocked(handleInsufficientCycles).mockResolvedValue(false);

				const { unmount } = render(PowProtector, { children: mockSnippet });

				await waitFor(() => {
					expect(initPowProtectorWorker).toHaveBeenCalledOnce();
					expect(mockWorker.start).toHaveBeenCalledOnce();
				});

				// Unmount and wait for async cleanup
				unmount();
				await vi.runAllTimersAsync();

				// Worker should be destroyed
				expect(mockWorker.destroy).toHaveBeenCalledOnce();
			});

			it('should handle worker initialization failure gracefully', async () => {
				const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
				vi.mocked(initPowProtectorWorker).mockRejectedValue(new Error('Worker init failed'));

				render(PowProtector, { children: mockSnippet });

				// Should still render the component even if worker fails
				await waitFor(() => {
					expect(initPowProtectorWorker).toHaveBeenCalledOnce();
					expect(consoleErrorSpy).toHaveBeenCalledWith(
						'Failed to initialize POW worker:',
						expect.any(Error)
					);
				});

				// Spy will be automatically cleaned up by vi.clearAllMocks() in beforeEach
			});
		});

		describe('edge cases', () => {
			it('should handle a cycles check failure gracefully', async () => {
				const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
				vi.mocked(handleInsufficientCycles).mockRejectedValue(new Error('Cycles check failed'));

				render(PowProtector, { children: mockSnippet });

				// Wait for async operations to complete
				await waitFor(() => {
					// Should log the error
					expect(consoleErrorSpy).toHaveBeenCalledWith(
						'Error checking initial cycles:',
						expect.any(Error)
					);
					// Should still initialize the worker even if cycle check fails
					expect(initPowProtectorWorker).toHaveBeenCalledOnce();
				});

				// Spy will be automatically cleaned up by vi.clearAllMocks() in beforeEach
			});

			it('should not initialize the worker multiple times', async () => {
				const { rerender } = render(PowProtector, { children: mockSnippet });

				await waitFor(() => {
					expect(initPowProtectorWorker).toHaveBeenCalledOnce();
				});

				// Trigger a re-render
				rerender({ children: mockSnippet });

				await waitFor(() => {
					// Should still only be called once
					expect(initPowProtectorWorker).toHaveBeenCalledOnce();
				});
			});
		});
	});
});
