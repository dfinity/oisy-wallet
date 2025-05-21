import ShortcutGuard from '$lib/components/guard/ShortcutGuard.svelte';
import { isPrivacyMode } from '$lib/derived/settings.derived';
import { privacyModeStore } from '$lib/stores/settings.store';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('ShortcutGuard', () => {
	describe('Privacy mode', () => {
		const keyDownEvent = new KeyboardEvent('keydown', { key: 'p' });

		beforeEach(() => {
			privacyModeStore.set({ key: 'privacy-mode', value: { enabled: false } });
		});

		it('should turn on and off privacy mode on keyboard click', () => {
			render(ShortcutGuard);

			expect(get(isPrivacyMode)).toBeFalsy();

			window.dispatchEvent(keyDownEvent);

			expect(get(isPrivacyMode)).toBeTruthy();

			window.dispatchEvent(keyDownEvent);

			expect(get(isPrivacyMode)).toBeFalsy();
		});

		it('should not turn on privacy mode when typing in input field', () => {
			render(ShortcutGuard);

			const input = document.createElement('input');
			document.body.appendChild(input);
			input.focus();

			expect(get(isPrivacyMode)).toBeFalsy();

			input.dispatchEvent(keyDownEvent);

			expect(get(isPrivacyMode)).toBeFalsy();
		});

		it('should not turn on privacy mode when ctrl + p is pressed', () => {
			render(ShortcutGuard);

			expect(get(isPrivacyMode)).toBeFalsy();

			const ctrlPEvent = new KeyboardEvent('keydown', {
				key: 'p',
				ctrlKey: true
			});

			window.dispatchEvent(ctrlPEvent);

			expect(get(isPrivacyMode)).toBeFalsy();
		});
	});
});
