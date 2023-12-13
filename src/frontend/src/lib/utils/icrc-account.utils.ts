import {isNullish} from "@dfinity/utils";
import {decodeIcrcAccount} from "@dfinity/ledger-icrc";

export const invalidIcrcAddress = (address: string | undefined): boolean => {
    if (isNullish(address)) {
        return true;
    }

    try {
        decodeIcrcAccount(address);
        return false;
    } catch (_: unknown) {
        // We do not parse the error
    }

    return true;
};