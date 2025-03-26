import {
	filterScreens,
	getActiveScreen,
	getAvailableScreens,
	shouldDisplayForScreen,
	type ScreensKeyType
} from '$lib/utils/screens.utils';
import { describe, expect, it } from 'vitest';

// Helper to convert rem to px for test comparison
const remToPx = (rem: string) => Number(rem.replaceAll('rem', '')) * 16;

describe('screens.utils tests', () => {
	describe('getAvailableScreens', () => {
		it('should return sorted available screens by width (ascending) and ignore raw values', () => {
			const availableScreens = getAvailableScreens();

			// Expected screens sorted by width in px
			const expectedScreens = [
				{ screen: 'xs', width: remToPx('28rem') },
				{ screen: 'sm', width: remToPx('40rem') },
				{ screen: 'md', width: remToPx('48rem') },
				{ screen: '1.5md', width: remToPx('56rem') },
				{ screen: 'lg', width: remToPx('64rem') },
				{ screen: '1.5lg', width: remToPx('72rem') },
				{ screen: 'xl', width: remToPx('80rem') },
				{ screen: '1.5xl', width: remToPx('88rem') },
				{ screen: '2xl', width: remToPx('96rem') },
				{ screen: '2.5xl', width: remToPx('108rem') }
			];

			expect(availableScreens).toEqual(expectedScreens);
		});
	});

	describe('getActiveScreen', () => {
		it('should return the correct active screen based on screen width', () => {
			const availableScreens = getAvailableScreens();

			// Test case when screenWidth is smaller than the first screen width
			let screenWidth = remToPx('28rem') - 1; // Just below 'xs'
			expect(getActiveScreen({ screenWidth, availableScreens })).toBe('xs');

			// Test case when screenWidth is in between 'md' and 'lg'
			screenWidth = remToPx('56rem'); // Between 'md' (48rem) and 'lg' (64rem)
			expect(getActiveScreen({ screenWidth, availableScreens })).toBe('lg');

			// Test case when screenWidth is larger than the largest screen width
			screenWidth = remToPx('160rem'); // Beyond '2.5xl'
			expect(getActiveScreen({ screenWidth, availableScreens })).toBe('2.5xl');
		});
	});

	describe('filterScreens', () => {
		it('should filter screens correctly based on "up" and "down" parameters', () => {
			const availableScreens = getAvailableScreens();

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
			const availableScreens = getAvailableScreens();

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
	});

	describe('shouldDisplayForScreen', () => {
		it('should return true if the activeScreen is in the filtered screens list', () => {
			const availableScreens = getAvailableScreens();
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
			expect(result).toBe(true);

			// Test with an activeScreen that is NOT in the filtered list
			const result2 = shouldDisplayForScreen({
				filteredScreens,
				activeScreen: '2.5xl'
			});
			expect(result2).toBe(false);
		});

		it('should return false if the activeScreen is not in the filtered screens list', () => {
			const availableScreens = getAvailableScreens();
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
			expect(result).toBe(false);
		});
	});
});
