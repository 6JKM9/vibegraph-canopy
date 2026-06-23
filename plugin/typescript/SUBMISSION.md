# ImpactGuild Contest Submission

## One-Line Pitch

ImpactGuild turns community work into portable onchain reputation, gated access, badges, and contribution-weighted governance.

## Description

ImpactGuild is a Social-Fi appchain built with the Canopy TypeScript template. Communities can create guilds, post contribution quests, accept proof links, approve work through onchain attestations, issue badges, unlock gated rooms, and run governance where voting power comes from earned reputation.

The app is designed for Discord communities, DAOs, ambassador programs, open-source ecosystems, and builder groups that need a portable record of who actually contributes.

## Custom Transaction Types

- `register_profile` - create an onchain social identity
- `give_vibe` - issue a direct reputation attestation
- `create_guild` - create a community workspace
- `post_quest` - publish a contribution quest
- `submit_proof` - submit proof for a quest
- `attest_contribution` - approve proof and mint reputation
- `issue_badge` - mint a portable contributor badge
- `create_gate` - define reputation/badge access rules
- `check_gate_access` - record whether a user passes a gate
- `cast_reputation_vote` - vote with earned reputation weight

## Demo Flow

1. Alice registers a profile.
2. Bob registers a profile.
3. Alice creates the Canopy Builders guild.
4. Alice posts a Social-Fi builder quest.
5. Bob submits proof with a GitHub/demo link.
6. Alice attests Bob's contribution.
7. Bob earns 120 reputation.
8. Alice issues Bob a Verified Builder badge.
9. Alice creates a VIP Builders gate requiring 100 reputation and the badge.
10. Bob checks the gate and passes.
11. Bob casts a reputation-weighted governance vote.

## Local RPC Proof

The demo script interacts with a local Canopy chain through:

- `50002` for transaction/query RPC
- `50003` for admin keystore RPC

Start the local TypeScript-plugin node from the repository root:

```bash
docker build -f plugin/typescript/Dockerfile -t impactguild-canopy .
docker run --rm -p 50002:50002 -p 50003:50003 impactguild-canopy ./canopy --password impactguild-local-demo --nickname impactguild-validator start
```

Then, in another terminal, run:

```bash
cd plugin/typescript
npm install
npm run build:all
npm run demo:impactguild
```

For the cleanest recording, run this on a fresh local chain so the first guild, quest, proof, and gate IDs are `1`. If you are reusing a chain, override the IDs:

```bash
IMPACTGUILD_DEMO_GUILD_ID=2 IMPACTGUILD_DEMO_QUEST_ID=2 IMPACTGUILD_DEMO_PROOF_ID=2 IMPACTGUILD_DEMO_GATE_ID=2 npm run demo:impactguild
```

PowerShell equivalent:

```powershell
$env:IMPACTGUILD_DEMO_GUILD_ID=2
$env:IMPACTGUILD_DEMO_QUEST_ID=2
$env:IMPACTGUILD_DEMO_PROOF_ID=2
$env:IMPACTGUILD_DEMO_GATE_ID=2
npm run demo:impactguild
```

## Suggested Discord Submission

```text
ImpactGuild - Onchain Social-Fi Operating System

Pitch: ImpactGuild turns community work into portable onchain reputation, gated access, badges, and contribution-weighted governance.

ImpactGuild is a Social-Fi appchain built with the Canopy TypeScript template. Communities create guilds, post quests, review contribution proof, issue contributor badges, unlock gated spaces, and let members vote with earned reputation instead of token wealth.

Custom txs:
- register_profile
- give_vibe
- create_guild
- post_quest
- submit_proof
- attest_contribution
- issue_badge
- create_gate
- check_gate_access
- cast_reputation_vote

Demo flow:
Alice creates a Canopy Builders guild, Bob submits proof for a quest, Alice attests the contribution, Bob earns 120 reputation, receives a Verified Builder badge, unlocks a VIP gate, and casts a reputation-weighted governance vote.

Github: https://github.com/6JKM9/impactguild-canopy
Demo video: <your X or YouTube video link>
```
