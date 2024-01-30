import type { BlockIndex } from '$declarations/icp_ledger/icp_ledger.did';
import { retrieveBtc } from '$icp/api/ckbtc-minter.api';
import { withdrawEth } from '$icp/api/cketh-minter.api';
import { approve } from '$icp/api/icrc-ledger.api';
import type { IcCanisters, IcCkCanisters, IcToken } from '$icp/types/ic';
import type { IcTransferParams } from '$icp/types/ic-send';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { queryAndUpdate, type QueryAndUpdateRequestParams } from '$lib/actors/query.ic';
import { NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import { SendIcStep } from '$lib/enums/steps';
import { busy } from '$lib/stores/busy.store';
import type { CertifiedSetterStoreStore } from '$lib/stores/certified-setter.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { CertifiedData } from '$lib/types/store';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const convertCkBTCToBtc = async ({
	token: { ledgerCanisterId, minterCanisterId },
	progress,
	amount: amountBigNumber,
	identity,
	to
}: IcTransferParams & {
	token: IcToken & Partial<IcCkCanisters>;
}): Promise<void> => {
	assertNonNullish(minterCanisterId, 'A configured minter is required to convert ckBTC to BTC.');

	const amount = amountBigNumber.toBigInt();

	await approveTransfer({
		canisters: { ledgerCanisterId, minterCanisterId },
		identity,
		progress,
		amount,
		to
	});

	progress(SendIcStep.SEND);

	await retrieveBtc({
		identity,
		minterCanisterId,
		address: to,
		amount
	});
};

export const convertCkETHToEth = async ({
	token: { ledgerCanisterId, minterCanisterId },
	progress,
	amount: amountBigNumber,
	identity,
	to
}: IcTransferParams & {
	token: IcToken & Partial<IcCkCanisters>;
}): Promise<void> => {
	assertNonNullish(minterCanisterId, 'A configured minter is required to convert ckETH to ETH.');

	const amount = amountBigNumber.toBigInt();

	await approveTransfer({
		canisters: { ledgerCanisterId, minterCanisterId },
		identity,
		progress,
		amount,
		to
	});

	progress(SendIcStep.SEND);

	await withdrawEth({
		identity,
		minterCanisterId,
		address: to,
		amount
	});
};

const approveTransfer = async ({
	canisters: { ledgerCanisterId, minterCanisterId },
	progress,
	amount,
	identity
}: Omit<IcTransferParams, 'amount'> & { amount: bigint } & {
	canisters: Pick<IcCanisters, 'ledgerCanisterId'> & IcCkCanisters;
}): Promise<BlockIndex> => {
	progress(SendIcStep.APPROVE);

	return approve({
		identity,
		ledgerCanisterId,
		amount,
		expiresAt: nowInBigIntNanoSeconds() + 5n * NANO_SECONDS_IN_MINUTE,
		spender: {
			owner: Principal.from(minterCanisterId)
		}
	});
};

export const loadCkData = async <T>({
	id: tokenId,
	minterCanisterId,
	store,
	request,
	identity
}: IcToken &
	Partial<IcCkCanisters> & {
		store: CertifiedSetterStoreStore<CertifiedData<T>>;
		request: (
			options: QueryAndUpdateRequestParams & Pick<IcCkCanisters, 'minterCanisterId'>
		) => Promise<T>;
		identity: OptionIdentity;
	}) => {
	assertNonNullish(minterCanisterId, 'A configured minter is required to fetch the ckBTC info.');

	const minterStore = get(store);

	// We try to load only once per session the information for performance reason
	if (minterStore?.[tokenId] !== undefined) {
		return;
	}

	busy.start({ msg: 'Hold tight, we are loading some information...' });

	await queryAndUpdate<T>({
		request: ({ identity, certified }) =>
			request({
				minterCanisterId,
				identity,
				certified
			}),
		onLoad: ({ response: data, certified }) => store.set({ tokenId, data: { data, certified } }),
		onCertifiedError: ({ error: err }) => {
			store.reset(tokenId);

			toastsError({
				msg: { text: 'Error while loading the ckBtc minter information.' },
				err
			});
		},
		identity
	});

	busy.stop();
};
