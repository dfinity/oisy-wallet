<!--
	Stubs the store-heavy `SendTokensList` when unit-testing `SendModal`'s amount handling.
	Exposes the token selections the modal reacts to:
	- two distinct assets,
	- a re-created instance of the same logical token, which is what a custom token reload
	  produces: a fresh object that keeps the `TokenId` symbol the store already held for that
	  identifier,
	- two distinct assets that share a symbol, hence share a `TokenId` description, because
	  `mapIcrcToken` / `mapErc20Token` mint the `TokenId` from the symbol.
-->
<script lang="ts">
	import type { IcToken } from '$icp/types/ic-token';
	import type { Token } from '$lib/types/token';
	import { parseTokenId } from '$lib/validation/token.validation';
	import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';

	interface Props {
		onSendToken: (token: Token) => void;
	}

	let { onSendToken }: Props = $props();

	const tokenA: IcToken = mockValidIcrcToken;

	const tokenB: IcToken = {
		...mockValidIcrcToken,
		id: parseTokenId('STB'),
		symbol: 'STB',
		decimals: 6,
		ledgerCanisterId: 'ss2fx-dyaaa-aaaar-qacoq-cai'
	};

	// `certified-icrc.store` / `custom-tokens.store` reuse the `TokenId` already held for the same
	// identifier, so a reloaded token is a new object carrying the very same symbol.
	const recreatedTokenA: IcToken = {
		...mockValidIcrcToken,
		name: `${mockValidIcrcToken.name} (reloaded)`,
		id: mockValidIcrcToken.id
	};

	// Same symbol, same network, different ledgers: the two `TokenId` symbols carry the very same
	// description, so a description-based key would conflate them.
	const sameSymbolTokenA: IcToken = {
		...mockValidIcrcToken,
		id: parseTokenId('SAME'),
		symbol: 'SAME',
		ledgerCanisterId: 'xevnm-gaaaa-aaaar-qafnq-cai'
	};

	const sameSymbolTokenB: IcToken = {
		...mockValidIcrcToken,
		id: parseTokenId('SAME'),
		symbol: 'SAME',
		decimals: 6,
		ledgerCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai'
	};
</script>

<button data-tid="stub-select-token-a" onclick={() => onSendToken(tokenA)}>A</button>
<button data-tid="stub-select-token-b" onclick={() => onSendToken(tokenB)}>B</button>
<button data-tid="stub-select-token-a-recreated" onclick={() => onSendToken(recreatedTokenA)}
	>A'</button
>
<button data-tid="stub-select-token-same-symbol-a" onclick={() => onSendToken(sameSymbolTokenA)}
	>S1</button
>
<button data-tid="stub-select-token-same-symbol-b" onclick={() => onSendToken(sameSymbolTokenB)}
	>S2</button
>
