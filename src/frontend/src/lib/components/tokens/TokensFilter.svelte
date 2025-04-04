<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	export let filterValue: string = '';

	const handleOpen = (e: Event) => {
		e.stopPropagation();
		if (visible) {
			handleClose();
		} else {
			visible = true;
			document.body.addEventListener('click', handleClose);
		}
	};

	const handleClose = () => {
		if (filterValue.length > 0) {
			return;
		}
		visible = false;
		document.body.removeEventListener('click', handleClose);
	};
</script>

<div class="absolute right-0 w-full">
	{#if visible}
		<div
			role="button"
			tabindex="-1"
			aria-label="todo"
			on:keydown={() => {}}
			in:slide={{ ...SLIDE_PARAMS, axis: 'x' }}
			out:fade={{ ...SLIDE_PARAMS }}
			class={`input-field condensed absolute right-0 -mt-[11px] mr-[1px] flex w-full overflow-hidden transition-all duration-300 md:w-[250px]`}
			on:click|stopPropagation|preventDefault={() => {}}
		>
			<InputTextWithAction name="" placeholder="" bind:value={filterValue} autofocus />
		</div>
	{/if}
	<ButtonIcon
		bind:button
		on:click={handleOpen}
		disabled={$erc20UserTokensNotInitialized}
		link={false}
		colorStyle="muted"
		styleClass={`absolute right-[5px] ${visible ? 'active' : ''}`}
		ariaLabel="todo"
	>
		<IconSearch slot="icon" />
	</ButtonIcon>
</div>
