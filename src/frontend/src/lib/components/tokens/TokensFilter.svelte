<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconClose from '$lib/components/icons/IconClose.svelte';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';

	let visible = false;
	let button: HTMLButtonElement | undefined;
	let inputElement: HTMLInputElement | undefined;

	export let filterValue = '';

	const handleOpen = (e: Event) => {
		e.stopPropagation();
		if (visible) {
			handleClose();
		} else {
			inputElement?.focus();
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

	const handleClear = () => {
		filterValue = '';
		inputElement?.focus();
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
			class="input-field condensed absolute right-0 -mt-[11px] mr-[1px] flex w-full overflow-hidden transition-all duration-300 md:w-[250px]"
			on:click|stopPropagation|preventDefault={() => {}}
		>
			<InputTextWithAction
				bind:inputElement
				name="tokenFilter"
				placeholder={$i18n.tokens.text.filter_placeholder}
				bind:value={filterValue}
				autofocus
			/>
			{#if filterValue !== ''}
				<div
					class="top-4.5 transition-bg duration-250 absolute right-12 bg-primary"
					transition:fade
				>
					<button
						aria-label={$i18n.core.text.clear_filter}
						class="p-1 text-tertiary"
						on:click={handleClear}><IconClose size="18" /></button
					>
				</div>
			{/if}
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
