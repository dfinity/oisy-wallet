<script lang="ts">
	import { Backdrop } from '@dfinity/gix-components';
	import { onMount, type Snippet } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { afterNavigate } from '$app/navigation';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants.js';
	import { i18n } from '$lib/stores/i18n.store';

	let {
		inputValue = $bindable(''),
		inputPlaceholder,
		ariaLabel,
		testIdPrefix = 'sliding-input',
		disabled = false,
		icon,
		overflowableContent
	}: {
		inputValue: string;
		inputPlaceholder: string;
		ariaLabel: string;
		testIdPrefix?: string;
		disabled?: boolean;
		icon: Snippet;
		overflowableContent?: Snippet;
	} = $props();

	let visible = $state(false);

	let button: HTMLButtonElement | undefined = $state();
	let inputElement: HTMLInputElement | undefined = $state();

	const handleToggle = () => {
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
			handleToggle();
		}
	});

	afterNavigate(() => {
		// By setting a timeout of 1ms we make sure it runs after any parent components afterNavigate that uses this component.
		// This works because normal function calls take precedent over timeout functions
		// Can be useful to trigger the condition "handleClose if empty inputValue" by setting the bound input value to empty string
		// instead of dispatching an event from the parent component using this component
		setTimeout(() => {
			if (inputValue === '') {
				visible = false;
			}
		}, 1);
	});
</script>

<div class="relative flex w-full">
	{#if visible && inputValue === ''}
		<div class="z-2 fixed bottom-0 left-0 right-0 top-0">
			<Backdrop invisible on:nnsClose={handleClose} />
		</div>
	{/if}

	{#if overflowableContent}
		<div class="flex pr-12">
			{@render overflowableContent()}
		</div>
	{/if}
	<div class="z-2 absolute right-0 w-full">
		{#if visible}
			<div
				in:slide={{ ...SLIDE_PARAMS, axis: 'x' }}
				out:fade
				class="input-field condensed absolute right-0 -mt-[11px] mr-px flex overflow-hidden"
				class:w-full={overflowableContent}
				class:md:w-[250px]={overflowableContent}
				class:w-[250px]={!overflowableContent}
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
			on:click={handleToggle}
			{disabled}
			link={false}
			colorStyle="muted"
			styleClass={`absolute right-[5px] ${visible ? 'active' : ''}`}
			{ariaLabel}
			testId={`${testIdPrefix}-open-btn`}
		>
			<span slot="icon">
				{#if icon}
					{@render icon()}
				{/if}
			</span>
		</ButtonIcon>
	</div>
</div>

<style lang="scss">
	.input-field.condensed input {
		padding-block: var(--padding-1_5x) !important;
	}
</style>
