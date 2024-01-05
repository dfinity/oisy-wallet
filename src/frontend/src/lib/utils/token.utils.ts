import { ERC20_ICP_SYMBOL } from '$lib/constants/erc20-icp.constants';
import type { Token } from '$lib/types/token';

export const isErc20Icp = ({ symbol }: Token): boolean => symbol === ERC20_ICP_SYMBOL;
