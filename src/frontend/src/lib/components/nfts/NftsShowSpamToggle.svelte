<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { showSpam } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { showSpamStore } from '$lib/stores/settings.store';

	const checked = $derived($showSpam);

	const toggleShow = () => showSpamStore.set({ key: 'show-spam', value: { enabled: !checked } });
</script>

<svelte:window onoisyToggleShowSpam={toggleShow} />

<Toggle ariaLabel={$i18n.nfts.text.show_spam} {checked} on:nnsToggle={toggleShow} />
