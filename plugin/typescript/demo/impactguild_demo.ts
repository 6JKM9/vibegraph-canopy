import { randomBytes } from 'crypto';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - generated protobuf module is CommonJS
import protoRoot from '../src/proto/index.cjs';

const types = protoRoot.types;

const QUERY_RPC_URL = process.env.CANOPY_QUERY_RPC_URL || 'http://localhost:50002';
const ADMIN_RPC_URL = process.env.CANOPY_ADMIN_RPC_URL || 'http://localhost:50003';
const TEST_PASSWORD = process.env.CANOPY_DEMO_PASSWORD || 'impactguild-demo-password';
const DEMO_GUILD_ID = Number(process.env.IMPACTGUILD_DEMO_GUILD_ID || '1');
const DEMO_QUEST_ID = Number(process.env.IMPACTGUILD_DEMO_QUEST_ID || '1');
const DEMO_PROOF_ID = Number(process.env.IMPACTGUILD_DEMO_PROOF_ID || '1');
const DEMO_GATE_ID = Number(process.env.IMPACTGUILD_DEMO_GATE_ID || '1');

interface KeyGroup {
    address: string;
    publicKey: string;
    privateKey: string;
}

function randomSuffix(): string {
    return randomBytes(3).toString('hex');
}

function hexToBase64(hexStr: string): string {
    return Buffer.from(hexStr, 'hex').toString('base64');
}

function bytesToHex(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('hex');
}

async function postRawJSON(url: string, jsonBody: string): Promise<string> {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonBody
    });
    const respBody = await response.text();
    if (response.status >= 400) {
        throw new Error(`HTTP ${response.status} from ${url}: ${respBody}`);
    }
    return respBody;
}

async function getRaw(url: string): Promise<string> {
    const response = await fetch(url);
    const respBody = await response.text();
    if (response.status >= 400) {
        throw new Error(`HTTP ${response.status} from ${url}: ${respBody}`);
    }
    return respBody;
}

async function keystoreNewKey(nickname: string): Promise<string> {
    const respBody = await postRawJSON(
        `${ADMIN_RPC_URL}/v1/admin/keystore-new-key`,
        JSON.stringify({ nickname, password: TEST_PASSWORD })
    );
    return JSON.parse(respBody) as string;
}

async function keystoreGetKey(address: string): Promise<KeyGroup> {
    const respBody = await postRawJSON(
        `${ADMIN_RPC_URL}/v1/admin/keystore-get`,
        JSON.stringify({ address, password: TEST_PASSWORD })
    );
    const parsed = JSON.parse(respBody);
    return {
        address: parsed.address || parsed.Address || address,
        publicKey: parsed.publicKey || parsed.PublicKey || parsed.public_key,
        privateKey: parsed.privateKey || parsed.PrivateKey || parsed.private_key
    };
}

async function getHeight(): Promise<bigint> {
    const respBody = await postRawJSON(`${QUERY_RPC_URL}/v1/query/height`, '{}');
    const result = JSON.parse(respBody) as { height: number };
    return BigInt(result.height);
}

async function assertRpcReady(): Promise<void> {
    try {
        const height = await getHeight();
        console.log(`Connected to Canopy query RPC at height ${height}`);
    } catch (err) {
        throw new Error(
            `Canopy query RPC is not ready at ${QUERY_RPC_URL}. Start the local chain with the TypeScript plugin before running this demo. ${String(err)}`
        );
    }

    try {
        const probeName = `impactguild_probe_${randomSuffix()}`;
        await keystoreNewKey(probeName);
        console.log(`Connected to Canopy admin RPC at ${ADMIN_RPC_URL}`);
    } catch (err) {
        throw new Error(
            `Canopy admin RPC is not ready at ${ADMIN_RPC_URL}. The demo needs port 50003 for local keystore accounts. ${String(err)}`
        );
    }
}

async function waitForTxInclusion(
    senderAddr: string,
    txHash: string,
    timeoutMs: number
): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const respBody = await postRawJSON(
                `${QUERY_RPC_URL}/v1/query/txs-by-sender`,
                JSON.stringify({ address: senderAddr, perPage: 20 })
            );
            const result = JSON.parse(respBody) as {
                results: Array<{ txHash: string; height: number }>;
            };
            if ((result.results || []).some((tx) => tx.txHash === txHash)) {
                return true;
            }
        } catch {
            // Keep polling while the index catches up.
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
}

