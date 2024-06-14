<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import IconMore from '$lib/components/icons/IconMore.svelte';
	import TokensZeroBalance from '$lib/components/tokens/TokensZeroBalance.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { erc20TokensNotInitialized } from '$eth/derived/erc20.derived';
	import { additionalMenuItem } from '$lib/derived/tokens-menu.derived';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const importTokens = () => {
		$additionalMenuItem?.openModal();

		visible = false;
	};
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

		{#if $additionalMenuItem}
			<div class="my">
				<Hr />
			</div>

			<button
				class="flex gap-2 items-center no-underline hover:text-blue active:text-blue"
				aria-label={$additionalMenuItem?.ariaLabel}
				on:click={importTokens}
			>
				{$additionalMenuItem?.label}
			</button>
		{/if}
	</div>
</Popover>
