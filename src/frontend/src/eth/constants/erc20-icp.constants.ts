import { ERC20_ABI } from '$eth/constants/erc20.constants';
import { BETA, PROD } from '$lib/constants/app.constants';

// Burn ETH ICP ERC20 to ICP
// - the amount of wrapped ICP to unwrap, e.g. 100_000_000_000_000_000 corresponds to exactly 0.1 ICP
// - the ICP account identifier to send the unwrapped ICP to
const ERC20_ICP_BURN_API = 'function burnToAccountId(uint256 _amount, bytes32 _to)';

export const ERC20_ICP_ABI = [...ERC20_ABI, ERC20_ICP_BURN_API];

export const ERC20_ICP_SYMBOL = PROD || BETA ? 'ICP' : 'ckICP';

export const ERC20_ICP_REPO_URL = 'https://github.com/dfinity/erc20-icp';
