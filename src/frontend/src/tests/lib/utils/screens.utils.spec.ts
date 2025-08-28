import {
	AVAILABLE_SCREENS,
	MAX_SCREEN,
	MIN_SCREEN,
	filterScreens,
	getActiveScreen,
	shouldDisplayForScreen,
	type ScreensKeyType
} from '$lib/utils/screens.utils';

// Helper to convert rem to px for test comparison
const remToPx = (rem: string) => Number(rem.replaceAll('rem', '')) * 16;

describe('screens.utils tests', () => {
	describe('getActiveScreen', () => {
		it('should return the correct active screen based on screen width', () => {
			const availableScreensSortedByWidth = AVAILABLE_SCREENS;

			// Test case when screenWidth is smaller than the first screen width
			let screenWidth = remToPx('28rem') - 1; // Just below 'xs'

			expect(getActiveScreen({ screenWidth, availableScreensSortedByWidth })).toEqual(MIN_SCREEN);

			// Test case when screenWidth is in between 'md' and 'lg'
			screenWidth = remToPx('56rem'); // Between 'md' (48rem) and 'lg' (64rem)

			expect(getActiveScreen({ screenWidth, availableScreensSortedByWidth })).toEqual('lg');

			// Test case when screenWidth is larger than the largest screen width
			screenWidth = remToPx('160rem'); // Beyond '2.5xl'

			expect(getActiveScreen({ screenWidth, availableScreensSortedByWidth })).toEqual(MAX_SCREEN);
		});

		it('should return the correct screen even with unrealistic screen widths', () => {
			const availableScreensSortedByWidth = AVAILABLE_SCREENS;

			// Test invalid screenWidth (negative or extremely large value)
			let screenWidth = -1; // Invalid, negative width

			expect(getActiveScreen({ screenWidth, availableScreensSortedByWidth })).toEqual(MIN_SCREEN);

			screenWidth = 10000; // Unrealistically large screen width

			expect(getActiveScreen({ screenWidth, availableScreensSortedByWidth })).toEqual(MAX_SCREEN);
		});

		it('should return the smallest screen if no valid match is found', () => {
			const availableScreensSortedByWidth = AVAILABLE_SCREENS;

			// Test for a screenWidth smaller than any available screen (smaller than 'xs')
			const screenWidth = remToPx('10rem'); // Smaller than smallest screen (xs)

			expect(getActiveScreen({ screenWidth, availableScreensSortedByWidth })).toEqual(MIN_SCREEN);
		});
	});

	describe('filterScreens', () => {
		it('should filter screens correctly based on "up" and "down" parameters', () => {
			const availableScreens = AVAILABLE_SCREENS;

			// Test when filtering from 'sm' to 'xl'
			let filteredScreens = filterScreens({
				availableScreens,
				up: 'sm',
				down: 'xl'
			});

			expect(filteredScreens).toEqual(['sm', 'md', '1.5md', 'lg', '1.5lg', 'xl']);

			// Test when filtering from 'md' to '2xl'
			filteredScreens = filterScreens({
				availableScreens,
				up: 'md',
				down: '2xl'
			});

			expect(filteredScreens).toEqual(['md', '1.5md', 'lg', '1.5lg', 'xl', '1.5xl', '2xl']);

			// Test when "up" and "down" are the same
			filteredScreens = filterScreens({
				availableScreens,
				up: 'xs',
				down: 'xs'
			});

			expect(filteredScreens).toEqual(['xs']);
		});

		it('should return an empty array if invalid "up" or "down" is provided', () => {
			const availableScreens = AVAILABLE_SCREENS;

			// Test invalid up or down value
			const filteredScreens = filterScreens({
				availableScreens,
				up: 'invalid' as ScreensKeyType,
				down: 'xl'
			});

			expect(filteredScreens).toEqual([]);

			// Test with invalid "down" value
			const invalidFilteredScreens = filterScreens({
				availableScreens,
				up: 'sm',
				down: 'invalid' as ScreensKeyType
			});

			expect(invalidFilteredScreens).toEqual([]);
		});

		it('should return an empty array if the "up" and "down" are swapped (down before up)', () => {
			const availableScreens = AVAILABLE_SCREENS;

			// Test case where "up" screen comes after "down"
			const filteredScreens = filterScreens({
				availableScreens,
				up: 'xl',
				down: 'sm'
			});

			expect(filteredScreens).toEqual([]);
		});

		it('should handle case where "up" and "down" are not in the available screens list', () => {
			const availableScreens = AVAILABLE_SCREENS;

			// "up" and "down" values that do not exist in the available screens
			const filteredScreens = filterScreens({
				availableScreens,
				up: 'nonExistentScreen' as ScreensKeyType,
				down: 'anotherInvalidScreen' as ScreensKeyType
			});

			expect(filteredScreens).toEqual([]);
		});

		it('should return an empty array if "up" or "down" is undefined or null', () => {
			const availableScreens = AVAILABLE_SCREENS;

			// Passing undefined or null as "up" or "down"
			let filteredScreens = filterScreens({
				availableScreens,
				up: undefined as unknown as ScreensKeyType,
				down: 'xl'
			});

			expect(filteredScreens).toEqual([]);

			filteredScreens = filterScreens({
				availableScreens,
				up: 'sm',
				down: null as unknown as ScreensKeyType
			});

			expect(filteredScreens).toEqual([]);
		});
	});

	describe('shouldDisplayForScreen', () => {
		it('should return true if the activeScreen is in the filtered screens list', () => {
			const availableScreens = AVAILABLE_SCREENS;
			const filteredScreens = filterScreens({
				availableScreens,
				up: 'sm',
				down: 'xl'
			});

			// Test with an activeScreen that is in the filtered list
			const result = shouldDisplayForScreen({
				filteredScreens,
				activeScreen: 'lg'
			});

			expect(result).toBeTruthy();

			// Test with an activeScreen that is NOT in the filtered list
			const result2 = shouldDisplayForScreen({
				filteredScreens,
				activeScreen: '2.5xl'
			});

			expect(result2).toBeFalsy();
		});

		it('should return false if the activeScreen is not in the filtered screens list', () => {
			const availableScreens = AVAILABLE_SCREENS;
			const filteredScreens = filterScreens({
				availableScreens,
				up: 'md',
				down: '2xl'
			});

			// Test with an activeScreen that is not in the filtered list
			const result = shouldDisplayForScreen({
				filteredScreens,
				activeScreen: 'xs'
			});

			expect(result).toBeFalsy();
		});

		it('should return false if the activeScreen is undefined or invalid', () => {
			const availableScreens = AVAILABLE_SCREENS;
			const filteredScreens = filterScreens({
				availableScreens,
				up: 'sm',
				down: 'xl'
			});

			// Test with an invalid activeScreen (undefined or null)
			const result = shouldDisplayForScreen({
				filteredScreens,
				activeScreen: undefined as unknown as ScreensKeyType
			});

			expect(result).toBeFalsy();

			const result2 = shouldDisplayForScreen({
				filteredScreens,
				activeScreen: 'nonExistentScreen' as ScreensKeyType
			});

			expect(result2).toBeFalsy();
		});

		it('should return false if filteredScreens is an empty array', () => {
			const filteredScreens: ScreensKeyType[] = [];

			// Test with an empty filteredScreens array
			const result = shouldDisplayForScreen({
				filteredScreens,
				activeScreen: 'sm'
			});

			expect(result).toBeFalsy();
		});
	});
});
