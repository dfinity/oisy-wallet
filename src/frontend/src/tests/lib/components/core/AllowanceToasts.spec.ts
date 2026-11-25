import * as ownCyclesEnv from '$env/own-cycles.env';
import AllowanceToasts from '$lib/components/core/AllowanceToasts.svelte';
import IconFuelPump from '$lib/components/icons/IconFuelPump.svelte';
import { OISY_USAGE_CREDITS_DOCS_URL } from '$lib/constants/oisy.constants';
import { allowanceIssueStore } from '$lib/stores/allowance-issue.store';
import { allowanceToastStore } from '$lib/stores/allowance-toast.store';
import { screensStore } from '$lib/stores/screens.store';
import * as toasts from '$lib/stores/toasts.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('AllowanceToasts', () => {
	const issueToast = {
		level: 'warn',
		theme: 'inverted',
		icon: IconFuelPump,
		title: replaceOisyPlaceholders(en.core.warning.oisy_allowance_used_up_title),
		text: replaceOisyPlaceholders(en.core.warning.oisy_allowance_used_up),
		overflow: 'visible',
		link: { href: OISY_USAGE_CREDITS_DOCS_URL, label: en.core.text.learn_more }
	};

	const phoneIssueToast = {
		level: 'warn',
		theme: 'inverted',
		icon: IconFuelPump,
		text: replaceOisyPlaceholders(en.core.warning.oisy_allowance_used_up_short),
		overflow: 'visible',
		link: { href: OISY_USAGE_CREDITS_DOCS_URL, label: en.core.text.learn_more }
	};

	const exceededToast = {
		level: 'warn',
		text: replaceOisyPlaceholders(en.core.warning.oisy_allowance_exceeded)
	};

	let toastsShowSpy: MockInstance;
	let hideSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();

		allowanceIssueStore.clear();
		allowanceToastStore.set(undefined);
		toasts.toastsStore.reset();

		toastsShowSpy = vi.spyOn(toasts, 'toastsShow');
		hideSpy = vi.spyOn(toasts.toastsStore, 'hide');

		// The flag follows the network the tests are built for, so the tests set it.
		vi.spyOn(ownCyclesEnv, 'OWN_CYCLES_ENABLED', 'get').mockReturnValue(false);

		// Wider than a phone.
		screensStore.set('lg');
	});

	it('should show no toast until a failed charged call asks for one', async () => {
		render(AllowanceToasts);

		await tick();

		expect(toastsShowSpy).not.toHaveBeenCalled();
	});

	it('should show the allowance-issue toast', async () => {
		render(AllowanceToasts);

		allowanceIssueStore.setRefused();
		allowanceToastStore.set({ toast: 'issue' });
		await tick();

		expect(toastsShowSpy).toHaveBeenCalledExactlyOnceWith(issueToast);
	});

	it('should say in the allowance-issue toast, under the same title, that own credits pay now', async () => {
		render(AllowanceToasts);

		allowanceIssueStore.setRefused();
		allowanceToastStore.set({ toast: 'issue', ownCycles: true });
		await tick();

		expect(toastsShowSpy).toHaveBeenCalledExactlyOnceWith({
			...issueToast,
			text: replaceOisyPlaceholders(en.core.warning.oisy_allowance_used_up_own_cycles)
		});
	});

	it('should give the open allowance-issue toast the own-credits text where it is', async () => {
		render(AllowanceToasts);

		allowanceIssueStore.setRefused();
		allowanceToastStore.set({ toast: 'issue' });
		await tick();

		const toastId = toastsShowSpy.mock.results[0].value;

		allowanceToastStore.set({ toast: 'issue', ownCycles: true });
		await tick();

		expect(toastsShowSpy).toHaveBeenCalledOnce();
		expect(get(toasts.toastsStore)).toEqual([
			expect.objectContaining({
				id: toastId,
				text: replaceOisyPlaceholders(en.core.warning.oisy_allowance_used_up_own_cycles)
			})
		]);
	});

	it('should keep the open allowance-issue toast where it is', async () => {
		render(AllowanceToasts);

		allowanceIssueStore.setRefused();
		allowanceToastStore.set({ toast: 'issue' });
		await tick();

		allowanceToastStore.set({ toast: 'issue' });
		await tick();

		expect(toastsShowSpy).toHaveBeenCalledOnce();
		expect(hideSpy).not.toHaveBeenCalled();
	});

	it('should keep the open allowance-issue toast ahead of error toasts queued after it', async () => {
		render(AllowanceToasts);

		allowanceIssueStore.setRefused();
		allowanceToastStore.set({ toast: 'issue' });
		await tick();

		const toastId = toastsShowSpy.mock.results[0].value;

		[1, 2, 3].forEach((n) => toasts.toastsStore.show({ level: 'error', text: `Error ${n}` }));

		allowanceToastStore.set({ toast: 'issue' });
		await tick();

		expect(get(toasts.toastsStore)[0].id).toBe(toastId);
	});

	it('should show the allowance-issue toast again once the user closed it', async () => {
		render(AllowanceToasts);

		allowanceIssueStore.setRefused();
		allowanceToastStore.set({ toast: 'issue' });
		await tick();

		toasts.toastsStore.hide(toastsShowSpy.mock.results[0].value);

		allowanceToastStore.set({ toast: 'issue' });
		await tick();

		expect(toastsShowSpy).toHaveBeenNthCalledWith(2, issueToast);
	});

	it('should hide the allowance-issue toast once the allowance issue clears', async () => {
		render(AllowanceToasts);

		allowanceIssueStore.setRefused();
		allowanceToastStore.set({ toast: 'issue' });
		await tick();

		const toastId = toastsShowSpy.mock.results[0].value;

		allowanceIssueStore.clear();
		await tick();

		expect(hideSpy).toHaveBeenCalledExactlyOnceWith(toastId);
	});

	it('should keep the open warning that a call costs more than the allowance where it is', async () => {
		render(AllowanceToasts);

		allowanceToastStore.set({ toast: 'exceeded' });
		await tick();

		allowanceToastStore.set({ toast: 'exceeded' });
		await tick();

		expect(toastsShowSpy).toHaveBeenCalledExactlyOnceWith(exceededToast);
		expect(hideSpy).not.toHaveBeenCalled();
	});

	it('should show the warning that a call costs more than the allowance again once the user closed it', async () => {
		render(AllowanceToasts);

		allowanceToastStore.set({ toast: 'exceeded' });
		await tick();

		toasts.toastsStore.hide(toastsShowSpy.mock.results[0].value);

		allowanceToastStore.set({ toast: 'exceeded' });
		await tick();

		expect(toastsShowSpy).toHaveBeenNthCalledWith(2, exceededToast);
	});

	it('should keep the warning when the allowance issue clears', async () => {
		render(AllowanceToasts);

		allowanceIssueStore.setRefused();
		allowanceToastStore.set({ toast: 'exceeded' });
		await tick();

		allowanceIssueStore.clear();
		await tick();

		expect(hideSpy).not.toHaveBeenCalled();
	});

	it('should show the title and the full text from 768 px on', async () => {
		// From 768 to 895 px.
		screensStore.set('1.5md');

		render(AllowanceToasts);

		allowanceIssueStore.setRefused();
		allowanceToastStore.set({ toast: 'issue' });
		await tick();

		expect(toastsShowSpy).toHaveBeenCalledExactlyOnceWith(issueToast);
	});

	describe('on phones', () => {
		beforeEach(() => {
			// From 640 to 767 px, the widest phone screen.
			screensStore.set('md');
		});

		it('should show the allowance-issue toast without its title, with a short text', async () => {
			render(AllowanceToasts);

			allowanceIssueStore.setRefused();
			allowanceToastStore.set({ toast: 'issue' });
			await tick();

			expect(toastsShowSpy).toHaveBeenCalledExactlyOnceWith(phoneIssueToast);
		});
	});

	describe('while paying with own cycles is on', () => {
		// The non-breaking space keeps the link on the line of the word before it.
		const toolsLink =
			'Manage your spending limit in&nbsp;<a href="/tools/#usage-credits">Tools</a>.';
		const urgentToolsLink =
			'For urgent transactions, you can cover signing with your own ICP Cycles in&nbsp;<a href="/tools/#usage-credits">Tools</a>.';

		beforeEach(() => {
			vi.spyOn(ownCyclesEnv, 'OWN_CYCLES_ENABLED', 'get').mockReturnValue(true);
		});

		it('should end the allowance-issue toast by offering own cycles, with a link to the Usage credits card', async () => {
			render(AllowanceToasts);

			allowanceIssueStore.setRefused();
			allowanceToastStore.set({ toast: 'issue' });
			await tick();

			expect(toastsShowSpy).toHaveBeenCalledExactlyOnceWith({
				...issueToast,
				text: `${issueToast.text} ${urgentToolsLink}`,
				renderAsHtml: true
			});
		});

		it('should link to the spending limit on the card when own credits pay', async () => {
			render(AllowanceToasts);

			allowanceIssueStore.setRefused();
			allowanceToastStore.set({ toast: 'issue', ownCycles: true });
			await tick();

			expect(toastsShowSpy).toHaveBeenCalledExactlyOnceWith({
				...issueToast,
				text: `${replaceOisyPlaceholders(en.core.warning.oisy_allowance_used_up_own_cycles)} ${toolsLink}`,
				renderAsHtml: true
			});
		});

		it('should not link from the warning that a call costs more than the allowance', async () => {
			render(AllowanceToasts);

			allowanceToastStore.set({ toast: 'exceeded' });
			await tick();

			expect(toastsShowSpy).toHaveBeenCalledExactlyOnceWith(exceededToast);
		});

		describe('on phones', () => {
			beforeEach(() => {
				screensStore.set('md');
			});

			it('should end the short text by offering own cycles, with a link to the Usage credits card', async () => {
				render(AllowanceToasts);

				allowanceIssueStore.setRefused();
				allowanceToastStore.set({ toast: 'issue' });
				await tick();

				expect(toastsShowSpy).toHaveBeenCalledExactlyOnceWith({
					...phoneIssueToast,
					text: `${phoneIssueToast.text} ${urgentToolsLink}`,
					renderAsHtml: true
				});
			});

			it('should link to the card from the short text when own credits pay', async () => {
				render(AllowanceToasts);

				allowanceIssueStore.setRefused();
				allowanceToastStore.set({ toast: 'issue', ownCycles: true });
				await tick();

				expect(toastsShowSpy).toHaveBeenCalledExactlyOnceWith({
					...phoneIssueToast,
					text: 'OISY temporarily can\'t cover signing, so <a href="/tools/#usage-credits">your own ICP Cycles</a> cover it for now.',
					renderAsHtml: true
				});
			});
		});
	});
});
