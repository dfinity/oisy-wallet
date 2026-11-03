import { ATA_SIZE } from '$sol/constants/ata.constants';
import { SOLANA_RENT_ACCOUNT_OVERHEAD_BYTES } from '$sol/constants/sol.constants';

/**
 * What an account of this size must hold to be exempt from rent, scaled from what the chain charges
 * an account of the usual token account size: rent is a price per byte, the account's fixed header
 * included, so the two sizes cost in proportion.
 */
export const rentExemptMinimumFor = ({
	space,
	rentExemptMinimum
}: {
	space: bigint;
	rentExemptMinimum: bigint;
}): bigint =>
	(rentExemptMinimum * (SOLANA_RENT_ACCOUNT_OVERHEAD_BYTES + space)) /
	(SOLANA_RENT_ACCOUNT_OVERHEAD_BYTES + ATA_SIZE);
