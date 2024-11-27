<script lang="ts">
	import { fade } from 'svelte/transition';
	import NetworksSwitcher from '$lib/components/networks/NetworksSwitcher.svelte';
	import ManageTokensButton from '$lib/components/tokens/ManageTokensButton.svelte';
	import TokensList from '$lib/components/tokens/TokensList.svelte';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { testnetsEnabled } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div>
	<Header>
		{#if $testnetsEnabled}
			<NetworksSwitcher />
		{:else}
			<h2 class="text-base">{$i18n.tokens.text.title}</h2>
		{/if}

		<TokensMenu slot="end" />
	</Header>

	<TokensList />

	<div in:fade class="mb-4 mt-12 flex w-full justify-center sm:w-auto">
		<ManageTokensButton />
	</div>
</div>
