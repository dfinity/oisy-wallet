<!--
	Stubs the store-heavy `SendTokensList` when unit-testing `SendModal`'s amount handling.
	Exposes the token selections the modal reacts to, including a re-created instance of the
	same logical token (fresh object and fresh `TokenId` symbol), which is what a custom token
	reload produces.
-->
<script lang="ts">
	import type { Token } from '$lib/types/token';
	import { parseTokenId } from '$lib/validation/token.validation';
	import { mockValidToken } from '$tests/mocks/tokens.mock';

	interface Props {
		onSendToken: (token: Token) => void;
	}

	let { onSendToken }: Props = $props();

	const tokenB: Token = {
		...mockValidToken,
		id: parseTokenId('StubTokenB'),
		symbol: 'STB',
		decimals: 6
	};

	const recreatedTokenA: Token = { ...mockValidToken, id: parseTokenId('TokenId') };
</script>

<button data-tid="stub-select-token-a" onclick={() => onSendToken(mockValidToken)}>A</button>
<button data-tid="stub-select-token-b" onclick={() => onSendToken(tokenB)}>B</button>
<button data-tid="stub-select-token-a-recreated" onclick={() => onSendToken(recreatedTokenA)}
	>A'</button
>
