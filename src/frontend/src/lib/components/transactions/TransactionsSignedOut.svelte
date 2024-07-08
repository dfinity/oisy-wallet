<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store.js';
	import Header from '$lib/components/ui/Header.svelte';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { token } from '$lib/stores/token.store';
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
</script>

<Header>{$i18n.transactions.text.title}</Header>

{#if nonNullish($token)}
	<p class="mt-4 text-dark opacity-50" in:fade>
		{replacePlaceholders($i18n.transactions.text.sign_in, {
			$token: $token.name,
			$symbol: $token.symbol
		})}
	</p>
{/if}
