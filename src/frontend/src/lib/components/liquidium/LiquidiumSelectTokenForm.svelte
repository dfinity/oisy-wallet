<script lang="ts">
	import type { Snippet } from 'svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		onSelectToken: () => void;
		onClose: () => void;
		topBanner?: Snippet;
		children?: Snippet;
	}

	let { onSelectToken, onClose, children, topBanner }: Props = $props();

	// No token is chosen yet, so the amount is inert until one is picked; TokenInput
	// still requires a bindable amount plus its info/balance snippets.
	let amount = $state<OptionAmount>();
</script>

<ContentWithToolbar>
	{@render topBanner?.()}

	<div class="mb-8">
		<TokenInput isSelectable onClick={onSelectToken} showTokenNetwork token={undefined} bind:amount>
			{#snippet title()}{$i18n.core.text.amount}{/snippet}
			{#snippet amountInfo()}{/snippet}
			{#snippet balance()}{/snippet}
		</TokenInput>
	</div>

	{@render children?.()}

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={onClose} />
			<Button disabled onclick={onSelectToken}>{$i18n.send.text.review}</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
