<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { TOKEN_MODAL_DELETE_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionToken } from '$lib/types/token';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token: OptionToken;
		loading?: boolean;
		onCancel: () => void;
		onConfirm: () => void;
	}

	let { token, loading = false, onCancel, onConfirm }: Props = $props();
</script>

<ContentWithToolbar>
	{#if nonNullish(token)}
		<div class="my-5 px-5 text-center sm:px-0">
			<Html
				text={replacePlaceholders(
					replaceOisyPlaceholders($i18n.tokens.details.confirm_deletion_description),
					{
						$token: getTokenDisplaySymbol(token)
					}
				)}
			/>
		</div>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel disabled={loading} onclick={onCancel} />

			<Button
				colorStyle="error"
				disabled={loading}
				onclick={onConfirm}
				testId={TOKEN_MODAL_DELETE_BUTTON}
			>
				{$i18n.core.text.delete}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
