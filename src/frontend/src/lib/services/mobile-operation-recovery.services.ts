import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { isMobileSendToken } from '$icp/utils/ic-send.utils';
import { getPoolCanister } from '$lib/api/icp-swap-factory.api';
import { getUserUnusedBalance, withdraw } from '$lib/api/icp-swap-pool.api';
import { ZERO } from '$lib/constants/app.constants';
import { ICP_SWAP_POOL_FEE } from '$lib/constants/swap.constants';
import type { MobileIcpSwapOperation, MobileOperation } from '$lib/schema/mobile-operation.schema';
import { readEvmSourceTxOutcome } from '$lib/services/evm-source-tx.services';
import {
	assertMobileOperationSession,
	finishMobileOperation,
	loadMobileOperations,
	saveMobileOperation
} from '$lib/services/mobile-operation-journal.services';
import { i18n } from '$lib/stores/i18n.store';
import type { Token } from '$lib/types/token';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

// Never race a suspended request with recovery. Time alone does not prove failure:
// zero pool balances still leave an uncertain operation pending.
export const MOBILE_RECOVERY_DELAY_MS = 10 * 60 * 1000;
export const reconcileMobileEthSend = async ({
	identity,
	operation
}: {
	identity: Identity;
	operation: Extract<MobileOperation, { kind: 'evmSend' }>;
}): Promise<string> => {
	await assertMobileOperationSession(identity);
	const network = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS].find(
		({ chainId }) => String(chainId) === operation.chainId
	);
	if (!network) {
		return 'unknown';
	}
	const outcome = await readEvmSourceTxOutcome({
		rowId: operation.id,
		hash: operation.hash,
		txNonce: operation.nonce,
		network,
		userAddress: operation.from,
		confirmedNonceByChainId: new Map()
	});
	if (outcome === 'succeeded' || outcome === 'reverted' || outcome === 'replaced') {
		await finishMobileOperation({ identity, id: operation.id });
	}
	return outcome;
};

// This is an explicit withdrawal to the same principal, never a replayed swap or deposit.
export const recoverMobileIcpSwap = async ({
	identity,
	operation,
	tokens
}: {
	identity: Identity;
	operation: MobileIcpSwapOperation;
	tokens: Token[];
}): Promise<void> => {
	await assertMobileOperationSession(identity);
	const current = (await loadMobileOperations(identity)).find(({ id }) => id === operation.id);
	if (current?.kind !== 'icpSwap' || Date.now() - current.updatedAt < MOBILE_RECOVERY_DELAY_MS) {
		throw new Error(get(i18n).swap.text.mobile_pending);
	}
	const source = tokens.find(
		(token) => isMobileSendToken(token) && token.ledgerCanisterId === current.source
	);
	const destination = tokens.find(
		(token) => isMobileSendToken(token) && token.ledgerCanisterId === current.destination
	);
	if (!isMobileSendToken(source) || !isMobileSendToken(destination)) {
		throw new Error(get(i18n).swap.error.unexpected_missing_data);
	}
	const pool = await getPoolCanister({
		identity,
		certified: true,
		fee: ICP_SWAP_POOL_FEE,
		token0: { address: source.ledgerCanisterId, standard: source.standard.code },
		token1: { address: destination.ledgerCanisterId, standard: destination.standard.code },
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});
	if (!pool || pool.canisterId.toText() !== current.pool) {
		throw new Error(get(i18n).swap.error.pool_not_found);
	}
	const balances = await getUserUnusedBalance({
		identity,
		canisterId: current.pool,
		principal: identity.getPrincipal(),
		certified: true
	});
	const token0 = pool.token0.address === source.ledgerCanisterId ? source : destination;
	const token1 = token0 === source ? destination : source;
	const withdrawals = [
		{ token: token0, amount: balances.balance0 },
		{ token: token1, amount: balances.balance1 }
	].filter(({ token, amount }) => amount > token.fee && token.fee >= ZERO);
	if (withdrawals.length === 0) {
		throw new Error(get(i18n).swap.text.mobile_no_recovery_balance);
	}
	// CAS also prevents two recovery taps from withdrawing the same observed balance.
	const recovering: MobileIcpSwapOperation = {
		...current,
		stage: 'recovery',
		updatedAt: Date.now()
	};
	await saveMobileOperation({ identity, expected: current, operation: recovering });
	for (const { token, amount } of withdrawals) {
		await assertMobileOperationSession(identity);
		await withdraw({
			identity,
			canisterId: current.pool,
			token: token.ledgerCanisterId,
			amount,
			fee: token.fee
		});
	}
	await saveMobileOperation({
		identity,
		expected: recovering,
		operation: { ...recovering, stage: 'recovered', updatedAt: Date.now() }
	});
	// Keep the record: a previous deposit/withdraw may still have an unknown outcome.
	// Returned tokens appear in the normal shared wallet history after refresh.
};

// Approval-only records prove that no deposit was started. Removing this exact
// snapshot also prevents a suspended approval continuation from advancing later.
export const releaseMobileApproval = async ({
	identity,
	operation
}: {
	identity: Identity;
	operation: MobileIcpSwapOperation;
}): Promise<void> => {
	if (
		operation.stage === 'approval' &&
		Date.now() - operation.updatedAt >= MOBILE_RECOVERY_DELAY_MS
	) {
		await finishMobileOperation({ identity, id: operation.id, expected: operation });
	}
};
