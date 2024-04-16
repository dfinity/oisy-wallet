<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import IconMore from '$lib/components/icons/IconMore.svelte';
	import TokensZeroBalance from '$lib/components/tokens/TokensZeroBalance.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { erc20TokensNotInitialized } from '$eth/derived/erc20.derived';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const importTokens = () => {
		const fn = $networkICP ? modalStore.openIcManageTokens : modalStore.openAddToken;
		fn();

		visible = false;
	};
</script>

<button
	class="icon"
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

		<div class="my">
			<Hr />
		</div>

		<button
			class="flex gap-2 items-center no-underline hover:text-blue active:text-blue"
			aria-label={$i18n.tokens.import.text.title}
			on:click={importTokens}
		>
			+ {$i18n.tokens.import.text.title}
		</button>
	</div>
</Popover>
