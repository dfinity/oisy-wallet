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
	import { screensStore } from '$lib/stores/screens.store';
	import { toastsShow, toastsStore } from '$lib/stores/toasts.store';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { AVAILABLE_SCREENS, filterScreens, MIN_SCREEN } from '$lib/utils/screens.utils';

	// Widths below 768 px, where the app has its phone layout: the screen named `md` ends at 767 px.
	const PHONE_SCREENS = filterScreens({
		availableScreens: AVAILABLE_SCREENS,
		up: MIN_SCREEN,
		down: 'md'
	});

	const TOOLS_URL = `${AppPath.Tools}#${TOOLS_USAGE_CREDITS_ANCHOR}`;

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
	const withToolsLink = (text: string): string =>
		OWN_CYCLES_ENABLED
			? `${text} ${replacePlaceholders($i18n.core.warning.oisy_allowance_tools_link, { $url: TOOLS_URL })}`
			: text;

	// On phones, the own-credits text links to the card from its own words, with no extra sentence.
	const issueText = ({ ownCycles, phone }: { ownCycles: boolean; phone: boolean }): string => {
		const {
			oisy_allowance_used_up: usedUp,
			oisy_allowance_used_up_short: usedUpShort,
			oisy_allowance_used_up_own_cycles: usedUpOwnCycles,
			oisy_allowance_used_up_own_cycles_short: usedUpOwnCyclesShort
		} = $i18n.core.warning;

		if (ownCycles) {
			return phone
				? replacePlaceholders(usedUpOwnCyclesShort, { $url: TOOLS_URL })
				: withToolsLink(replaceOisyPlaceholders(usedUpOwnCycles));
		}

		return withToolsLink(replaceOisyPlaceholders(phone ? usedUpShort : usedUp));
	};

	// It looks unlike any other toast, so it stands out from the error the flow shows next to it.
	// Its text says when the user's own credits paid instead; an open one gets the new text in place.
	// It shows its whole text, and on phones it has no title and a short text, so it stays a few lines
	// tall.
	const showIssueToast = (ownCycles: boolean) => {
		const phone = PHONE_SCREENS.includes($screensStore);
		const text = issueText({ ownCycles, phone });

		if (isOpen(issueToastId)) {
			toastsStore.update({ id: issueToastId, content: { text } });
			return;
		}

		issueToastId = toastsShow({
			level: 'warn',
			theme: 'inverted',
			icon: IconFuelPump,
			...(!phone && {
				title: replaceOisyPlaceholders($i18n.core.warning.oisy_allowance_used_up_title)
			}),
			text,
			...(OWN_CYCLES_ENABLED && { renderAsHtml: true }),
			overflow: 'visible',
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
