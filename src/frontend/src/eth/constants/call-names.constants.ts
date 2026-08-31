import { ERC_SET_APPROVAL_FOR_ALL_HASH } from '$eth/constants/erc.constants';
import {
	ERC20_APPROVE_HASH,
	ERC20_DECREASE_ALLOWANCE_HASH,
	ERC20_INCREASE_ALLOWANCE_HASH,
	ERC20_TRANSFER_HASH
} from '$eth/constants/erc20.constants';
import {
	MULTICALL_DEADLINE_HASH,
	MULTICALL_HASH,
	MULTICALL_PREVIOUS_BLOCKHASH_HASH
} from '$eth/constants/multicall.constants';

// The name of a call, for the selectors whose arguments the review actually reads.
//
// The set is deliberately no larger than that. Naming a selector tells the user OISY knows what the
// call is, and it may only say so where the review went on to decode the arguments and state what
// they were: a name beside a call nobody read would claim a review that never happened, which is
// the whole failure this surface exists to avoid. A selector absent from here is shown as its raw
// four bytes, which is the honest answer.
//
// `eth-call-names` in the tests holds this to the classifier, so a name cannot be added here for a
// call the review does not read.
export const ETH_CALL_NAMES: Record<string, string> = {
	[ERC20_APPROVE_HASH]: 'approve',
	[ERC20_TRANSFER_HASH]: 'transfer',
	[ERC_SET_APPROVAL_FOR_ALL_HASH]: 'setApprovalForAll',
	[ERC20_INCREASE_ALLOWANCE_HASH]: 'increaseAllowance',
	[ERC20_DECREASE_ALLOWANCE_HASH]: 'decreaseAllowance',
	// The batch wrappers are read too: their `bytes[]` is opened and the calls inside it listed.
	[MULTICALL_HASH]: 'multicall',
	[MULTICALL_DEADLINE_HASH]: 'multicall',
	[MULTICALL_PREVIOUS_BLOCKHASH_HASH]: 'multicall'
};
