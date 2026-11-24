<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import IconFuelPump from '$lib/components/icons/IconFuelPump.svelte';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
	import { allowanceIssueStore } from '$lib/stores/allowance-issue.store';
	import { allowanceToastStore } from '$lib/stores/allowance-toast.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsShow, toastsStore } from '$lib/stores/toasts.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	let issueToastId: symbol | undefined;
	let exceededToastId: symbol | undefined;

	// A toast still open stays where it is: shown again, it would move behind the newer toasts, out of
	// the few on screen. Only one the user closed shows again.
	const isOpen = (id: symbol | undefined): id is symbol =>
		nonNullish(id) && get(toastsStore).some(({ id: openId }) => openId === id);

	const hide = (id: symbol | undefined) => {
		if (nonNullish(id)) {
			toastsStore.hide(id);
		}
	};

	// It looks unlike any other toast, so it stands out from the error the flow shows next to it.
	// Its text says when the user's own credits paid instead; an open one gets the new text in place.
	const showIssueToast = (ownCycles: boolean) => {
		const text = replaceOisyPlaceholders(
			ownCycles
				? $i18n.core.warning.oisy_allowance_used_up_own_cycles
				: $i18n.core.warning.oisy_allowance_used_up
		);

		if (isOpen(issueToastId)) {
			toastsStore.update({ id: issueToastId, content: { text } });
			return;
		}

		issueToastId = toastsShow({
			level: 'warn',
			theme: 'inverted',
			icon: IconFuelPump,
			title: replaceOisyPlaceholders($i18n.core.warning.oisy_allowance_used_up_title),
			text,
			link: { href: OISY_DOCS_URL, label: $i18n.core.text.learn_more }
		});
	};

	const showExceededToast = () => {
		if (isOpen(exceededToastId)) {
			return;
		}

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
				showIssueToast(request.ownCycles === true);
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
