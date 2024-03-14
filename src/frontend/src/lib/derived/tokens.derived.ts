import { ICP_TOKEN } from '$env/tokens.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { ethereumTokens } from '$eth/derived/tokens.derived';
import { icrcTokens } from '$icp/derived/icrc.derived';
import type { Token } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const sortedIcrcTokens: Readable<Token[]> = derived([icrcTokens], ([$icrcTokens]) =>
	$icrcTokens.sort(
		(
			{ name: nameA, position: positionA, exchangeCoinId: exchangeCoinIdA },
			{ name: nameB, position: positionB, exchangeCoinId: exchangeCoinIdB }
		) =>
			positionA === positionB
				? exchangeCoinIdA === exchangeCoinIdB
					? nameA.localeCompare(nameB)
					: exchangeCoinIdA.localeCompare(exchangeCoinIdB)
				: positionA - positionB
	)
);

export const tokens: Readable<Token[]> = derived(
	[erc20Tokens, sortedIcrcTokens, ethereumTokens],
	([$erc20Tokens, $icrcTokens, $ethereumTokens]) => [
		ICP_TOKEN,
		...$icrcTokens,
		...$ethereumTokens,
		...$erc20Tokens
	]
);
