// Base, like every OP-stack chain, charges an L1 data fee on top of L2 gas: the chain requires the
// sender to hold `value + gasLimit * maxFeePerGas + l1Fee`, and it is never refunded. A transaction
// that leaves exactly `gasLimit * maxFeePerGas` behind - which is what "Max" does - is therefore
// short by precisely that fee and can never be included.
//
// The fee is quoted by the `GasPriceOracle` predeploy, which sits at the same address on every
// OP-stack chain.
export const OP_STACK_GAS_PRICE_ORACLE_ADDRESS = '0x420000000000000000000000000000000000000F';

export const OP_STACK_GAS_PRICE_ORACLE_ABI = [
	'function getL1FeeUpperBound(uint256 unsignedTxSize) view returns (uint256)'
];

// `getL1FeeUpperBound` prices a transaction by the size of its unsigned RLP encoding. OISY's own
// transactions are smaller than this - 50 bytes for a native transfer, 114 for an ERC-20 one - so
// one size covers every flow and the quote comes back deliberately padded. The padding is the
// point: the fee is quoted seconds before the transaction is signed and broadcast, and the L1 base
// fee it derives from moves in that window. It buys that margin for a fraction of a gwei.
export const OP_STACK_UNSIGNED_TX_SIZE = 128n;
