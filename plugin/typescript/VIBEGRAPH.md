# VibeGraph

One-line pitch: VibeGraph turns community thanks into portable onchain reputation.

VibeGraph is a Social-Fi Canopy appchain plugin built from the official TypeScript template. It adds two custom transaction types:

- `register_profile`: creates or updates an onchain profile with a unique handle and bio.
- `give_vibe`: records a signed reputation attestation from one profile to another and increases the recipient's vibe score.

The plugin persists custom state through Canopy's plugin state API:

- `SocialProfile` records handle, bio, vibe score, vibes given, and vibes received.
- `VibeAttestation` records immutable point awards with sender, receiver, amount, tag, note, and height.
- `VibeCounter` assigns deterministic IDs to attestations.

## Demo Flow

1. Start a local Canopy chain with the TypeScript plugin enabled.
2. Build the TypeScript plugin from `plugin/typescript`.
3. Run the VibeGraph RPC demo.
4. Open `demo/vibegraph_dashboard.html` during recording for a visual walkthrough, example profiles, and RPC height check.

```bash
cd plugin/typescript
npm install
npm run build:all
npm run demo:vibegraph
```

The demo connects to:

- Query RPC: `http://localhost:50002`
- Admin RPC: `http://localhost:50003`

The dashboard works even before the local chain is running. Click `Run Example Flow` to show Alice and Bob registering profiles, then Alice giving Bob 42 mentor vibe points. The scores, activity feed, and example tx hashes update on screen.

When the local Canopy chain is running, the terminal demo creates two local keystore accounts, submits two `register_profile` transactions, submits one `give_vibe` transaction, and confirms inclusion through RPC tx history.

## Files To Show In The Video

- `demo/vibegraph_dashboard.html` for the visual story and local RPC health check.
- `demo/vibegraph_demo.ts` for the signed RPC transaction flow.
- `proto/tx.proto` for the custom transaction and state definitions.
- `src/contract/contract.ts` for CheckTx and DeliverTx logic.
- `demo/VIDEO_SCRIPT.md` for a 60-90 second recording script.

## Contest Checklist

- Uses an official Canopy template: TypeScript.
- Defines custom transaction types: `register_profile` and `give_vibe`.
- Writes custom onchain state via plugin `StateWrite`.
- Interacts with the local Canopy chain through RPC ports `50002` and `50003`.
- Has a clear Social-Fi function: onchain profiles plus signed reputation attestations.
