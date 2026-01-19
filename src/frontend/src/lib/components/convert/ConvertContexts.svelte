<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import {
		CONVERT_CONTEXT_KEY,
		type ConvertContext,
		initConvertContext
	} from '$lib/stores/convert.store';
	import {
		initTokenActionValidationErrorsContext,
		TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
		type TokenActionValidationErrorsContext
	} from '$lib/stores/token-action-validation-errors.store';
	import type { Token } from '$lib/types/token';

	interface Props {
		sourceToken: Token;
		destinationToken: Token;
		children?: Snippet;
	}

	let { children, sourceToken, destinationToken }: Props = $props();

	setContext<ConvertContext>(
		CONVERT_CONTEXT_KEY,
		initConvertContext({
			// TODO: This statement is not reactive. Check if it is intentional or not.
			// eslint-disable-next-line svelte/no-unused-svelte-ignore
			// svelte-ignore state_referenced_locally
			sourceToken,
			// TODO: This statement is not reactive. Check if it is intentional or not.
			// eslint-disable-next-line svelte/no-unused-svelte-ignore
			// svelte-ignore state_referenced_locally
			destinationToken
		})
	);

	setContext<TokenActionValidationErrorsContext>(
		TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
		initTokenActionValidationErrorsContext()
	);
</script>

{@render children?.()}
