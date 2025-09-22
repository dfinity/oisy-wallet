import DateBadge from '$lib/components/ui/DateBadge.svelte';
import { render } from '@testing-library/svelte';
import { DATE_BADGE_ICON } from '$lib/constants/test-ids.constants';

describe('RewardDateBadge', () => {
	const testId = 'testBadge';

	const dateBadgeSelector = `span[data-tid="${testId}"]`;
	const dateBadgeIconSelector = `svg[data-tid="${DATE_BADGE_ICON}"]`;

	it('should display formatted date correctly', () => {
		const date = new Date('2025-09-22');

		const {container} = render(DateBadge, {
			props: {
				date,
				testId
			}
		})

		const dateBadge: HTMLSpanElement | null = container.querySelector(dateBadgeSelector);

		expect(dateBadge).toBeInTheDocument();

		expect(dateBadge?.textContent).toContain('Sep 22')
	});

	it('should display prefix if defined', () => {
		const {container} = render(DateBadge, {
			props: {
				date: new Date(),
				prefix: 'prefix',
				testId
			}
		})

		const dateBadge: HTMLSpanElement | null = container.querySelector(dateBadgeSelector);

		expect(dateBadge).toBeInTheDocument();

		expect(dateBadge?.textContent).toContain('prefix')
	});

	it('should display suffix if defined', () => {
		const {container} = render(DateBadge, {
			props: {
				date: new Date(),
				suffix: 'suffix',
				testId
			}
		})

		const dateBadge: HTMLSpanElement | null = container.querySelector(dateBadgeSelector);

		expect(dateBadge).toBeInTheDocument();

		expect(dateBadge?.textContent).toContain('suffix')
	});

	it('should display icon', () => {
		const {container} = render(DateBadge, {
			props: {
				date: new Date(),
				testId,
				showIcon: true,
			}
		})

		const dateBadge: HTMLSpanElement | null = container.querySelector(dateBadgeSelector);

		expect(dateBadge).toBeInTheDocument();

		const dateBadgeIcon: Element | null = container.querySelector(dateBadgeIconSelector);

		expect(dateBadgeIcon).toBeInTheDocument();
	});
});