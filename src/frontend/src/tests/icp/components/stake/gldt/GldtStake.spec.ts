import GldtStake from '$icp/components/stake/gldt/GldtStake.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('GldtStake', () => {
	it('renders page title correctly', () => {
		const { container } = render(GldtStake);

		expect(container).toHaveTextContent(en.earning.cards.gold_description);
	});
});
