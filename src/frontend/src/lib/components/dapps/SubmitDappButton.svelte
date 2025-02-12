<script lang="ts">
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<a
	class="as-button tertiary padding-sm my-10 text-sm mx-auto w-fit no-underline"
	href="https://github.com/dfinity/oisy-wallet#submit-your-dapp"
	rel="external noopener noreferrer"
	target="_blank"
	aria-label={$i18n.dapps.alt.submit_your_dapp}
>
	<IconPlus />
	<span>
		{$i18n.dapps.text.submit_your_dapp}
	</span>
</a>
