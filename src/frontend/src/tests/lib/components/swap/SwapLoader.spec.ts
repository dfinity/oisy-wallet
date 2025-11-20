import SwapLoader from '$lib/components/swap/SwapLoader.svelte';
import { render } from '@testing-library/svelte';

describe('SwapLoader', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render button snippet', () => {
		const mockButton = vi.fn();
		render(SwapLoader, { button: mockButton });

		expect(mockButton).toHaveBeenCalled();
	});
});
