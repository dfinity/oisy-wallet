import { GLDT_STAKE_CONTEXT_KEY, gldtStakeStore } from '$icp/stores/gldt-stake.store';
import StakeContext from '$lib/components/earning/StakeContext.svelte';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';
import * as sveltePackage from 'svelte';
import { setContext } from 'svelte';

describe('StakeContext', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(sveltePackage, 'setContext');
	});

	it('should render the children', () => {
		const { getByTestId } = render(StakeContext, { children: mockSnippet });

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
	});

	it('should initialize the GLDT stake context', () => {
		render(StakeContext, { children: mockSnippet });

		expect(setContext).toHaveBeenCalledExactlyOnceWith(GLDT_STAKE_CONTEXT_KEY, {
			store: gldtStakeStore
		});
	});
});
