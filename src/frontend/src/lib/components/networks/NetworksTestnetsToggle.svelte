<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { goto } from '$app/navigation';
	import { NETWORK_PARAM } from '$lib/constants/routes.constants';
	import { testnetsEnabled } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { testnetsStore } from '$lib/stores/settings.store';

	// TODO: create tests for this component once we have testId from GIX-CMP
	// PR: https://github.com/dfinity/gix-components/pull/531

	let checked: boolean;
	$: checked = $testnetsEnabled;

	const toggleTestnets = async () => {
		testnetsStore.set({ key: 'testnets', value: { enabled: !checked } });

		// Reset network param, since the network is selectable only when testnets are enabled
		if (checked) {
			const href = window.location.href;

			if (URL.canParse(href)) {
				const url = new URL(href);
				url.searchParams.delete(NETWORK_PARAM);
				await goto(url, { replaceState: true, noScroll: true });
			}
		}
	};
</script>

<Toggle ariaLabel={$i18n.settings.alt.testnets_toggle} bind:checked on:nnsToggle={toggleTestnets} />
