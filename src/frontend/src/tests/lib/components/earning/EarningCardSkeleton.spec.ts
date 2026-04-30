import EarningCardSkeleton from '$lib/components/earning/EarningCardSkeleton.svelte';
import { EARNING_CARD_SKELETON, TOKEN_SKELETON_TEXT } from '$lib/constants/test-ids.constants';
import { render } from '@testing-library/svelte';

describe('EarningCardSkeleton', () => {
	it('renders with the provided test ID', () => {
		const { getByTestId } = render(EarningCardSkeleton, {
			props: { testId: EARNING_CARD_SKELETON }
		});

		expect(getByTestId(EARNING_CARD_SKELETON)).toBeInTheDocument();
	});

	it('renders skeleton text elements', () => {
		const { getAllByTestId } = render(EarningCardSkeleton, {
			props: { testId: EARNING_CARD_SKELETON }
		});

		const skeletonTexts = getAllByTestId(TOKEN_SKELETON_TEXT);

		expect(skeletonTexts.length).toBeGreaterThanOrEqual(4);
	});
});
