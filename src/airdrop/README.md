# Airdrop

Canister that manages the airdrop of invite codes and tokens to new oisy wallet user.

## Flow

![flow](Untitled-2023-02-21-1414.excalidraw.svg)

Let's say we set the canister parameters by setting the following values:

- tokens per users: 100
- depth: 2

Original User gives out the code to their three friends (Chandler, Joey and Phoebe). They in turn share it again with three of their friends (Monica, Ross, Jake, ...).

Level 0 and 1 user get 25 tokens when they sign up and 25 extra tokens when they share the code with three friends. Level 2 users get 25 tokens when they sign up.

## Permissions

Three different level of permissions:

- Admins

  - can call all calls in the canister
  - add lists of pre-generated codes to the canister
  - can add managers

- Managers

  - can generate QR codes to be scanned by users

- Users can
  - scan the base QR code
  - share the newly created invite codes with other users
