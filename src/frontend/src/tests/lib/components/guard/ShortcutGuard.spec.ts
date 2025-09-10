import ShortcutGuard from '$lib/components/guard/ShortcutGuard.svelte';
import { isPrivacyMode } from '$lib/derived/settings.derived';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('ShortcutGuard', () => {
	describe('Privacy mode', () => {
		const keyDownEvent = new KeyboardEvent('keydown', { key: 'p' });

		beforeEach(() => {
			setPrivacyMode({ enabled: false });
		});

		it('should turn on and off privacy mode on keyboard click', () => {
			render(ShortcutGuard, { children: mockSnippet });

			expect(get(isPrivacyMode)).toBeFalsy();

			window.dispatchEvent(keyDownEvent);

			expect(get(isPrivacyMode)).toBeTruthy();

			window.dispatchEvent(keyDownEvent);

			expect(get(isPrivacyMode)).toBeFalsy();
		});

		it('should not turn on privacy mode when typing in input field', () => {
			render(ShortcutGuard, { children: mockSnippet });

			const input = document.createElement('input');
			document.body.appendChild(input);
			input.focus();

			expect(get(isPrivacyMode)).toBeFalsy();

			input.dispatchEvent(keyDownEvent);

			expect(get(isPrivacyMode)).toBeFalsy();
		});

		it('should not turn on privacy mode when ctrl + p is pressed', () => {
			render(ShortcutGuard, { children: mockSnippet });

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
