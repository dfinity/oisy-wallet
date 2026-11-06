import { fireEvent, screen, waitFor } from '@testing-library/svelte';

const POPOVER_CONTENT = 'popover-content';

// A panel's exit transition runs on real timers, which a loaded machine stretches past the default
// one-second wait.
const PANEL_TIMEOUT = 5_000;

/**
 * Opens a `FilterChip` by its test id and returns its options panel, for a spec to pick from.
 *
 * A panel closed just before (a pick from the other chip) can still be playing its exit, so this
 * waits for it to leave first: otherwise the panel found could be that one, not this chip's.
 */
export const openFilterChip = async (testId: string): Promise<HTMLElement> => {
	await waitFor(() => expect(screen.queryByTestId(POPOVER_CONTENT)).not.toBeInTheDocument(), {
		timeout: PANEL_TIMEOUT
	});

	await fireEvent.click(screen.getByTestId(`${testId}-trigger`));

	return await screen.findByTestId(POPOVER_CONTENT, undefined, { timeout: PANEL_TIMEOUT });
};
