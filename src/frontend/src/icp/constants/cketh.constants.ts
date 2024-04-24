// Worker refresh rate
// We refresh the ckETH timer every 30 seconds to fetch the minter info but, also update the list of pending ETH -> ckETH transactions.
// Note that we use 30 seconds for simplicity reasons. What would be accurate would be to trigger a refresh each time transactions are mined on the Ethereum network. See for example FeeContext.svelte.
export const CKETH_MINTER_INFO_TIMER = 30000;

// Discussed with crosschain team. At the moment we set 0.01 Ethererum as additional transaction fee for a conversion from ckErc20 to Erc20.
// Those are the fees of the icrc2_approve(minter, tx_fee) describe in the first step of the withdrawal scheme.
// See https://github.com/dfinity/ic/blob/master/rs/ethereum/cketh/docs/ckerc20.adoc#withdrawal-ckerc20-to-erc20
// TODO: in the future we might either want to user to overwrite this value or implement some clever way to estimate those fees.
export const CKERC20_TO_ERC20_MAX_TRANSACTION_FEE = 10_000_000_000_000_000n; // i.e. 0.01 Ethereum
