import { join } from 'node:path';

const DATA_DIR = join(process.cwd(), 'src', 'frontend', 'src', 'env', 'tokens');

export const CK_ERC20_JSON_FILE = join(DATA_DIR, 'tokens.ckerc20.json');

export const SNS_JSON_FILE = join(DATA_DIR, 'tokens.sns.json');

export const ADDITIONAL_ICRC_JSON_FILE = join(DATA_DIR, 'tokens.icrc.json');
