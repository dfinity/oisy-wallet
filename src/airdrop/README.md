# Airdrop

Canister that manages the airdrop of invite codes and tokens to new oisy wallet user.

Three different level of permissions:

- Admins
    -   can call all calls in the canister
    -   add lists of pre-generated codes to the canister
    -   can add managers

- Managers
    -   can generate QR codes to be scanned by users

- Users can
    -   scan the base QR code
    -   share the newly created invite codes with other users

## Flow
[flow](Untitled-2023-02-21-1414.excalidraw.svg)
