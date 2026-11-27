<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { OWN_CYCLES_ENABLED } from '$env/own-cycles.env';
	import IconFuelPump from '$lib/components/icons/IconFuelPump.svelte';
	import { OISY_USAGE_CREDITS_DOCS_URL } from '$lib/constants/oisy.constants';
	import { AppPath, TOOLS_USAGE_CREDITS_ANCHOR } from '$lib/constants/routes.constants';
	import { allowanceIssueStore } from '$lib/stores/allowance-issue.store';
	import { allowanceToastStore } from '$lib/stores/allowance-toast.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsShow, toastsStore } from '$lib/stores/toasts.store';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

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

	// While the user can pay with own cycles, the text ends with a link to the Tools page's Usage
	// credits card, in the text as HTML, as the Activity info box links to Settings.
	const issueText = (ownCycles: boolean): string => {
		const text = replaceOisyPlaceholders(
			ownCycles
				? $i18n.core.warning.oisy_allowance_used_up_own_cycles
				: $i18n.core.warning.oisy_allowance_used_up
		);

		if (!OWN_CYCLES_ENABLED) {
			return text;
		}

		return `${text} ${replacePlaceholders($i18n.core.warning.oisy_allowance_tools_link, {
			$url: `${AppPath.Tools}#${TOOLS_USAGE_CREDITS_ANCHOR}`
		})}`;
	};

	// It looks unlike any other toast, so it stands out from the error the flow shows next to it.
	// Its text says when the user's own credits paid instead; an open one gets the new text in place.
	const showIssueToast = (ownCycles: boolean) => {
		const text = issueText(ownCycles);

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
			...(OWN_CYCLES_ENABLED && { renderAsHtml: true }),
			link: { href: OISY_USAGE_CREDITS_DOCS_URL, label: $i18n.core.text.learn_more }
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
