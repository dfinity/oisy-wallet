import { id } from 'ethers/hash';

// The calls the review reads, written as the signatures they actually are.
//
// Both the name and the selector are derived from the one string, so they cannot disagree: a
// hand-written map pairing `0x095ea7b3` with a name is two things to keep true, and nothing stops
// the wrong name being typed beside a selector. A signature is also checkable against the ABI it
// comes from by reading it, which four bytes of hex are not.
//
// The set is deliberately no larger than what the review decodes. Naming a call tells the user OISY
// knows what it is, and it may only say so where the review went on to read the arguments and state
// what they were: a name beside a call nobody read would claim a review that never happened, which
// is the whole failure this surface exists to avoid. A selector absent from here is shown as its
// raw four bytes, which is the honest answer.
//
// `call-names.constants.spec.ts` holds this to the classifier, and to the selector constants the
// rest of the app already uses, so neither can drift from it.
const ETH_READ_CALL_SIGNATURES = [
	'approve(address,uint256)',
	'transfer(address,uint256)',
	'setApprovalForAll(address,bool)',
	'increaseAllowance(address,uint256)',
	'decreaseAllowance(address,uint256)',
	// The batch wrappers are read too: their `bytes[]` is opened and the calls inside it listed.
	'multicall(bytes[])',
	'multicall(uint256,bytes[])',
	'multicall(bytes32,bytes[])'
];

// `0x` and the four bytes of a function selector, as hex.
const SELECTOR_LENGTH = 10;

// The value is optional because the point of this map is that most selectors are absent from it:
// it is indexed with whatever a dApp sent, and an unnamed call must read as `undefined` at the type
// level too. `Record<string, string>` would promise a name for every four bytes in existence and
// let a missing one pass as a `string` all the way to the screen.
export const ETH_CALL_NAMES: Record<string, string | undefined> = ETH_READ_CALL_SIGNATURES.reduce(
	(acc, signature) => ({
		...acc,
		[id(signature).slice(0, SELECTOR_LENGTH)]: signature.slice(0, signature.indexOf('('))
	}),
	{}
);
