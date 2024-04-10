<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import IconMore from '$lib/components/icons/IconMore.svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { token, tokenCategory } from '$lib/derived/token.derived';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const hideToken = () => {
		const fn = $networkICP ? () => undefined : modalStore.openHideToken;
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
		$token: $token.name
	});
</script>

<button
	class="icon text-white"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label={$i18n.tokens.alt.context_menu}
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