function getTypeUrl(msgType: string): string {
    switch (msgType) {
        case 'register_profile':
            return 'type.googleapis.com/types.MessageRegisterProfile';
        case 'give_vibe':
            return 'type.googleapis.com/types.MessageGiveVibe';
        case 'create_guild':
            return 'type.googleapis.com/types.MessageCreateGuild';
        case 'post_quest':
            return 'type.googleapis.com/types.MessagePostQuest';
        case 'submit_proof':
            return 'type.googleapis.com/types.MessageSubmitProof';
        case 'attest_contribution':
            return 'type.googleapis.com/types.MessageAttestContribution';
        case 'issue_badge':
            return 'type.googleapis.com/types.MessageIssueBadge';
        case 'create_gate':
            return 'type.googleapis.com/types.MessageCreateGate';
        case 'check_gate_access':
            return 'type.googleapis.com/types.MessageCheckGateAccess';
        case 'cast_reputation_vote':
            return 'type.googleapis.com/types.MessageCastReputationVote';
        default:
            throw new Error(`Unknown message type: ${msgType}`);
    }
}

function buildMessageBytes(msgType: string, msgJSON: Record<string, unknown>): Uint8Array {
    switch (msgType) {
        case 'register_profile':
            return types.MessageRegisterProfile.encode(
                types.MessageRegisterProfile.create({
                    ownerAddress: Buffer.from(msgJSON.ownerAddress as string, 'base64'),
                    handle: msgJSON.handle,
                    bio: msgJSON.bio
                })
            ).finish();
        case 'give_vibe':
            return types.MessageGiveVibe.encode(
                types.MessageGiveVibe.create({
                    fromAddress: Buffer.from(msgJSON.fromAddress as string, 'base64'),
                    toAddress: Buffer.from(msgJSON.toAddress as string, 'base64'),
                    amount: msgJSON.amount,
                    tag: msgJSON.tag,
                    note: msgJSON.note
                })
            ).finish();
        case 'create_guild':
            return types.MessageCreateGuild.encode(
                types.MessageCreateGuild.create({
                    creatorAddress: Buffer.from(msgJSON.creatorAddress as string, 'base64'),
                    slug: msgJSON.slug,
                    name: msgJSON.name,
                    description: msgJSON.description
                })
            ).finish();
        case 'post_quest':
            return types.MessagePostQuest.encode(
                types.MessagePostQuest.create({
                    creatorAddress: Buffer.from(msgJSON.creatorAddress as string, 'base64'),
                    guildId: msgJSON.guildId,
                    title: msgJSON.title,
                    tag: msgJSON.tag,
                    rewardRep: msgJSON.rewardRep
                })
            ).finish();
        case 'submit_proof':
            return types.MessageSubmitProof.encode(
                types.MessageSubmitProof.create({
                    contributorAddress: Buffer.from(msgJSON.contributorAddress as string, 'base64'),
                    guildId: msgJSON.guildId,
                    questId: msgJSON.questId,
                    proofUri: msgJSON.proofURI,
                    note: msgJSON.note
                })
            ).finish();
        case 'attest_contribution':
            return types.MessageAttestContribution.encode(
                types.MessageAttestContribution.create({
                    reviewerAddress: Buffer.from(msgJSON.reviewerAddress as string, 'base64'),
                    proofId: msgJSON.proofId,
                    amount: msgJSON.amount,
                    note: msgJSON.note
                })
            ).finish();
        case 'issue_badge':
            return types.MessageIssueBadge.encode(
                types.MessageIssueBadge.create({
                    issuerAddress: Buffer.from(msgJSON.issuerAddress as string, 'base64'),
                    toAddress: Buffer.from(msgJSON.toAddress as string, 'base64'),
                    guildId: msgJSON.guildId,
                    badgeName: msgJSON.badgeName,
                    badgeUri: msgJSON.badgeURI
                })
            ).finish();
        case 'create_gate':
            return types.MessageCreateGate.encode(
                types.MessageCreateGate.create({
                    creatorAddress: Buffer.from(msgJSON.creatorAddress as string, 'base64'),
                    guildId: msgJSON.guildId,
                    gateName: msgJSON.gateName,
                    requiredRep: msgJSON.requiredRep,
                    requiredBadge: msgJSON.requiredBadge
                })
            ).finish();
        case 'check_gate_access':
            return types.MessageCheckGateAccess.encode(
                types.MessageCheckGateAccess.create({
                    visitorAddress: Buffer.from(msgJSON.visitorAddress as string, 'base64'),
                    gateId: msgJSON.gateId
                })
            ).finish();
        case 'cast_reputation_vote':
            return types.MessageCastReputationVote.encode(
                types.MessageCastReputationVote.create({
                    voterAddress: Buffer.from(msgJSON.voterAddress as string, 'base64'),
                    guildId: msgJSON.guildId,
                    proposalId: msgJSON.proposalId,
                    choice: msgJSON.choice
                })
            ).finish();
        default:
            throw new Error(`Unknown message type: ${msgType}`);
    }
}

