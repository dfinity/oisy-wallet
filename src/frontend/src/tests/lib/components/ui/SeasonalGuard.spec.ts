import SeasonalGuard from '$lib/components/ui/SeasonalGuard.svelte';
import { createMockSnippet, mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('SeasonalGuard', () => {
	const mockHalloweenTestId = 'halloween-snippet';
	const mockChristmasTestId = 'christmas-snippet';

	const mockHalloweenSnippet = createMockSnippet(mockHalloweenTestId);
	const mockChristmasSnippet = createMockSnippet(mockChristmasTestId);

	const mockProps = {
		children: mockSnippet,
		halloween: mockHalloweenSnippet,
		christmas: mockChristmasSnippet
	};

	beforeEach(() => {
		vi.useFakeTimers();

		// Set it by default to the 17th of June 2025
		vi.setSystemTime(new Date('2025-06-17'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should render the children when not in a seasonal period', () => {
		const { getByTestId, queryByTestId } = render(SeasonalGuard, {
			props: mockProps
		});

		expect(getByTestId(mockSnippetTestId)).toBeDefined();
		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

		expect(queryByTestId(mockHalloweenTestId)).toBeNull();
		expect(queryByTestId(mockChristmasTestId)).toBeNull();
	});

	describe('Halloween Period', () => {
		const testCases = [
			'2025-10-27',
			'2025-10-28',
			'2025-10-29',
			'2025-10-30',
			'2025-10-31',
			'2025-11-01',
			'2025-11-02',
			'2025-11-03'
		];

		it('should render the Halloween snippet when in the Halloween period', () => {
			testCases.forEach((date) => {
				vi.setSystemTime(new Date(date));

				const { getByTestId, queryByTestId, unmount } = render(SeasonalGuard, {
					props: mockProps
				});

				expect(getByTestId(mockHalloweenTestId)).toBeDefined();
				expect(getByTestId(mockHalloweenTestId)).toBeInTheDocument();

				expect(queryByTestId(mockSnippetTestId)).toBeNull();

				unmount();
			});
		});

		it('should not render the Halloween snippet when not in the Halloween period', () => {
			const testCases = ['2025-10-26', '2025-11-04'];

			testCases.forEach((date) => {
				vi.setSystemTime(new Date(date));

				const { getByTestId, queryByTestId, unmount } = render(SeasonalGuard, {
					props: mockProps
				});

				expect(getByTestId(mockSnippetTestId)).toBeDefined();
				expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

				expect(queryByTestId(mockHalloweenTestId)).toBeNull();

				unmount();
			});
		});

		it('should default to the main snippet if no seasonal snippet is provided', () => {
			testCases.forEach((date) => {
				vi.setSystemTime(new Date(date));

				const { getByTestId, queryByTestId, unmount } = render(SeasonalGuard, {
					props: { ...mockProps, halloween: undefined }
				});

				expect(getByTestId(mockSnippetTestId)).toBeDefined();
				expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

				expect(queryByTestId(mockHalloweenTestId)).toBeNull();

				unmount();
			});
		});
	});

	describe('Christmas Period', () => {
		const testCases = [
			'2025-12-18',
			'2025-12-24',
			'2025-12-25',
			'2025-12-26',
			'2025-12-27',
			'2025-12-28',
			'2025-12-29',
			'2025-12-30'
		];

		it('should render the Christmas snippet when in the Christmas period', () => {
			testCases.forEach((date) => {
				vi.setSystemTime(new Date(date));

				const { getByTestId, queryByTestId, unmount } = render(SeasonalGuard, {
					props: mockProps
				});

				expect(getByTestId(mockChristmasTestId)).toBeDefined();
				expect(getByTestId(mockChristmasTestId)).toBeInTheDocument();

				expect(queryByTestId(mockSnippetTestId)).toBeNull();

				unmount();
			});
		});

		it('should not render the Christmas snippet when not in the Christmas period', () => {
			const testCases = ['2025-12-17', '2025-12-31', '2026-01-07'];

			testCases.forEach((date) => {
				vi.setSystemTime(new Date(date));

				const { getByTestId, queryByTestId, unmount } = render(SeasonalGuard, {
					props: mockProps
				});

				expect(getByTestId(mockSnippetTestId)).toBeDefined();
				expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

				expect(queryByTestId(mockChristmasTestId)).toBeNull();

				unmount();
			});
		});

		it('should default to the main snippet if no seasonal snippet is provided', () => {
			testCases.forEach((date) => {
				vi.setSystemTime(new Date(date));

				const { getByTestId, queryByTestId, unmount } = render(SeasonalGuard, {
					props: { ...mockProps, christmas: undefined }
				});

				expect(getByTestId(mockSnippetTestId)).toBeDefined();
				expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

				expect(queryByTestId(mockChristmasTestId)).toBeNull();

				unmount();
			});
		});
	});
});
