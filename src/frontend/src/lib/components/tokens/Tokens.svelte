<script lang="ts">
	import { fade } from 'svelte/transition';
	import ManageTokensButton from '$lib/components/tokens/ManageTokensButton.svelte';
	import TokensList from '$lib/components/tokens/TokensList.svelte';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div>
	<Header>
		<h2 class="text-base">{$i18n.tokens.text.title}</h2>

		<TokensMenu slot="end" />
	</Header>

	<TokensList />

	<div in:fade class="mb-4 mt-12 flex w-full justify-center sm:w-auto">
		<ManageTokensButton />
	</div>
</div>
