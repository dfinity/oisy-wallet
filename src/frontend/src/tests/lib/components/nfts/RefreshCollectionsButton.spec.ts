import RefreshCollectionsButton from '$lib/components/nfts/RefreshCollectionsButton.svelte';
import * as eventsUtils from '$lib/utils/events.utils';
import { emit } from '$lib/utils/events.utils';
import { render, waitFor } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

describe('RefreshCollectionsButton', () => {
	let spyEmit: MockInstance;

	const mockTestId = 'test-id';

	const props = {
		testId: mockTestId
	};

	const mockEmit = vi
		.fn()
		.mockImplementation(({ detail }: { message: string; detail?: { callback?: () => void } }) => {
			// call the callback after

			detail?.callback?.();
		});

	beforeEach(() => {
		vi.clearAllMocks();

		spyEmit = vi.spyOn(eventsUtils, 'emit').mockImplementation(mockEmit);
	});

	it('should render the button', () => {
		const { getByTestId } = render(RefreshCollectionsButton, { props });

		const button = getByTestId(mockTestId) as HTMLButtonElement;

		expect(button).toBeInTheDocument();
		expect(button.tagName).toBe('BUTTON');
		expect(button).toBeEnabled();
	});

	it('should render the icon', () => {
		const { container } = render(RefreshCollectionsButton, { props });

		expect(container.querySelector('svg')).toBeInTheDocument();
	});

	it('should emit event `oisyReloadCollections` on click', () => {
		const { getByTestId } = render(RefreshCollectionsButton, { props });

		const button = getByTestId(mockTestId) as HTMLButtonElement;

		button.click();

		expect(emit).toHaveBeenCalledExactlyOnceWith({
			message: 'oisyReloadCollections',
			detail: { callback: expect.any(Function) }
		});
	});

	it('should be loading before the event is emitted and finished afterwards', async () => {
		spyEmit.mockImplementation(vi.fn());

		const { getByTestId } = render(RefreshCollectionsButton, { props });

		const button = getByTestId(mockTestId) as HTMLButtonElement;

		expect(button).toBeEnabled();

		button.click();

		await waitFor(() => {
			expect(button).toBeDisabled();
		});

		const emittedDetail = spyEmit.mock.calls[0][0].detail;
		if ('callback' in emittedDetail) {
			emittedDetail.callback();
		}

		await waitFor(() => {
			expect(button).toBeEnabled();
		});
	});
});
