import { render } from '@testing-library/svelte';
import AirdropCard from '$lib/components/airdrops/AirdropCard.svelte';
import { mockAirdropEvents } from '$tests/mocks/airdrop-events.mock';

describe('AirdropCard', () => {
	it('should render airdrop card content', () => {
		const title = 'myTitle';
		const oneLiner = 'my onLiner';
		const mockedAirdrop = {...mockAirdropEvents[0], title, oneLiner}

		const testId = 'testId';
		const logoSelector = `div[data-tid="${testId}-logo"]`;
		const tagSelector = `ul[data-tid="${testId}-tag"]`;

		const { container, getByText } = render(AirdropCard, {
			props: {
				airdrop: mockedAirdrop,
				testId: testId
			}
		});

		expect(getByText(title)).toBeInTheDocument();
		expect(getByText(oneLiner)).toBeInTheDocument();

		const logo: HTMLDivElement | null = container.querySelector(logoSelector);
		expect(logo).toBeInTheDocument();

		const tag: HTMLUListElement | null = container.querySelector(tagSelector);
		expect(tag).toBeInTheDocument();
	});
});