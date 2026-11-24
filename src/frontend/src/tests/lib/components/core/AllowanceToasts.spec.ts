import AllowanceToasts from '$lib/components/core/AllowanceToasts.svelte';
import IconFuelPump from '$lib/components/icons/IconFuelPump.svelte';
import { allowanceIssueStore } from '$lib/stores/allowance-issue.store';
import { allowanceToastStore } from '$lib/stores/allowance-toast.store';
import * as toasts from '$lib/stores/toasts.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { MockInstance } from 'vitest';

describe('AllowanceToasts', () => {
	const issueToast = {
		level: 'warn',
		theme: 'inverted',
		icon: IconFuelPump,
		title: replaceOisyPlaceholders(en.core.warning.oisy_allowance_used_up_title),
		text: replaceOisyPlaceholders(en.core.warning.oisy_allowance_used_up)
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

		toastsShowSpy = vi.spyOn(toasts, 'toastsShow');
		hideSpy = vi.spyOn(toasts.toastsStore, 'hide');
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

	it('should show the allowance-issue toast again in place of the last one', async () => {
		render(AllowanceToasts);

		allowanceIssueStore.setRefused();
		allowanceToastStore.set({ toast: 'issue' });
		await tick();

		const firstToastId = toastsShowSpy.mock.results[0].value;

		allowanceToastStore.set({ toast: 'issue' });
		await tick();

		expect(toastsShowSpy).toHaveBeenCalledTimes(2);
		expect(hideSpy).toHaveBeenCalledExactlyOnceWith(firstToastId);
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

	it('should show the warning that a call costs more than the allowance, in place of the last one', async () => {
		render(AllowanceToasts);

		allowanceToastStore.set({ toast: 'exceeded' });
		await tick();

		const firstToastId = toastsShowSpy.mock.results[0].value;

		allowanceToastStore.set({ toast: 'exceeded' });
		await tick();

		expect(toastsShowSpy).toHaveBeenNthCalledWith(2, exceededToast);
		expect(hideSpy).toHaveBeenCalledExactlyOnceWith(firstToastId);
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
});
