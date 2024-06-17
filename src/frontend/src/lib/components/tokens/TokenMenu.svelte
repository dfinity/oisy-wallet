<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import IconMore from '$lib/components/icons/IconMore.svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { token, tokenCategory } from '$lib/derived/token.derived';
	import { erc20TokensNotInitialized } from '$eth/derived/erc20.derived';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const hideToken = () => {
		const fn = $networkICP ? modalStore.openIcHideToken : modalStore.openHideToken;
		fn();

		visible = false;
	};

	const openToken = () => {
		const fn = $networkICP ? modalStore.openIcToken : modalStore.openToken;
		fn();

		visible = false;
	};

	let hideTokenLabel: string;
	$: hideTokenLabel = replacePlaceholders($i18n.tokens.hide.token, {
		$token: $token?.name ?? ''
	});
</script>

<button
	class="icon text-white bg-white/[.15] border border-white/[.05] rounded-md"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label={$i18n.tokens.alt.context_menu}
	disabled={$erc20TokensNotInitialized}
	class:opacity-10={$erc20TokensNotInitialized}
>
	<IconMore />
</button>

<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
	<div class="flex flex-col gap-3">
		<slot />

		{#if $tokenCategory === 'custom'}
			<button
				class="flex gap-2 items-center no-underline hover:text-blue active:text-blue"
				aria-label={hideTokenLabel}
				on:click={hideToken}
			>
				{hideTokenLabel}
			</button>
		{/if}

		<button
			class="flex gap-2 items-center no-underline hover:text-blue active:text-blue"
			aria-label={$i18n.tokens.details.title}
			on:click={openToken}
		>
			{$i18n.tokens.details.title}
		</button>
	</div>
</Popover>
