<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { afterNavigate } from '$app/navigation';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import Backdrop from '$lib/components/ui/Backdrop.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants.js';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		inputValue: string;
		inputPlaceholder: string;
		ariaLabel: string;
		testIdPrefix?: string;
		disabled?: boolean;
		icon: Snippet;
		overflowableContent?: Snippet;
	}

	let {
		inputValue = $bindable(''),
		inputPlaceholder,
		ariaLabel,
		testIdPrefix = 'sliding-input',
		disabled = false,
		icon: slidingIcon,
		overflowableContent
	}: Props = $props();

	let visible = $state(false);

	let overflowableContentWidth = $state(0);

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
		<div class="fixed top-0 right-0 bottom-0 left-0 z-2">
			<Backdrop invisible onClose={handleClose} />
		</div>
	{/if}

	{#if nonNullish(overflowableContent)}
		<!-- min-w-0 lets this flex item shrink below its content's natural width
		     (a flex item's automatic min-width is otherwise content-based) so an
		     overflowing child (e.g. a 4+ tab row) scrolls internally on narrow
		     viewports instead of pushing the page wider than the device — which
		     on Android Chrome forces a zoom-out that misplaces the fixed bottom
		     nav bar under the browser's own UI. -->
		<div
			class="no-scrollbar flex min-w-0 overflow-x-auto pr-12"
			bind:clientWidth={overflowableContentWidth}
		>
			{@render overflowableContent()}
		</div>
	{/if}
	<div class="absolute right-0 z-2 w-full">
		{#if visible}
			<div
				style:--overflowable-w={`${overflowableContentWidth}px`}
				class="input-field condensed absolute right-0 -mt-[11px] mr-px flex overflow-hidden"
				class:md:w-[270px]={nonNullish(overflowableContent)}
				class:overflowable-input={nonNullish(overflowableContent)}
				class:w-[270px]={isNullish(overflowableContent)}
				class:w-full={nonNullish(overflowableContent)}
				in:slide={{ ...SLIDE_PARAMS, axis: 'x' }}
				out:fade
			>
				<!-- We add "search" in the inputs name to prevent browsers form displaying autofill, see: -->
				<!-- https://stackoverflow.com/a/68260636/2244209 -->
				<!-- Additionally, we have to avoid placeholders with word "name" as that can bring autofill as well -->
				<InputTextWithAction
					name="search_slidingInput"
					autofocus
					placeholder={inputPlaceholder ?? ''}
					testId={`${testIdPrefix}-input`}
					bind:inputElement
					bind:value={inputValue}
				/>
				{#if inputValue !== ''}
					<div class="absolute top-[11px] right-12 bg-primary" transition:fade>
						<ButtonIcon
							ariaLabel={$i18n.core.text.clear_filter}
							colorStyle="muted"
							link={false}
							onclick={handleClear}
							testId={`${testIdPrefix}-clear-btn`}
						>
							{#snippet icon()}
								<IconClose size="18" />
							{/snippet}
						</ButtonIcon>
					</div>
				{/if}
			</div>
		{/if}
		<ButtonIcon
			{ariaLabel}
			colorStyle="muted"
			{disabled}
			expanded={visible}
			link={false}
			onclick={handleToggle}
			styleClass="absolute right-[5px]"
			testId={`${testIdPrefix}-open-btn`}
			bind:button
		>
			{#snippet icon()}
				<span>
					{@render slidingIcon()}
				</span>
			{/snippet}
		</ButtonIcon>
	</div>
</div>

<style lang="scss">
	@media (min-width: 768px) {
		.overflowable-input {
			max-width: calc(100% - var(--overflowable-w, 0px) + 2rem);
		}
	}
</style>
