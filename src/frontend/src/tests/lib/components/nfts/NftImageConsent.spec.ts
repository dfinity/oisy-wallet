import NftImageConsent from '$lib/components/nfts/NftImageConsent.svelte';
import { render } from '@testing-library/svelte';

describe('NftImageConsent', () => {
	it('should render the review consent when hasConsent is false', () => {
		render(NftImageConsent, {});
	});

	it('should open the review consent modal when review is clicked', () => {});

	it('should render the children if hasConsent is true', () => {});

	it('should not show the text if showMessage is false', () => {});
});
