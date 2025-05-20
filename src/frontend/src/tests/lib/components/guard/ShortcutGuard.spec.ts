import {render} from "@testing-library/svelte";
import ShortcutGuard from "$lib/components/guard/ShortcutGuard.svelte";
import {get} from "svelte/store";
import {isPrivacyMode} from "$lib/derived/settings.derived";
import {privacyModeStore} from "$lib/stores/settings.store";

describe('ShortcutGuard', () => {
    describe('Privacy mode', () => {
        const keyDownEvent = new KeyboardEvent('keydown', { key: 'p' });

        beforeEach(() => {
            privacyModeStore.set({ key: 'privacy-mode', value: { enabled: false } });
        });

        it('should turn on and off privacy mode on keyboard click', () => {
            render(ShortcutGuard);

            expect(get(isPrivacyMode)).toBe(false);

            window.dispatchEvent(keyDownEvent);

            expect(get(isPrivacyMode)).toBe(true);

            window.dispatchEvent(keyDownEvent);

            expect(get(isPrivacyMode)).toBe(false);
        });

        it('should not turn on privacy mode when typing in input field', () => {
            render(ShortcutGuard);

            const input = document.createElement('input');
            document.body.appendChild(input);
            input.focus();

            expect(get(isPrivacyMode)).toBe(false);

            input.dispatchEvent(keyDownEvent);

            expect(get(isPrivacyMode)).toBe(false);
        });
    });
});