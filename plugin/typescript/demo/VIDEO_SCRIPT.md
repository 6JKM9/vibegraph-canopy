# VibeGraph Video Script

Target length: 60 to 90 seconds.

## One-Line Pitch

VibeGraph turns community thanks into portable onchain reputation.

## Recording Setup

Open two windows:

- Left: `demo/vibegraph_dashboard.html`
- Right: terminal in `plugin/typescript`

Build first:

```bash
npm install
npm run build:all
```

Start the local Canopy chain with the TypeScript plugin enabled, then run:

```bash
npm run demo:vibegraph
```

## Talk Track

1. "This is VibeGraph, a Social-Fi appchain built with the Canopy TypeScript template."
2. "It adds two custom transaction types: register_profile and give_vibe."
3. "First, the demo creates two local accounts through the Canopy admin RPC on port 50003."
4. "Then it submits two register_profile transactions through the chain RPC on port 50002."
5. "Finally, Alice gives Bob 42 vibe points tagged mentor. The plugin writes a profile update, a vibe attestation, and a counter update to onchain state."
6. "The demo waits for each transaction to be included and prints the confirmed tx hashes."

## What To Show

- The dashboard's RPC height check.
- The terminal output showing profile registration tx hashes.
- The terminal output showing the give_vibe tx hash.
- The final line: "Custom tx submitted: register_profile" and "Custom tx submitted: give_vibe".

## Submission Text

Pitch: VibeGraph turns community thanks into portable onchain reputation.

Built with: Canopy TypeScript plugin template.

Custom txs: register_profile, give_vibe.
