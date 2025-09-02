<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { showSpam } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { showSpamStore } from '$lib/stores/settings.store';

	let checked = $derived($showSpam);

	const toggleShow = () => showSpamStore.set({ key: 'show-spam', value: { enabled: !checked } });
</script>

<Toggle ariaLabel={$i18n.nfts.text.show_spam} bind:checked on:nnsToggle={toggleShow} />
