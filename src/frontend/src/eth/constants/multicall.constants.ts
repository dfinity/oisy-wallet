// Wrappers that carry other calls inside them as complete calldata, each element a selector
// followed by its own arguments. They are what makes "the method this request calls" a list rather
// than a single name: a dApp batching an approve and a swap sends one transaction whose own
// selector says nothing about either.
//
// Only this family is expanded. A Universal Router `execute(bytes,bytes[])` carries opcodes and
// bare arguments rather than calldata, and a Safe `multiSend(bytes)` packs its calls without ABI
// encoding, so neither yields selectors by this route and neither is claimed to.

// multicall(bytes[])
export const MULTICALL_HASH = '0xac9650d8';

// multicall(uint256 deadline, bytes[]), as Uniswap's SwapRouter02 sends it
export const MULTICALL_DEADLINE_HASH = '0x5ae401dc';

// multicall(bytes32 previousBlockhash, bytes[])
export const MULTICALL_PREVIOUS_BLOCKHASH_HASH = '0x1f0464d1';

// The argument list of each wrapper, so the nested calls can be decoded out of it. The `bytes[]`
// member is the one that holds them.
export const MULTICALL_ARGUMENTS: Record<string, string[]> = {
	[MULTICALL_HASH]: ['bytes[]'],
	[MULTICALL_DEADLINE_HASH]: ['uint256', 'bytes[]'],
	[MULTICALL_PREVIOUS_BLOCKHASH_HASH]: ['bytes32', 'bytes[]']
};

// A batch can nest, and the depth is bounded so a crafted payload cannot make the review walk a
// tree of its choosing. Two levels covers the batches dApps actually send.
export const MULTICALL_MAX_DEPTH = 2;

// What the review will list. Past this the list stops being something a person reads, and the count
// of what was left out is stated rather than the tail dropped in silence.
export const MULTICALL_MAX_METHODS = 24;
