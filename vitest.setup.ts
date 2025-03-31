import { mockPage } from '$tests/mocks/page.store.mock';
import {
	allowLoggingForDebugging,
	disableConsoleLog,
	failTestsThatLogToConsole
} from '$tests/utils/console.test-utils';
import { HttpAgent } from '@dfinity/agent';
import '@testing-library/jest-dom';
import { configure } from '@testing-library/svelte';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

// We mock ResizeObserver and element.animate because neither JSDOM nor Happy DOM supports them, while Svelte v5 requires them.
// Interesting related thread: https://github.com/testing-library/svelte-testing-library/issues/284
global.ResizeObserver = class ResizeObserver {
	observe() {
		// do nothing
	}
	unobserve() {
		// do nothing
	}
	disconnect() {
		// do nothing
	}
};

// eslint-disable-next-line local-rules/prefer-object-params
Element.prototype.animate = (
	_keyframes: Keyframe[] | PropertyIndexedKeyframes,
	options?: number | KeyframeAnimationOptions
): Animation => {
	const animation = {
		abort: vi.fn(),
		cancel: vi.fn(),
		finished: Promise.resolve()
		// Svelte v5 register onfinish
		// Source: https://github.com/sveltejs/svelte/blob/75f81991c27e9602d4bb3eb44aec8775de0713af/packages/svelte/src/internal/client/dom/elements/transitions.js#L386
		// onfinish: () => undefined
	} as unknown as Animation;

	setTimeout(
		// @ts-expect-error We are omitting the parameter of onfinish for simplicity reason and because Svelte v5 do not use those.
		() => animation.onfinish(),
		typeof options === 'number' ? options : Number(options?.duration ?? 0)
	);

	return animation;
};

vi.mock('$app/stores', () => ({
	page: mockPage
}));

vi.mock(import('$lib/actors/agents.ic'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		// eslint-disable-next-line require-await
		getAgent: async () => mock<HttpAgent>()
	};
});

failTestsThatLogToConsole();

if (process.env.ALLOW_LOGGING_FOR_DEBUGGING) {
	allowLoggingForDebugging();
}

disableConsoleLog();

configure({
	testIdAttribute: 'data-tid'
});
