<script lang="ts">
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<a
	class="as-button tertiary padding-sm mx-auto my-10 w-fit text-sm no-underline"
	aria-label={$i18n.dapps.alt.submit_your_dapp}
	href="https://github.com/dfinity/oisy-wallet#submit-your-dapp"
	rel="external noopener noreferrer"
	target="_blank"
>
	<IconPlus />
	<span>
		{$i18n.dapps.text.submit_your_dapp}
	</span>
</a>
