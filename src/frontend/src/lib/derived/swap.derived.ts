import { derived } from 'svelte/store';
import { pageToken } from '$lib/derived/page-token.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { isNullish, nonNullish } from '@dfinity/utils';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { BigNumber } from '@ethersproject/bignumber';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { allKongSwapCompatibleIcrcTokens } from '$lib/derived/all-tokens.derived';

const selectedSwappableToken = derived(
	[pageToken, allKongSwapCompatibleIcrcTokens],
	([$pageToken, $allKongSwapCompatibleIcrcTokens]) => {
		if (nonNullish($pageToken) && isIcToken($pageToken)) {
			let selectedToken = $pageToken;

			let isSwapAvailable: boolean;
			isSwapAvailable = [ICP_TOKEN, ...$allKongSwapCompatibleIcrcTokens].some(
				(t) => t.id === selectedToken.id
			);

			if (isSwapAvailable) {
				return selectedToken;
			}
		}

		return undefined;
	});

export const sourceToken = derived(
	[balancesStore, selectedSwappableToken],
	([$balancesStore, $selectedSwappableToken]) => {
		let selectedToken = $selectedSwappableToken;
		if (isNullish(selectedToken)) {
			return undefined;
		}

		let balance: BigNumber | undefined;
		balance = $balancesStore?.[selectedToken.id]?.data;

		if (nonNullish(balance) && balance.gt(BigNumber.from(0))) {
			return selectedToken;
		}

		return undefined;
	});

export const destinationToken = derived(
	[balancesStore, selectedSwappableToken],
	([$balancesStore, $selectedSwappableToken]) => {
		let selectedToken = $selectedSwappableToken;
		if (isNullish(selectedToken)) {
			return undefined;
		}

		let balance: BigNumber | undefined;
		balance = $balancesStore?.[selectedToken.id]?.data;

		if (nonNullish(balance) && balance.lte(BigNumber.from(0))) {
			return selectedToken;
		}

		return undefined;
	});