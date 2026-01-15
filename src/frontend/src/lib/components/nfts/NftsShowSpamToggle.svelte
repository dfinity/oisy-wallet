<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { showSpam } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';

	const checked = $derived($showSpam);
</script>

<Toggle ariaLabel={$i18n.nfts.text.show_spam} {checked} />