async function buildSignAndSendTx(
    signerKey: KeyGroup,
    msgType: string,
    msgJSON: Record<string, unknown>,
    fee: bigint,
    _height: bigint
): Promise<string> {
    const msgTypeUrl = getTypeUrl(msgType);
    const msgBytes = buildMessageBytes(msgType, msgJSON);

    // The local admin RPC signs canonical bytes inside Canopy's keystore.
    // This uses the same BDN signature implementation as the node itself.
    const tx = {
        type: msgType,
        msgTypeUrl,
        msgBytes: bytesToHex(msgBytes),
        fee: Number(fee),
        memo: '',
        submit: true,
        address: signerKey.address,
        password: TEST_PASSWORD
    };

    const respBody = await postRawJSON(`${ADMIN_RPC_URL}/v1/admin/tx-plugin`, JSON.stringify(tx, null, 2));
    return JSON.parse(respBody) as string;
}

async function sendAndConfirm(
    label: string,
    senderAddr: string,
    txPromise: Promise<string>
): Promise<string> {
    const txHash = await txPromise;
    console.log(`${label} tx sent: ${txHash}`);
    const included = await waitForTxInclusion(senderAddr, txHash, 30000);
    if (!included) {
        throw new Error(`${label} tx was not indexed within 30 seconds`);
    }
    console.log(`${label} tx confirmed`);
    return txHash;
}

async function maybePrintStateHint(handles: string[]): Promise<void> {
    try {
        const state = await getRaw(`${QUERY_RPC_URL}/v1/query/state`);
        for (const handle of handles) {
            if (state.includes(handle)) {
                console.log(`State export contains profile handle: ${handle}`);
            }
        }
    } catch {
        console.log('State export not available; tx history already proves RPC submission.');
    }
}

