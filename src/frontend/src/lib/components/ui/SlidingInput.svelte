<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants.js';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { Backdrop } from '@dfinity/gix-components';

	export let testIdPrefix: string;
	export let inputValue: string;
	export let inputPlaceholder: string | undefined;
	export let disabled = false;
	export let ariaLabel: string;

	let visible = false;

	let button: HTMLButtonElement | undefined;
	let inputElement: HTMLInputElement | undefined;

	const handleOpen = (e?: Event) => {
		e?.stopPropagation();
		if (visible) {
			handleClose();
		} else {
			inputElement?.focus();
			visible = true;
		}
	};

	const handleClose = () => {
		if (inputValue !== '') {
			return;
		}
		visible = false;
	};

	const handleClear = () => {
		inputValue = '';
		inputElement?.focus();
	};

	onMount(() => {
		if (inputValue !== '') {
			handleOpen();
		}
	});

	afterNavigate(() => {
		// By setting a timeout of 1ms we make sure it runs after any parent components afterNavigate that uses this component.
		// This works because normal function calls take precedent over timeout functions
		// Can be useful to trigger the condition "handleClose if empty inputValue" by setting the bound input value to empty string
		// instead of dispatching an event from the parent component using this component
		setTimeout(() => {
			if (inputValue === '') {
				handleClose();
			}
		}, 1);
	});
</script>

<div class="z-3 absolute right-0 w-full">
	{#if visible}
		<div
			in:slide={{ ...SLIDE_PARAMS, axis: 'x' }}
			out:fade={SLIDE_PARAMS}
			class="input-field condensed absolute right-0 -mt-[11px] mr-[1px] flex w-full overflow-hidden transition-all duration-300 md:w-[250px]"
		>
			<InputTextWithAction
				bind:inputElement
				name="slidingInput"
				placeholder={inputPlaceholder ?? ''}
				bind:value={inputValue}
				testId={`${testIdPrefix}-input`}
				autofocus
			/>
			{#if inputValue !== ''}
				<div
					class="transition-bg duration-250 top-3.25 absolute right-12 bg-primary"
					transition:fade
				>
					<ButtonIcon
						ariaLabel={$i18n.core.text.clear_filter}
						styleClass="text-tertiary"
						on:click={handleClear}
						testId={`${testIdPrefix}-clear-btn`}><IconClose slot="icon" size="18" /></ButtonIcon
					>
				</div>
			{/if}
		</div>
	{/if}
	<ButtonIcon
		bind:button
		on:click={handleOpen}
		{disabled}
		link={false}
		colorStyle="muted"
		styleClass={`absolute right-[5px] ${visible ? 'active' : ''}`}
		{ariaLabel}
		testId={`${testIdPrefix}-open-btn`}
	>
		<slot name="icon" slot="icon" />
	</ButtonIcon>
</div>

{#if visible && inputValue === ''}
	<div class="fixed bottom-0 left-0 right-0 top-0 z-0">
		<Backdrop invisible on:nnsClose={handleClose} />
	</div>
{/if}
