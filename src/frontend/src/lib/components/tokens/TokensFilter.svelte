<script lang="ts">
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { Backdrop } from '@dfinity/gix-components';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';

	let visible = false;
	let button: HTMLButtonElement | undefined;
</script>

<div class="relative flex flex-row">
	<div
		class="group -mt-[14px] flex overflow-hidden transition-all duration-300"
		class:w-[250px]={visible}
		class:w-[0px]={!visible}
		class:opacity-100={visible}
		class:opacity-0={!visible}
	>
		<InputText />
	</div>
	<ButtonIcon
		bind:button
		on:click={() => (visible = true)}
		disabled={$erc20UserTokensNotInitialized}
		link={false}
		colorStyle="muted"
		styleClass={`absolute right-[5px] ${visible ? 'active' : ''}`}
	>
		<IconSearch slot="icon" />
	</ButtonIcon>
</div>

{#if visible}
	<Backdrop on:nnsClose={() => (visible = false)} invisible />
{/if}