async function main(): Promise<void> {
    console.log('=== ImpactGuild Social-Fi demo ===');
    console.log('Pitch: ImpactGuild turns community work into portable onchain reputation, access, and governance.');
    console.log(`RPC: ${QUERY_RPC_URL} / ${ADMIN_RPC_URL}`);
    console.log(
        `Demo IDs: guild=${DEMO_GUILD_ID}, quest=${DEMO_QUEST_ID}, proof=${DEMO_PROOF_ID}, gate=${DEMO_GATE_ID}`
    );
    console.log(
        'Tip: run this on a fresh local chain, or override IMPACTGUILD_DEMO_*_ID env vars if counters already exist.'
    );
    await assertRpcReady();

    const suffix = randomSuffix();
    const aliceHandle = `alice_${suffix}`;
    const bobHandle = `bob_${suffix}`;
    const guildSlug = `canopy-builders-${suffix}`;

    const aliceAddr = await keystoreNewKey(`impactguild_alice_${suffix}`);
    const bobAddr = await keystoreNewKey(`impactguild_bob_${suffix}`);
    const aliceKey = await keystoreGetKey(aliceAddr);
    const bobKey = await keystoreGetKey(bobAddr);

    console.log(`Alice address: ${aliceAddr}`);
    console.log(`Bob address:   ${bobAddr}`);

    let height = await getHeight();
    await sendAndConfirm(
        'register Alice profile',
        aliceAddr,
        buildSignAndSendTx(
            aliceKey,
            'register_profile',
            {
                ownerAddress: hexToBase64(aliceAddr),
                handle: aliceHandle,
                bio: 'Guild operator and Canopy community reviewer.'
            },
            0n,
            height
        )
    );

    height = await getHeight();
    await sendAndConfirm(
        'register Bob profile',
        bobAddr,
        buildSignAndSendTx(
            bobKey,
            'register_profile',
            {
                ownerAddress: hexToBase64(bobAddr),
                handle: bobHandle,
                bio: 'Builder submitting proof for reputation and access.'
            },
            0n,
            height
        )
    );

    height = await getHeight();
    await sendAndConfirm(
        'create Canopy Builders guild',
        aliceAddr,
        buildSignAndSendTx(
            aliceKey,
            'create_guild',
            {
                creatorAddress: hexToBase64(aliceAddr),
                slug: guildSlug,
                name: 'Canopy Builders',
                description: 'A guild for builders who prove useful Social-Fi contributions.'
            },
            0n,
            height
        )
    );

    height = await getHeight();
    await sendAndConfirm(
        'post quest',
        aliceAddr,
        buildSignAndSendTx(
            aliceKey,
            'post_quest',
            {
                creatorAddress: hexToBase64(aliceAddr),
                guildId: DEMO_GUILD_ID,
                title: 'Build and demo a Social-Fi appchain',
                tag: 'builder',
                rewardRep: 120
            },
            0n,
            height
        )
    );

    height = await getHeight();
    await sendAndConfirm(
        'submit proof',
        bobAddr,
        buildSignAndSendTx(
            bobKey,
            'submit_proof',
            {
                contributorAddress: hexToBase64(bobAddr),
                guildId: DEMO_GUILD_ID,
                questId: DEMO_QUEST_ID,
                proofURI: 'https://github.com/6JKM9/impactguild-canopy',
                note: 'Submitted repo, dashboard, and local demo flow.'
            },
            0n,
            height
        )
    );

    height = await getHeight();
    await sendAndConfirm(
        'attest contribution',
        aliceAddr,
        buildSignAndSendTx(
            aliceKey,
            'attest_contribution',
            {
                reviewerAddress: hexToBase64(aliceAddr),
                proofId: DEMO_PROOF_ID,
                amount: 120,
                note: 'Approved as verified builder work.'
            },
            0n,
            height
        )
    );

    height = await getHeight();
    await sendAndConfirm(
        'issue badge',
        aliceAddr,
        buildSignAndSendTx(
            aliceKey,
            'issue_badge',
            {
                issuerAddress: hexToBase64(aliceAddr),
                toAddress: hexToBase64(bobAddr),
                guildId: DEMO_GUILD_ID,
                badgeName: 'verified_builder',
                badgeURI: 'ipfs://impactguild/verified-builder'
            },
            0n,
            height
        )
    );

    height = await getHeight();
    await sendAndConfirm(
        'create gate',
        aliceAddr,
        buildSignAndSendTx(
            aliceKey,
            'create_gate',
            {
                creatorAddress: hexToBase64(aliceAddr),
                guildId: DEMO_GUILD_ID,
                gateName: 'VIP Builders Room',
                requiredRep: 100,
                requiredBadge: 'verified_builder'
            },
            0n,
            height
        )
    );

    height = await getHeight();
    await sendAndConfirm(
        'check gate access',
        bobAddr,
        buildSignAndSendTx(
            bobKey,
            'check_gate_access',
            {
                visitorAddress: hexToBase64(bobAddr),
                gateId: DEMO_GATE_ID
            },
            0n,
            height
        )
    );

    height = await getHeight();
    await sendAndConfirm(
        'cast reputation vote',
        bobAddr,
        buildSignAndSendTx(
            bobKey,
            'cast_reputation_vote',
            {
                voterAddress: hexToBase64(bobAddr),
                guildId: DEMO_GUILD_ID,
                proposalId: 'launch-builder-bounties',
                choice: 'yes'
            },
            0n,
            height
        )
    );

    await maybePrintStateHint([aliceHandle, bobHandle, guildSlug]);
    console.log('\nDemo complete');
    console.log('- Custom tx submitted: register_profile');
    console.log('- Custom tx submitted: create_guild');
    console.log('- Custom tx submitted: post_quest');
    console.log('- Custom tx submitted: submit_proof');
    console.log('- Custom tx submitted: attest_contribution');
    console.log('- Custom tx submitted: issue_badge');
    console.log('- Custom tx submitted: create_gate');
    console.log('- Custom tx submitted: check_gate_access');
    console.log('- Custom tx submitted: cast_reputation_vote');
    console.log('- Local RPC ports used: 50002 and 50003');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
