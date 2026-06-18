# VibeGraph - On-Chain Social Reputation Graph

One-line pitch: VibeGraph turns community thanks into portable onchain reputation.

VibeGraph is a Social-Fi appchain built with the Canopy TypeScript template. Users register onchain profiles, then give each other signed "vibes" for useful community work. Each vibe is stored as an onchain reputation attestation and updates the receiver's portable reputation score.

## Features

### Onchain Social Profiles

- Create a profile with a unique handle and bio.
- Store profile data directly in Canopy plugin state.
- Track reputation score, vibes given, and vibes received.

### Give Vibe Transaction

- Send signed reputation points to another profile.
- Add a tag like mentor, builder, artist, or moderator.
- Attach a short note explaining the attestation.

### Reputation Attestations

- Every vibe is stored as an onchain attestation.
- Tracks sender, receiver, amount, tag, note, and height.
- Builds a portable social graph of community trust.

### Custom Canopy Plugin

- Built with the official Canopy TypeScript template.
- Defines custom transaction types:
  - `register_profile`
  - `give_vibe`

### Local RPC Integration

- Demo script interacts with a local Canopy chain.
- Uses RPC port `50002` for transaction submission/query.
- Uses RPC port `50003` for local keystore account creation.

## Demo Files

- Visual dashboard: `plugin/typescript/demo/vibegraph_dashboard.html`
- Video-demo page: `plugin/typescript/demo/vibegraph_video_demo.html`
- RPC demo script: `plugin/typescript/demo/vibegraph_demo.ts`
- Recording script: `plugin/typescript/demo/VIDEO_SCRIPT.md`

## Run

```bash
cd plugin/typescript
npm install
npm run build:all
npm run demo:vibegraph
```

The RPC demo requires a local Canopy chain running with the TypeScript plugin enabled.
