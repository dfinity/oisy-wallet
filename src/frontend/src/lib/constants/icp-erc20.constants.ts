// Burn ETH ICP ERC20 to ICP
// - the amount of wrapped ICP to unwrap, e.g. 100_000_000_000_000_000 corresponds to exactly 0.1 ICP
// - the ICP account identifier to send the unwrapped ICP to
export const ICP_ERC20_ABI = ['function burnToAccountId(uint256 _amount, bytes32 _to)'];

export const ICP_ERC20_SYMBOL = import.meta.env.VITE_ERC20_ICP_SYMBOL;
