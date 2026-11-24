import LandingSection from '$lib/components/auth/LandingSection.svelte';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('LandingSection', () => {
	const props = {
		id: 'landing-test',
		eyebrow: 'Eyebrow',
		title: 'A title',
		description: 'A description',
		visual: mockSnippet
	};

	it('labels the section with its heading and renders the visual', () => {
		const { getByRole, getByTestId } = render(LandingSection, { props });

		const region = getByRole('region', { name: props.title });

		expect(region).toHaveAttribute('id', props.id);
		expect(region).toHaveAttribute('tabindex', '-1');
		expect(getByRole('heading', { level: 2, name: props.title })).toBeInTheDocument();
		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
	});

	it('renders the points as a list', () => {
		const points = ['First point', 'Second point'];
		const { getAllByRole } = render(LandingSection, { props: { ...props, points } });

		expect(getAllByRole('listitem').map(({ textContent }) => textContent?.trim())).toEqual(points);
	});

	it('renders no list without points', () => {
		const { queryByRole } = render(LandingSection, { props });

		expect(queryByRole('list')).not.toBeInTheDocument();
	});
});
