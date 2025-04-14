<script lang="ts">
	import { Backdrop } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { afterNavigate } from '$app/navigation';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants.js';
	import { i18n } from '$lib/stores/i18n.store';

	export let testIdPrefix: string;
	export let inputValue: string;
	export let inputPlaceholder: string | undefined;
	export let disabled = false;
	export let ariaLabel: string;

	let hasOverflowableSlot: boolean;
	$: hasOverflowableSlot = nonNullish($$slots['overflowable-content']);

	let visible = false;

	let button: HTMLButtonElement | undefined;
	let inputElement: HTMLInputElement | undefined;

	const handleOpen = () => {
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

<div class="relative flex w-full">
	<div class="flex pr-12">
		<slot name="overflowable-content" />
	</div>
	<div class="z-3 absolute right-0 w-full">
		{#if visible}
			<div
				in:slide={{ ...SLIDE_PARAMS, axis: 'x' }}
				out:fade
				class="input-field condensed absolute right-0 -mt-[11px] mr-px flex overflow-hidden"
				class:w-full={hasOverflowableSlot}
				class:md:w-[250px]={hasOverflowableSlot}
				class:w-[250px]={!hasOverflowableSlot}
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
					<div class="absolute right-12 top-[11px] bg-primary" transition:fade>
						<ButtonIcon
							ariaLabel={$i18n.core.text.clear_filter}
							colorStyle="muted"
							on:click={handleClear}
							link={false}
							testId={`${testIdPrefix}-clear-btn`}
						>
							<IconClose slot="icon" size="18" />
						</ButtonIcon>
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
		<div class="z-2 fixed bottom-0 left-0 right-0 top-0">
			<Backdrop invisible on:nnsClose={handleClose} />
		</div>
	{/if}
</div>

<style lang="scss">
	.input-field.condensed input {
		padding-block: var(--padding-1_5x) !important;
	}
</style>
