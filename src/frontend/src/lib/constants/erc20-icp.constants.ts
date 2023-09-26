import { ERC20_ABI } from '$lib/constants/erc20.constants';

// Burn ETH ICP ERC20 to ICP
// - the amount of wrapped ICP to unwrap, e.g. 100_000_000_000_000_000 corresponds to exactly 0.1 ICP
// - the ICP account identifier to send the unwrapped ICP to
const ERC20_ICP_BURN_API = 'function burnToAccountId(uint256 _amount, bytes32 _to)';

export const ERC20_ICP_ABI = [...ERC20_ABI, ERC20_ICP_BURN_API];

export const ERC20_ICP_SYMBOL = import.meta.env.VITE_ERC20_ICP_SYMBOL;

export const ERC20_ICP_REPO_URL = import.meta.env.VITE_ERC20_ICP_REPO_URL;
