<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import IconMore from '$lib/components/icons/IconMore.svelte';
	import TokensZeroBalance from '$lib/components/tokens/TokensZeroBalance.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { networkEthereum, networkICP } from '$lib/derived/network.derived';
	import { erc20TokensNotInitialized } from '$eth/derived/erc20.derived';
	import IcManageTokensMenuButton from '$icp/components/tokens/IcManageTokensMenuButton.svelte';
	import ManageTokensMenuButton from '$eth/components/tokens/ManageTokensMenuButton.svelte';

	let visible = false;
	let button: HTMLButtonElement | undefined;
</script>

<button
	class="icon bg-white border border-dust rounded-md"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label={$i18n.navigation.alt.menu}
	disabled={$erc20TokensNotInitialized}
	class:opacity-10={$erc20TokensNotInitialized}
>
	<IconMore />
</button>

<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
	<div class="flex flex-col gap-3">
		<TokensZeroBalance />

		{#if $networkICP || $networkEthereum}
			<div class="my">
				<Hr />
			</div>

			{#if $networkICP}
				<IcManageTokensMenuButton />
			{:else if $networkEthereum}
				<ManageTokensMenuButton />
			{/if}
		{/if}
	</div>
</Popover>
