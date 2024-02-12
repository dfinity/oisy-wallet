import { PROD } from '$lib/constants/app.constants';

// TODO(GIX-2251): replace with an amount fetched from upcoming get_minter_info endpoint.
export const CKETH_MIN_WITHDRAWAL_AMOUNT = PROD ? 30_000_000_000_000_000n : 10_000_000_000_000_000n;
