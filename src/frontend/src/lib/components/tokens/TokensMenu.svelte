<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconMore from '$lib/components/icons/IconMore.svelte';
	import ManageTokensMenuButton from '$lib/components/manage/ManageTokensMenuButton.svelte';
	import TokensZeroBalance from '$lib/components/tokens/TokensZeroBalance.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	let visible = false;
	let button: HTMLButtonElement | undefined;
</script>

<button
	class="icon"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label={$i18n.navigation.alt.menu}
	disabled={$erc20UserTokensNotInitialized}
	class:opacity-10={$erc20UserTokensNotInitialized}
>
	<IconMore />
</button>

<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
	<div class="flex flex-col gap-3">
		<TokensZeroBalance />

		<div class="my">
			<Hr />
		</div>

		<ManageTokensMenuButton on:icCloseMenu={() => (visible = false)} />
	</div>
</Popover>
