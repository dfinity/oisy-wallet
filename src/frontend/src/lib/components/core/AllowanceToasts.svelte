<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import IconFuelPump from '$lib/components/icons/IconFuelPump.svelte';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
	import { allowanceIssueStore } from '$lib/stores/allowance-issue.store';
	import { allowanceToastStore } from '$lib/stores/allowance-toast.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsShow, toastsStore } from '$lib/stores/toasts.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	// Each toast replaces the one of its kind already shown, so the user never sees it twice.
	let issueToastId: symbol | undefined;
	let exceededToastId: symbol | undefined;

	const hide = (id: symbol | undefined) => {
		if (nonNullish(id)) {
			toastsStore.hide(id);
		}
	};

	// It looks unlike any other toast, so it stands out from the error the flow shows next to it.
	const showIssueToast = () => {
		hide(issueToastId);

		issueToastId = toastsShow({
			level: 'warn',
			theme: 'inverted',
			icon: IconFuelPump,
			title: replaceOisyPlaceholders($i18n.core.warning.oisy_allowance_used_up_title),
			text: replaceOisyPlaceholders($i18n.core.warning.oisy_allowance_used_up),
			link: { href: OISY_DOCS_URL, label: $i18n.core.text.learn_more }
		});
	};

	const showExceededToast = () => {
		hide(exceededToastId);

		exceededToastId = toastsShow({
			level: 'warn',
			text: replaceOisyPlaceholders($i18n.core.warning.oisy_allowance_exceeded)
		});
	};

	$effect(() => {
		const request = $allowanceToastStore;

		if (isNullish(request)) {
			return;
		}

		// Only a failed charged call shows a toast, not a change of language.
		untrack(() => {
			if (request.toast === 'issue') {
				showIssueToast();
				return;
			}

			showExceededToast();
		});
	});

	$effect(() => {
		if (nonNullish($allowanceIssueStore)) {
			return;
		}

		hide(issueToastId);
		issueToastId = undefined;
	});
</script>
