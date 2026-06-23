/* This file contains the ImpactGuild Social-Fi contract implementation. */

import Long from 'long';

import { types } from '../proto/types.js';

import {
    IPluginError,
    ErrHandleTaken,
    ErrAlreadyReviewed,
    ErrGateRequired,
    ErrGuildRequired,
    ErrInsufficientFunds,
    ErrInvalidAddress,
    ErrInvalidAmount,
    ErrInvalidHandle,
    ErrInvalidMessageCast,
    ErrInvalidSlug,
    ErrInvalidSocialText,
    ErrProofRequired,
    ErrQuestRequired,
    ErrProfileRequired,
    ErrSelfVibe,
    ErrSlugTaken,
    ErrTxFeeBelowStateLimit
} from './error.js';

import type { Plugin, Config } from './plugin.js';
import { JoinLenPrefix, FromAny, Unmarshal } from './plugin.js';
import { fileDescriptorProtos } from '../proto/descriptors.js';

export const ContractConfig: any = {
    name: 'impactguild_social_fi',
    id: 1,
    version: 1,
    supportedTransactions: [
        'send',
        'register_profile',
        'give_vibe',
        'create_guild',
        'post_quest',
        'submit_proof',
        'attest_contribution',
        'issue_badge',
        'create_gate',
        'check_gate_access',
        'cast_reputation_vote'
    ],
    transactionTypeUrls: [
        'type.googleapis.com/types.MessageSend',
        'type.googleapis.com/types.MessageRegisterProfile',
        'type.googleapis.com/types.MessageGiveVibe',
        'type.googleapis.com/types.MessageCreateGuild',
        'type.googleapis.com/types.MessagePostQuest',
        'type.googleapis.com/types.MessageSubmitProof',
        'type.googleapis.com/types.MessageAttestContribution',
        'type.googleapis.com/types.MessageIssueBadge',
        'type.googleapis.com/types.MessageCreateGate',
        'type.googleapis.com/types.MessageCheckGateAccess',
        'type.googleapis.com/types.MessageCastReputationVote'
    ],
    eventTypeUrls: [],
    fileDescriptorProtos
};

export class Contract {
    Config: Config;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FSMConfig: any;
    plugin: Plugin;
    fsmId: Long;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(config: Config, fsmConfig: any, plugin: Plugin, fsmId: Long) {
        this.Config = config;
        this.FSMConfig = fsmConfig;
        this.plugin = plugin;
        this.fsmId = fsmId;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    Genesis(_request: any): any {
        return {};
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    BeginBlock(_request: any): any {
        return {};
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    EndBlock(_request: any): any {
        return {};
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageSend(msg: any): any {
        if (!isAddress(msg.fromAddress) || !isAddress(msg.toAddress)) {
            return { error: ErrInvalidAddress() };
        }
        if (isZeroAmount(msg.amount)) {
            return { error: ErrInvalidAmount() };
        }
        return {
            recipient: msg.toAddress,
            authorizedSigners: [msg.fromAddress]
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageRegisterProfile(msg: any): any {
        if (!isAddress(msg.ownerAddress)) {
            return { error: ErrInvalidAddress() };
        }
        if (!isValidHandle(msg.handle)) {
            return { error: ErrInvalidHandle() };
        }
        if (!isValidBio(msg.bio)) {
            return { error: ErrInvalidSocialText() };
        }
        return {
            recipient: msg.ownerAddress,
            authorizedSigners: [msg.ownerAddress]
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageGiveVibe(msg: any): any {
        if (!isAddress(msg.fromAddress) || !isAddress(msg.toAddress)) {
            return { error: ErrInvalidAddress() };
        }
        if (sameBytes(msg.fromAddress, msg.toAddress)) {
            return { error: ErrSelfVibe() };
        }
        const amount = toLong(msg.amount);
        if (amount.isZero() || amount.greaterThan(Long.fromNumber(100))) {
            return { error: ErrInvalidAmount() };
        }
        if (!isValidTag(msg.tag) || !isValidNote(msg.note)) {
            return { error: ErrInvalidSocialText() };
        }
        return {
            recipient: msg.toAddress,
            authorizedSigners: [msg.fromAddress]
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageCreateGuild(msg: any): any {
        if (!isAddress(msg.creatorAddress)) {
            return { error: ErrInvalidAddress() };
        }
        if (!isValidSlug(msg.slug)) {
            return { error: ErrInvalidSlug() };
        }
        if (!isValidTitle(msg.name, 3, 48) || !isValidNote(msg.description)) {
            return { error: ErrInvalidSocialText() };
        }
        return {
            recipient: msg.creatorAddress,
            authorizedSigners: [msg.creatorAddress]
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessagePostQuest(msg: any): any {
        if (!isAddress(msg.creatorAddress)) {
            return { error: ErrInvalidAddress() };
        }
        if (toLong(msg.guildId).isZero()) {
            return { error: ErrInvalidAmount() };
        }
        if (!isValidTitle(msg.title, 3, 80) || !isValidTag(msg.tag)) {
            return { error: ErrInvalidSocialText() };
        }
        if (toLong(msg.rewardRep).isZero() || toLong(msg.rewardRep).greaterThan(Long.fromNumber(500))) {
            return { error: ErrInvalidAmount() };
        }
        return {
            recipient: msg.creatorAddress,
            authorizedSigners: [msg.creatorAddress]
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageSubmitProof(msg: any): any {
        if (!isAddress(msg.contributorAddress)) {
            return { error: ErrInvalidAddress() };
        }
        if (toLong(msg.guildId).isZero() || toLong(msg.questId).isZero()) {
            return { error: ErrInvalidAmount() };
        }
        if (!isValidUri(msg.proofURI || msg.proofUri) || !isValidNote(msg.note)) {
            return { error: ErrInvalidSocialText() };
        }
        return {
            recipient: msg.contributorAddress,
            authorizedSigners: [msg.contributorAddress]
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageAttestContribution(msg: any): any {
        if (!isAddress(msg.reviewerAddress)) {
            return { error: ErrInvalidAddress() };
        }
        if (toLong(msg.proofId).isZero()) {
            return { error: ErrInvalidAmount() };
        }
        if (toLong(msg.amount).isZero() || toLong(msg.amount).greaterThan(Long.fromNumber(500))) {
            return { error: ErrInvalidAmount() };
        }
        if (!isValidNote(msg.note)) {
            return { error: ErrInvalidSocialText() };
        }
        return {
            recipient: msg.reviewerAddress,
            authorizedSigners: [msg.reviewerAddress]
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageIssueBadge(msg: any): any {
        if (!isAddress(msg.issuerAddress) || !isAddress(msg.toAddress)) {
            return { error: ErrInvalidAddress() };
        }
        if (toLong(msg.guildId).isZero()) {
            return { error: ErrInvalidAmount() };
        }
        if (!isValidTitle(msg.badgeName, 3, 48) || !isValidUri(msg.badgeURI || msg.badgeUri)) {
            return { error: ErrInvalidSocialText() };
        }
        return {
            recipient: msg.toAddress,
            authorizedSigners: [msg.issuerAddress]
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageCreateGate(msg: any): any {
        if (!isAddress(msg.creatorAddress)) {
            return { error: ErrInvalidAddress() };
        }
        if (toLong(msg.guildId).isZero()) {
            return { error: ErrInvalidAmount() };
        }
        if (!isValidTitle(msg.gateName, 3, 48) || !isOptionalTag(msg.requiredBadge)) {
            return { error: ErrInvalidSocialText() };
        }
        return {
            recipient: msg.creatorAddress,
            authorizedSigners: [msg.creatorAddress]
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageCheckGateAccess(msg: any): any {
        if (!isAddress(msg.visitorAddress)) {
            return { error: ErrInvalidAddress() };
        }
        if (toLong(msg.gateId).isZero()) {
            return { error: ErrInvalidAmount() };
        }
        return {
            recipient: msg.visitorAddress,
            authorizedSigners: [msg.visitorAddress]
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CheckMessageCastReputationVote(msg: any): any {
        if (!isAddress(msg.voterAddress)) {
            return { error: ErrInvalidAddress() };
        }
        if (toLong(msg.guildId).isZero()) {
            return { error: ErrInvalidAmount() };
        }
        if (!isValidTitle(msg.proposalId, 3, 64) || !isValidTitle(msg.choice, 2, 32)) {
            return { error: ErrInvalidSocialText() };
        }
        return {
            recipient: msg.voterAddress,
            authorizedSigners: [msg.voterAddress]
        };
    }
}

export class ContractAsync {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async CheckTx(contract: Contract, request: any): Promise<any> {
        const [msg, msgType, msgErr] = FromAny(request.tx?.msg);
        if (msgErr) {
            return { error: msgErr };
        }
        if (!msg || !msgType) {
            return { error: ErrInvalidMessageCast() };
        }

        const feeErr = await ContractAsync.CheckMinimumFee(contract, request.tx?.fee, msgType);
        if (feeErr) {
            return { error: feeErr };
        }

        switch (msgType) {
            case 'MessageSend':
                return contract.CheckMessageSend(msg);
            case 'MessageRegisterProfile':
                return contract.CheckMessageRegisterProfile(msg);
            case 'MessageGiveVibe':
                return contract.CheckMessageGiveVibe(msg);
            case 'MessageCreateGuild':
                return contract.CheckMessageCreateGuild(msg);
            case 'MessagePostQuest':
                return contract.CheckMessagePostQuest(msg);
            case 'MessageSubmitProof':
                return contract.CheckMessageSubmitProof(msg);
            case 'MessageAttestContribution':
                return contract.CheckMessageAttestContribution(msg);
            case 'MessageIssueBadge':
                return contract.CheckMessageIssueBadge(msg);
            case 'MessageCreateGate':
                return contract.CheckMessageCreateGate(msg);
            case 'MessageCheckGateAccess':
                return contract.CheckMessageCheckGateAccess(msg);
            case 'MessageCastReputationVote':
                return contract.CheckMessageCastReputationVote(msg);
            default:
                return { error: ErrInvalidMessageCast() };
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverTx(contract: Contract, request: any): Promise<any> {
        const [msg, msgType, err] = FromAny(request.tx?.msg);
        if (err) {
            return { error: err };
        }
        if (!msg || !msgType) {
            return { error: ErrInvalidMessageCast() };
        }

        const fee = request.tx?.fee as Long | number | undefined;
        const createdHeight = toLong(request.tx?.createdHeight);
        switch (msgType) {
            case 'MessageSend':
                return ContractAsync.DeliverMessageSend(contract, msg, fee);
            case 'MessageRegisterProfile':
                return ContractAsync.DeliverMessageRegisterProfile(contract, msg, fee, createdHeight);
            case 'MessageGiveVibe':
                return ContractAsync.DeliverMessageGiveVibe(contract, msg, fee, createdHeight);
            case 'MessageCreateGuild':
                return ContractAsync.DeliverMessageCreateGuild(contract, msg, fee, createdHeight);
            case 'MessagePostQuest':
                return ContractAsync.DeliverMessagePostQuest(contract, msg, fee, createdHeight);
            case 'MessageSubmitProof':
                return ContractAsync.DeliverMessageSubmitProof(contract, msg, fee, createdHeight);
            case 'MessageAttestContribution':
                return ContractAsync.DeliverMessageAttestContribution(contract, msg, fee, createdHeight);
            case 'MessageIssueBadge':
                return ContractAsync.DeliverMessageIssueBadge(contract, msg, fee, createdHeight);
            case 'MessageCreateGate':
                return ContractAsync.DeliverMessageCreateGate(contract, msg, fee, createdHeight);
            case 'MessageCheckGateAccess':
                return ContractAsync.DeliverMessageCheckGateAccess(contract, msg, fee, createdHeight);
            case 'MessageCastReputationVote':
                return ContractAsync.DeliverMessageCastReputationVote(contract, msg, fee, createdHeight);
            default:
                return { error: ErrInvalidMessageCast() };
        }
    }

    static async CheckMinimumFee(
        contract: Contract,
        fee: Long | number | undefined,
        msgType: string
    ): Promise<IPluginError | null> {
        const [resp, err] = await contract.plugin.StateRead(contract, {
            keys: [
                {
                    queryId: randomQueryId(),
                    key: KeyForFeeParams()
                }
            ]
        });

        if (err) {
            return err;
        }
        if (resp?.error) {
            return resp.error as IPluginError;
        }

        const feeParamsBytes = resp?.results?.[0]?.entries?.[0]?.value;
        if (!feeParamsBytes || feeParamsBytes.length === 0) {
            return null;
        }

        const [minFees, unmarshalErr] = Unmarshal(feeParamsBytes, types.FeeParams);
        if (unmarshalErr) {
            return unmarshalErr;
        }

        const feeParams = minFees as any;
        const minimum = minimumFeeForMessage(msgType, feeParams);
        if (toLong(fee).lessThan(minimum)) {
            return ErrTxFeeBelowStateLimit();
        }
        return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverMessageSend(
        contract: Contract,
        msg: any,
        fee: Long | number | undefined
    ): Promise<any> {
        const fromQueryId = randomQueryId();
        const toQueryId = randomQueryId();
        const feeQueryId = randomQueryId();

        const fromKey = KeyForAccount(msg.fromAddress);
        const toKey = KeyForAccount(msg.toAddress);
        const feePoolKey = KeyForFeePool(Long.fromNumber(contract.Config.ChainId));

        const [response, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: feeQueryId, key: feePoolKey },
                { queryId: fromQueryId, key: fromKey },
                { queryId: toQueryId, key: toKey }
            ]
        });

        if (readErr) {
            return { error: readErr };
        }
        if (response?.error) {
            return { error: response.error };
        }

        const fromBytes = readFirst(response, fromQueryId);
        const toBytes = readFirst(response, toQueryId);
        const feePoolBytes = readFirst(response, feeQueryId);

        const [fromRaw, fromErr] = Unmarshal(fromBytes || new Uint8Array(), types.Account);
        if (fromErr) {
            return { error: fromErr };
        }
        const [toRaw, toErr] = Unmarshal(toBytes || new Uint8Array(), types.Account);
        if (toErr) {
            return { error: toErr };
        }
        const [feePoolRaw, feePoolErr] = Unmarshal(feePoolBytes || new Uint8Array(), types.Pool);
        if (feePoolErr) {
            return { error: feePoolErr };
        }

        const from = fromRaw as any;
        const to = toRaw as any;
        const feePool = feePoolRaw as any;
        const msgAmount = toLong(msg.amount);
        const feeAmount = toLong(fee);
        const amountToDeduct = msgAmount.add(feeAmount);
        const fromAmount = toLong(from?.amount);

        if (fromAmount.lessThan(amountToDeduct)) {
            return { error: ErrInsufficientFunds() };
        }

        const isSelfTransfer = Buffer.from(fromKey).equals(Buffer.from(toKey));
        const toAccount = isSelfTransfer ? from : to;
        const newFromAmount = fromAmount.subtract(amountToDeduct);
        const newToAmount = toLong(toAccount?.amount).add(msgAmount);
        const newPoolAmount = toLong(feePool?.amount).add(feeAmount);

        const updatedFrom = types.Account.create({ address: from?.address, amount: newFromAmount });
        const updatedTo = types.Account.create({
            address: toAccount?.address || msg.toAddress,
            amount: newToAmount
        });
        const updatedPool = types.Pool.create({
            id: feePool?.id || Long.fromNumber(contract.Config.ChainId),
            amount: newPoolAmount
        });

        let writeResp: any;
        let writeErr: IPluginError | null;

        if (newFromAmount.isZero()) {
            [writeResp, writeErr] = await contract.plugin.StateWrite(contract, {
                sets: [
                    { key: feePoolKey, value: types.Pool.encode(updatedPool).finish() },
                    { key: toKey, value: types.Account.encode(updatedTo).finish() }
                ],
                deletes: [{ key: fromKey }]
            });
        } else {
            [writeResp, writeErr] = await contract.plugin.StateWrite(contract, {
                sets: [
                    { key: feePoolKey, value: types.Pool.encode(updatedPool).finish() },
                    { key: toKey, value: types.Account.encode(updatedTo).finish() },
                    { key: fromKey, value: types.Account.encode(updatedFrom).finish() }
                ]
            });
        }

        if (writeErr) {
            return { error: writeErr };
        }
        if (writeResp?.error) {
            return { error: writeResp.error };
        }
        return {};
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverMessageRegisterProfile(
        contract: Contract,
        msg: any,
        fee: Long | number | undefined,
        height: Long
    ): Promise<any> {
        const accountQueryId = randomQueryId();
        const profileQueryId = randomQueryId();
        const handleQueryId = randomQueryId();
        const feeQueryId = randomQueryId();

        const handle = normalizeHandle(msg.handle);
        const ownerKey = KeyForAccount(msg.ownerAddress);
        const profileKey = KeyForProfile(msg.ownerAddress);
        const handleKey = KeyForHandle(handle);
        const feePoolKey = KeyForFeePool(Long.fromNumber(contract.Config.ChainId));

        const [response, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: accountQueryId, key: ownerKey },
                { queryId: profileQueryId, key: profileKey },
                { queryId: handleQueryId, key: handleKey },
                { queryId: feeQueryId, key: feePoolKey }
            ]
        });

        if (readErr) {
            return { error: readErr };
        }
        if (response?.error) {
            return { error: response.error };
        }

        const accountBytes = readFirst(response, accountQueryId);
        const profileBytes = readFirst(response, profileQueryId);
        const handleOwnerBytes = readFirst(response, handleQueryId);
        const feePoolBytes = readFirst(response, feeQueryId);

        if (handleOwnerBytes && !sameBytes(handleOwnerBytes, profileKey)) {
            return { error: ErrHandleTaken() };
        }

        const [accountRaw, accountErr] = Unmarshal(accountBytes || new Uint8Array(), types.Account);
        if (accountErr) {
            return { error: accountErr };
        }
        const [profileRaw, profileErr] = Unmarshal(
            profileBytes || new Uint8Array(),
            types.SocialProfile
        );
        if (profileErr) {
            return { error: profileErr };
        }
        const [feePoolRaw, feePoolErr] = Unmarshal(feePoolBytes || new Uint8Array(), types.Pool);
        if (feePoolErr) {
            return { error: feePoolErr };
        }

        const account = accountRaw as any;
        const existingProfile = profileRaw as any;
        const feePool = feePoolRaw as any;
        const feeAmount = toLong(fee);
        const ownerAmount = toLong(account?.amount);
        if (ownerAmount.lessThan(feeAmount)) {
            return { error: ErrInsufficientFunds() };
        }

        const updatedOwnerAmount = ownerAmount.subtract(feeAmount);
        const updatedPool = types.Pool.create({
            id: feePool?.id || Long.fromNumber(contract.Config.ChainId),
            amount: toLong(feePool?.amount).add(feeAmount)
        });
        const profile = types.SocialProfile.create({
            ownerAddress: msg.ownerAddress,
            handle,
            bio: msg.bio || '',
            vibeScore: toLong(existingProfile?.vibeScore),
            vibesGiven: toLong(existingProfile?.vibesGiven),
            vibesReceived: toLong(existingProfile?.vibesReceived),
            createdHeight: existingProfile?.createdHeight || height,
            updatedHeight: height
        });
        const updatedOwner = types.Account.create({
            address: account?.address || msg.ownerAddress,
            amount: updatedOwnerAmount
        });

        const deletes = [];
        const oldHandle = normalizeHandle(existingProfile?.handle);
        if (oldHandle && oldHandle !== handle) {
            deletes.push({ key: KeyForHandle(oldHandle) });
        }
        if (updatedOwnerAmount.isZero()) {
            deletes.push({ key: ownerKey });
        }

        const sets = [
            { key: feePoolKey, value: types.Pool.encode(updatedPool).finish() },
            { key: profileKey, value: types.SocialProfile.encode(profile).finish() },
            { key: handleKey, value: profileKey }
        ];
        if (!updatedOwnerAmount.isZero()) {
            sets.push({ key: ownerKey, value: types.Account.encode(updatedOwner).finish() });
        }

        const [writeResp, writeErr] = await contract.plugin.StateWrite(contract, { sets, deletes });
        if (writeErr) {
            return { error: writeErr };
        }
        if (writeResp?.error) {
            return { error: writeResp.error };
        }
        return {};
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverMessageGiveVibe(
        contract: Contract,
        msg: any,
        fee: Long | number | undefined,
        height: Long
    ): Promise<any> {
        const fromAccountQueryId = randomQueryId();
        const fromProfileQueryId = randomQueryId();
        const toProfileQueryId = randomQueryId();
        const counterQueryId = randomQueryId();
        const feeQueryId = randomQueryId();

        const fromAccountKey = KeyForAccount(msg.fromAddress);
        const fromProfileKey = KeyForProfile(msg.fromAddress);
        const toProfileKey = KeyForProfile(msg.toAddress);
        const counterKey = KeyForVibeCounter();
        const feePoolKey = KeyForFeePool(Long.fromNumber(contract.Config.ChainId));

        const [response, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: fromAccountQueryId, key: fromAccountKey },
                { queryId: fromProfileQueryId, key: fromProfileKey },
                { queryId: toProfileQueryId, key: toProfileKey },
                { queryId: counterQueryId, key: counterKey },
                { queryId: feeQueryId, key: feePoolKey }
            ]
        });

        if (readErr) {
            return { error: readErr };
        }
        if (response?.error) {
            return { error: response.error };
        }

        const fromAccountBytes = readFirst(response, fromAccountQueryId);
        const fromProfileBytes = readFirst(response, fromProfileQueryId);
        const toProfileBytes = readFirst(response, toProfileQueryId);
        const counterBytes = readFirst(response, counterQueryId);
        const feePoolBytes = readFirst(response, feeQueryId);

        if (!fromProfileBytes || !toProfileBytes) {
            return { error: ErrProfileRequired() };
        }

        const [fromAccountRaw, accountErr] = Unmarshal(
            fromAccountBytes || new Uint8Array(),
            types.Account
        );
        if (accountErr) {
            return { error: accountErr };
        }
        const [fromProfileRaw, fromProfileErr] = Unmarshal(
            fromProfileBytes,
            types.SocialProfile
        );
        if (fromProfileErr) {
            return { error: fromProfileErr };
        }
        const [toProfileRaw, toProfileErr] = Unmarshal(toProfileBytes, types.SocialProfile);
        if (toProfileErr) {
            return { error: toProfileErr };
        }
        const [counterRaw, counterErr] = Unmarshal(counterBytes || new Uint8Array(), types.VibeCounter);
        if (counterErr) {
            return { error: counterErr };
        }
        const [feePoolRaw, feePoolErr] = Unmarshal(feePoolBytes || new Uint8Array(), types.Pool);
        if (feePoolErr) {
            return { error: feePoolErr };
        }

        const fromAccount = fromAccountRaw as any;
        const fromProfile = fromProfileRaw as any;
        const toProfile = toProfileRaw as any;
        const counter = counterRaw as any;
        const feePool = feePoolRaw as any;
        const feeAmount = toLong(fee);
        const fromAmount = toLong(fromAccount?.amount);
        if (fromAmount.lessThan(feeAmount)) {
            return { error: ErrInsufficientFunds() };
        }

        const vibeAmount = toLong(msg.amount);
        const nextId = toLong(counter?.nextId);
        const attestationId = nextId.isZero() ? Long.ONE : nextId;
        const followingId = attestationId.add(Long.ONE);
        const updatedFromAmount = fromAmount.subtract(feeAmount);

        const updatedFromProfile = types.SocialProfile.create({
            ownerAddress: fromProfile.ownerAddress,
            handle: fromProfile.handle,
            bio: fromProfile.bio,
            vibeScore: toLong(fromProfile.vibeScore),
            vibesGiven: toLong(fromProfile.vibesGiven).add(vibeAmount),
            vibesReceived: toLong(fromProfile.vibesReceived),
            createdHeight: fromProfile.createdHeight,
            updatedHeight: height
        });
        const updatedToProfile = types.SocialProfile.create({
            ownerAddress: toProfile.ownerAddress,
            handle: toProfile.handle,
            bio: toProfile.bio,
            vibeScore: toLong(toProfile.vibeScore).add(vibeAmount),
            vibesGiven: toLong(toProfile.vibesGiven),
            vibesReceived: toLong(toProfile.vibesReceived).add(vibeAmount),
            createdHeight: toProfile.createdHeight,
            updatedHeight: height
        });
        const attestation = types.VibeAttestation.create({
            id: attestationId,
            fromAddress: msg.fromAddress,
            toAddress: msg.toAddress,
            amount: vibeAmount,
            tag: normalizeTag(msg.tag),
            note: msg.note || '',
            height
        });
        const updatedCounter = types.VibeCounter.create({ nextId: followingId });
        const updatedPool = types.Pool.create({
            id: feePool?.id || Long.fromNumber(contract.Config.ChainId),
            amount: toLong(feePool?.amount).add(feeAmount)
        });
        const updatedFromAccount = types.Account.create({
            address: fromAccount?.address || msg.fromAddress,
            amount: updatedFromAmount
        });

        const sets = [
            { key: feePoolKey, value: types.Pool.encode(updatedPool).finish() },
            { key: fromProfileKey, value: types.SocialProfile.encode(updatedFromProfile).finish() },
            { key: toProfileKey, value: types.SocialProfile.encode(updatedToProfile).finish() },
            { key: counterKey, value: types.VibeCounter.encode(updatedCounter).finish() },
            { key: KeyForVibe(attestationId), value: types.VibeAttestation.encode(attestation).finish() }
        ];
        const deletes = [];
        if (updatedFromAmount.isZero()) {
            deletes.push({ key: fromAccountKey });
        } else {
            sets.push({
                key: fromAccountKey,
                value: types.Account.encode(updatedFromAccount).finish()
            });
        }

        const [writeResp, writeErr] = await contract.plugin.StateWrite(contract, { sets, deletes });
        if (writeErr) {
            return { error: writeErr };
        }
        if (writeResp?.error) {
            return { error: writeResp.error };
        }
        return {};
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverMessageCreateGuild(
        contract: Contract,
        msg: any,
        fee: Long | number | undefined,
        height: Long
    ): Promise<any> {
        const profileQueryId = randomQueryId();
        const slugQueryId = randomQueryId();
        const counterQueryId = randomQueryId();
        const slug = normalizeSlug(msg.slug);

        const [response, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: profileQueryId, key: KeyForProfile(msg.creatorAddress) },
                { queryId: slugQueryId, key: KeyForGuildSlug(slug) },
                { queryId: counterQueryId, key: KeyForGuildCounter() }
            ]
        });
        if (readErr) {
            return { error: readErr };
        }
        if (response?.error) {
            return { error: response.error };
        }
        if (!readFirst(response, profileQueryId)) {
            return { error: ErrProfileRequired() };
        }
        if (readFirst(response, slugQueryId)) {
            return { error: ErrSlugTaken() };
        }

        const [counterRaw, counterErr] = Unmarshal(
            readFirst(response, counterQueryId) || new Uint8Array(),
            types.GuildCounter
        );
        if (counterErr) {
            return { error: counterErr };
        }
        const counter = counterRaw as any;
        const guildId = nextCounterId(counter?.nextId);
        const guildKey = KeyForGuild(guildId);
        const guild = types.Guild.create({
            id: guildId,
            creatorAddress: msg.creatorAddress,
            slug,
            name: msg.name,
            description: msg.description || '',
            memberCount: Long.ONE,
            totalReputation: Long.ZERO,
            createdHeight: height
        });

        return ContractAsync.WriteWithFee(contract, msg.creatorAddress, fee, [
            { key: guildKey, value: types.Guild.encode(guild).finish() },
            { key: KeyForGuildSlug(slug), value: guildKey },
            {
                key: KeyForGuildCounter(),
                value: types.GuildCounter.encode(types.GuildCounter.create({ nextId: guildId.add(Long.ONE) })).finish()
            }
        ]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverMessagePostQuest(
        contract: Contract,
        msg: any,
        fee: Long | number | undefined,
        height: Long
    ): Promise<any> {
        const guildQueryId = randomQueryId();
        const profileQueryId = randomQueryId();
        const counterQueryId = randomQueryId();
        const guildId = toLong(msg.guildId);

        const [response, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: guildQueryId, key: KeyForGuild(guildId) },
                { queryId: profileQueryId, key: KeyForProfile(msg.creatorAddress) },
                { queryId: counterQueryId, key: KeyForQuestCounter() }
            ]
        });
        if (readErr) {
            return { error: readErr };
        }
        if (response?.error) {
            return { error: response.error };
        }
        if (!readFirst(response, guildQueryId)) {
            return { error: ErrGuildRequired() };
        }
        if (!readFirst(response, profileQueryId)) {
            return { error: ErrProfileRequired() };
        }

        const [counterRaw, counterErr] = Unmarshal(
            readFirst(response, counterQueryId) || new Uint8Array(),
            types.QuestCounter
        );
        if (counterErr) {
            return { error: counterErr };
        }
        const questId = nextCounterId((counterRaw as any)?.nextId);
        const quest = types.Quest.create({
            id: questId,
            guildId,
            creatorAddress: msg.creatorAddress,
            title: msg.title,
            tag: normalizeTag(msg.tag),
            rewardRep: toLong(msg.rewardRep),
            open: true,
            createdHeight: height
        });

        return ContractAsync.WriteWithFee(contract, msg.creatorAddress, fee, [
            { key: KeyForQuest(questId), value: types.Quest.encode(quest).finish() },
            {
                key: KeyForQuestCounter(),
                value: types.QuestCounter.encode(types.QuestCounter.create({ nextId: questId.add(Long.ONE) })).finish()
            }
        ]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverMessageSubmitProof(
        contract: Contract,
        msg: any,
        fee: Long | number | undefined,
        height: Long
    ): Promise<any> {
        const profileQueryId = randomQueryId();
        const guildQueryId = randomQueryId();
        const questQueryId = randomQueryId();
        const counterQueryId = randomQueryId();
        const guildId = toLong(msg.guildId);
        const questId = toLong(msg.questId);

        const [response, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: profileQueryId, key: KeyForProfile(msg.contributorAddress) },
                { queryId: guildQueryId, key: KeyForGuild(guildId) },
                { queryId: questQueryId, key: KeyForQuest(questId) },
                { queryId: counterQueryId, key: KeyForProofCounter() }
            ]
        });
        if (readErr) {
            return { error: readErr };
        }
        if (response?.error) {
            return { error: response.error };
        }
        if (!readFirst(response, profileQueryId)) {
            return { error: ErrProfileRequired() };
        }
        if (!readFirst(response, guildQueryId)) {
            return { error: ErrGuildRequired() };
        }
        if (!readFirst(response, questQueryId)) {
            return { error: ErrQuestRequired() };
        }

        const [counterRaw, counterErr] = Unmarshal(
            readFirst(response, counterQueryId) || new Uint8Array(),
            types.ProofCounter
        );
        if (counterErr) {
            return { error: counterErr };
        }
        const proofId = nextCounterId((counterRaw as any)?.nextId);
        const proof = types.ContributionProof.create({
            id: proofId,
            guildId,
            questId,
            contributorAddress: msg.contributorAddress,
            proofURI: msg.proofURI || msg.proofUri || '',
            note: msg.note || '',
            status: 'submitted',
            createdHeight: height,
            reviewedHeight: Long.ZERO
        });

        return ContractAsync.WriteWithFee(contract, msg.contributorAddress, fee, [
            { key: KeyForProof(proofId), value: types.ContributionProof.encode(proof).finish() },
            {
                key: KeyForProofCounter(),
                value: types.ProofCounter.encode(types.ProofCounter.create({ nextId: proofId.add(Long.ONE) })).finish()
            }
        ]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverMessageAttestContribution(
        contract: Contract,
        msg: any,
        fee: Long | number | undefined,
        height: Long
    ): Promise<any> {
        const reviewerProfileQueryId = randomQueryId();
        const proofQueryId = randomQueryId();
        const contributorProfileQueryId = randomQueryId();
        const guildQueryId = randomQueryId();
        const vibeCounterQueryId = randomQueryId();
        const proofId = toLong(msg.proofId);

        const [proofResponse, proofReadErr] = await contract.plugin.StateRead(contract, {
            keys: [{ queryId: proofQueryId, key: KeyForProof(proofId) }]
        });
        if (proofReadErr) {
            return { error: proofReadErr };
        }
        if (proofResponse?.error) {
            return { error: proofResponse.error };
        }
        const proofBytes = readFirst(proofResponse, proofQueryId);
        if (!proofBytes) {
            return { error: ErrProofRequired() };
        }
        const [proofRaw, proofErr] = Unmarshal(proofBytes, types.ContributionProof);
        if (proofErr) {
            return { error: proofErr };
        }
        const proof = proofRaw as any;
        if (proof.status && proof.status !== 'submitted') {
            return { error: ErrAlreadyReviewed() };
        }

        const [response, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: reviewerProfileQueryId, key: KeyForProfile(msg.reviewerAddress) },
                { queryId: contributorProfileQueryId, key: KeyForProfile(proof.contributorAddress) },
                { queryId: guildQueryId, key: KeyForGuild(toLong(proof.guildId)) },
                { queryId: vibeCounterQueryId, key: KeyForVibeCounter() }
            ]
        });
        if (readErr) {
            return { error: readErr };
        }
        if (response?.error) {
            return { error: response.error };
        }
        const reviewerBytes = readFirst(response, reviewerProfileQueryId);
        const contributorBytes = readFirst(response, contributorProfileQueryId);
        const guildBytes = readFirst(response, guildQueryId);
        if (!reviewerBytes || !contributorBytes) {
            return { error: ErrProfileRequired() };
        }
        if (!guildBytes) {
            return { error: ErrGuildRequired() };
        }

        const [reviewerProfileRaw, reviewerErr] = Unmarshal(reviewerBytes, types.SocialProfile);
        const [contributorProfileRaw, contributorErr] = Unmarshal(contributorBytes, types.SocialProfile);
        const [guildRaw, guildErr] = Unmarshal(guildBytes, types.Guild);
        const [counterRaw, counterErr] = Unmarshal(
            readFirst(response, vibeCounterQueryId) || new Uint8Array(),
            types.VibeCounter
        );
        if (reviewerErr || contributorErr || guildErr || counterErr) {
            return { error: reviewerErr || contributorErr || guildErr || counterErr };
        }

        const amount = toLong(msg.amount);
        const reviewer = reviewerProfileRaw as any;
        const contributor = contributorProfileRaw as any;
        const guild = guildRaw as any;
        const attestationId = nextCounterId((counterRaw as any)?.nextId);
        const updatedProof = types.ContributionProof.create({
            ...proof,
            status: 'approved',
            reviewedHeight: height
        });
        const updatedReviewer = types.SocialProfile.create({
            ...reviewer,
            vibesGiven: toLong(reviewer.vibesGiven).add(amount),
            updatedHeight: height
        });
        const updatedContributor = types.SocialProfile.create({
            ...contributor,
            vibeScore: toLong(contributor.vibeScore).add(amount),
            vibesReceived: toLong(contributor.vibesReceived).add(amount),
            updatedHeight: height
        });
        const updatedGuild = types.Guild.create({
            ...guild,
            totalReputation: toLong(guild.totalReputation).add(amount)
        });
        const attestation = types.VibeAttestation.create({
            id: attestationId,
            fromAddress: msg.reviewerAddress,
            toAddress: proof.contributorAddress,
            amount,
            tag: 'proof',
            note: msg.note || '',
            height
        });

        return ContractAsync.WriteWithFee(contract, msg.reviewerAddress, fee, [
            { key: KeyForProof(proofId), value: types.ContributionProof.encode(updatedProof).finish() },
            { key: KeyForProfile(msg.reviewerAddress), value: types.SocialProfile.encode(updatedReviewer).finish() },
            { key: KeyForProfile(proof.contributorAddress), value: types.SocialProfile.encode(updatedContributor).finish() },
            { key: KeyForGuild(toLong(proof.guildId)), value: types.Guild.encode(updatedGuild).finish() },
            { key: KeyForVibe(attestationId), value: types.VibeAttestation.encode(attestation).finish() },
            {
                key: KeyForVibeCounter(),
                value: types.VibeCounter.encode(types.VibeCounter.create({ nextId: attestationId.add(Long.ONE) })).finish()
            }
        ]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverMessageIssueBadge(
        contract: Contract,
        msg: any,
        fee: Long | number | undefined,
        height: Long
    ): Promise<any> {
        const issuerProfileQueryId = randomQueryId();
        const toProfileQueryId = randomQueryId();
        const guildQueryId = randomQueryId();
        const counterQueryId = randomQueryId();
        const guildId = toLong(msg.guildId);

        const [response, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: issuerProfileQueryId, key: KeyForProfile(msg.issuerAddress) },
                { queryId: toProfileQueryId, key: KeyForProfile(msg.toAddress) },
                { queryId: guildQueryId, key: KeyForGuild(guildId) },
                { queryId: counterQueryId, key: KeyForBadgeCounter() }
            ]
        });
        if (readErr) {
            return { error: readErr };
        }
        if (response?.error) {
            return { error: response.error };
        }
        if (!readFirst(response, issuerProfileQueryId) || !readFirst(response, toProfileQueryId)) {
            return { error: ErrProfileRequired() };
        }
        if (!readFirst(response, guildQueryId)) {
            return { error: ErrGuildRequired() };
        }

        const [counterRaw, counterErr] = Unmarshal(
            readFirst(response, counterQueryId) || new Uint8Array(),
            types.BadgeCounter
        );
        if (counterErr) {
            return { error: counterErr };
        }
        const badgeId = nextCounterId((counterRaw as any)?.nextId);
        const badgeName = normalizeBadge(msg.badgeName);
        const badgeKey = KeyForBadge(badgeId);
        const badge = types.GuildBadge.create({
            id: badgeId,
            guildId,
            issuerAddress: msg.issuerAddress,
            toAddress: msg.toAddress,
            badgeName,
            badgeURI: msg.badgeURI || msg.badgeUri || '',
            issuedHeight: height
        });

        return ContractAsync.WriteWithFee(contract, msg.issuerAddress, fee, [
            { key: badgeKey, value: types.GuildBadge.encode(badge).finish() },
            { key: KeyForBadgeByOwnerName(msg.toAddress, guildId, badgeName), value: badgeKey },
            {
                key: KeyForBadgeCounter(),
                value: types.BadgeCounter.encode(types.BadgeCounter.create({ nextId: badgeId.add(Long.ONE) })).finish()
            }
        ]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverMessageCreateGate(
        contract: Contract,
        msg: any,
        fee: Long | number | undefined,
        height: Long
    ): Promise<any> {
        const creatorProfileQueryId = randomQueryId();
        const guildQueryId = randomQueryId();
        const counterQueryId = randomQueryId();
        const guildId = toLong(msg.guildId);

        const [response, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: creatorProfileQueryId, key: KeyForProfile(msg.creatorAddress) },
                { queryId: guildQueryId, key: KeyForGuild(guildId) },
                { queryId: counterQueryId, key: KeyForGateCounter() }
            ]
        });
        if (readErr) {
            return { error: readErr };
        }
        if (response?.error) {
            return { error: response.error };
        }
        if (!readFirst(response, creatorProfileQueryId)) {
            return { error: ErrProfileRequired() };
        }
        if (!readFirst(response, guildQueryId)) {
            return { error: ErrGuildRequired() };
        }

        const [counterRaw, counterErr] = Unmarshal(
            readFirst(response, counterQueryId) || new Uint8Array(),
            types.GateCounter
        );
        if (counterErr) {
            return { error: counterErr };
        }
        const gateId = nextCounterId((counterRaw as any)?.nextId);
        const gate = types.AccessGate.create({
            id: gateId,
            guildId,
            gateName: msg.gateName,
            requiredRep: toLong(msg.requiredRep),
            requiredBadge: normalizeBadge(msg.requiredBadge),
            createdHeight: height
        });

        return ContractAsync.WriteWithFee(contract, msg.creatorAddress, fee, [
            { key: KeyForGate(gateId), value: types.AccessGate.encode(gate).finish() },
            {
                key: KeyForGateCounter(),
                value: types.GateCounter.encode(types.GateCounter.create({ nextId: gateId.add(Long.ONE) })).finish()
            }
        ]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverMessageCheckGateAccess(
        contract: Contract,
        msg: any,
        fee: Long | number | undefined,
        height: Long
    ): Promise<any> {
        const gateQueryId = randomQueryId();
        const profileQueryId = randomQueryId();
        const badgeQueryId = randomQueryId();
        const counterQueryId = randomQueryId();
        const gateId = toLong(msg.gateId);

        const [gateResponse, gateReadErr] = await contract.plugin.StateRead(contract, {
            keys: [{ queryId: gateQueryId, key: KeyForGate(gateId) }]
        });
        if (gateReadErr) {
            return { error: gateReadErr };
        }
        if (gateResponse?.error) {
            return { error: gateResponse.error };
        }
        const gateBytes = readFirst(gateResponse, gateQueryId);
        if (!gateBytes) {
            return { error: ErrGateRequired() };
        }
        const [gateRaw, gateErr] = Unmarshal(gateBytes, types.AccessGate);
        if (gateErr) {
            return { error: gateErr };
        }
        const gate = gateRaw as any;
        const requiredBadge = normalizeBadge(gate.requiredBadge);

        const keys = [
            { queryId: profileQueryId, key: KeyForProfile(msg.visitorAddress) },
            { queryId: counterQueryId, key: KeyForGateAccessCounter() }
        ];
        if (requiredBadge) {
            keys.push({
                queryId: badgeQueryId,
                key: KeyForBadgeByOwnerName(msg.visitorAddress, toLong(gate.guildId), requiredBadge)
            });
        }

        const [response, readErr] = await contract.plugin.StateRead(contract, { keys });
        if (readErr) {
            return { error: readErr };
        }
        if (response?.error) {
            return { error: response.error };
        }
        const profileBytes = readFirst(response, profileQueryId);
        if (!profileBytes) {
            return { error: ErrProfileRequired() };
        }
        const [profileRaw, profileErr] = Unmarshal(profileBytes, types.SocialProfile);
        const [counterRaw, counterErr] = Unmarshal(
            readFirst(response, counterQueryId) || new Uint8Array(),
            types.GateAccessCounter
        );
        if (profileErr || counterErr) {
            return { error: profileErr || counterErr };
        }
        const profile = profileRaw as any;
        const hasBadge = !requiredBadge || !!readFirst(response, badgeQueryId);
        const passed = toLong(profile.vibeScore).greaterThanOrEqual(toLong(gate.requiredRep)) && hasBadge;
        const accessId = nextCounterId((counterRaw as any)?.nextId);
        const access = types.GateAccess.create({
            id: accessId,
            gateId,
            visitorAddress: msg.visitorAddress,
            passed,
            checkedHeight: height
        });

        return ContractAsync.WriteWithFee(contract, msg.visitorAddress, fee, [
            { key: KeyForGateAccess(accessId), value: types.GateAccess.encode(access).finish() },
            {
                key: KeyForGateAccessCounter(),
                value: types.GateAccessCounter.encode(
                    types.GateAccessCounter.create({ nextId: accessId.add(Long.ONE) })
                ).finish()
            }
        ]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async DeliverMessageCastReputationVote(
        contract: Contract,
        msg: any,
        fee: Long | number | undefined,
        height: Long
    ): Promise<any> {
        const profileQueryId = randomQueryId();
        const guildQueryId = randomQueryId();
        const voteRecordQueryId = randomQueryId();
        const counterQueryId = randomQueryId();
        const guildId = toLong(msg.guildId);
        const proposalId = normalizeProposal(msg.proposalId);

        const [response, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: profileQueryId, key: KeyForProfile(msg.voterAddress) },
                { queryId: guildQueryId, key: KeyForGuild(guildId) },
                { queryId: voteRecordQueryId, key: KeyForVoteRecord(guildId, proposalId, msg.voterAddress) },
                { queryId: counterQueryId, key: KeyForVoteCounter() }
            ]
        });
        if (readErr) {
            return { error: readErr };
        }
        if (response?.error) {
            return { error: response.error };
        }
        const profileBytes = readFirst(response, profileQueryId);
        if (!profileBytes) {
            return { error: ErrProfileRequired() };
        }
        if (!readFirst(response, guildQueryId)) {
            return { error: ErrGuildRequired() };
        }
        if (readFirst(response, voteRecordQueryId)) {
            return { error: ErrAlreadyReviewed() };
        }
        const [profileRaw, profileErr] = Unmarshal(profileBytes, types.SocialProfile);
        const [counterRaw, counterErr] = Unmarshal(
            readFirst(response, counterQueryId) || new Uint8Array(),
            types.VoteCounter
        );
        if (profileErr || counterErr) {
            return { error: profileErr || counterErr };
        }
        const voteId = nextCounterId((counterRaw as any)?.nextId);
        const weight = toLong((profileRaw as any).vibeScore);
        const voteKey = KeyForVote(voteId);
        const vote = types.ReputationVote.create({
            id: voteId,
            guildId,
            proposalId,
            voterAddress: msg.voterAddress,
            choice: normalizeChoice(msg.choice),
            weight,
            height
        });

        return ContractAsync.WriteWithFee(contract, msg.voterAddress, fee, [
            { key: voteKey, value: types.ReputationVote.encode(vote).finish() },
            { key: KeyForVoteRecord(guildId, proposalId, msg.voterAddress), value: voteKey },
            {
                key: KeyForVoteCounter(),
                value: types.VoteCounter.encode(types.VoteCounter.create({ nextId: voteId.add(Long.ONE) })).finish()
            }
        ]);
    }

    static async WriteWithFee(
        contract: Contract,
        payerAddress: Uint8Array,
        fee: Long | number | undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sets: any[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deletes: any[] = []
    ): Promise<any> {
        const accountQueryId = randomQueryId();
        const feeQueryId = randomQueryId();
        const accountKey = KeyForAccount(payerAddress);
        const feePoolKey = KeyForFeePool(Long.fromNumber(contract.Config.ChainId));

        const [response, readErr] = await contract.plugin.StateRead(contract, {
            keys: [
                { queryId: accountQueryId, key: accountKey },
                { queryId: feeQueryId, key: feePoolKey }
            ]
        });
        if (readErr) {
            return { error: readErr };
        }
        if (response?.error) {
            return { error: response.error };
        }

        const [accountRaw, accountErr] = Unmarshal(
            readFirst(response, accountQueryId) || new Uint8Array(),
            types.Account
        );
        const [feePoolRaw, feePoolErr] = Unmarshal(
            readFirst(response, feeQueryId) || new Uint8Array(),
            types.Pool
        );
        if (accountErr || feePoolErr) {
            return { error: accountErr || feePoolErr };
        }

        const feeAmount = toLong(fee);
        const account = accountRaw as any;
        const payerAmount = toLong(account?.amount);
        if (payerAmount.lessThan(feeAmount)) {
            return { error: ErrInsufficientFunds() };
        }

        const updatedPayerAmount = payerAmount.subtract(feeAmount);
        const updatedPool = types.Pool.create({
            id: (feePoolRaw as any)?.id || Long.fromNumber(contract.Config.ChainId),
            amount: toLong((feePoolRaw as any)?.amount).add(feeAmount)
        });
        sets.push({ key: feePoolKey, value: types.Pool.encode(updatedPool).finish() });
        if (updatedPayerAmount.isZero()) {
            deletes.push({ key: accountKey });
        } else {
            sets.push({
                key: accountKey,
                value: types.Account.encode(
                    types.Account.create({
                        address: account?.address || payerAddress,
                        amount: updatedPayerAmount
                    })
                ).finish()
            });
        }

        const [writeResp, writeErr] = await contract.plugin.StateWrite(contract, { sets, deletes });
        if (writeErr) {
            return { error: writeErr };
        }
        if (writeResp?.error) {
            return { error: writeResp.error };
        }
        return {};
    }
}

const accountPrefix = Buffer.from([1]);
const poolPrefix = Buffer.from([2]);
const paramsPrefix = Buffer.from([7]);
const profilePrefix = Buffer.from([16]);
const handlePrefix = Buffer.from([17]);
const vibePrefix = Buffer.from([18]);
const socialCounterPrefix = Buffer.from([19]);
const guildPrefix = Buffer.from([20]);
const guildSlugPrefix = Buffer.from([21]);
const guildCounterPrefix = Buffer.from([22]);
const questPrefix = Buffer.from([23]);
const questCounterPrefix = Buffer.from([24]);
const proofPrefix = Buffer.from([25]);
const proofCounterPrefix = Buffer.from([26]);
const badgePrefix = Buffer.from([27]);
const badgeOwnerPrefix = Buffer.from([28]);
const badgeCounterPrefix = Buffer.from([29]);
const gatePrefix = Buffer.from([30]);
const gateCounterPrefix = Buffer.from([31]);
const gateAccessPrefix = Buffer.from([32]);
const gateAccessCounterPrefix = Buffer.from([33]);
const votePrefix = Buffer.from([34]);
const voteRecordPrefix = Buffer.from([35]);
const voteCounterPrefix = Buffer.from([36]);

export function KeyForAccount(addr: Uint8Array): Uint8Array {
    return JoinLenPrefix(accountPrefix, Buffer.from(addr));
}

export function KeyForFeeParams(): Uint8Array {
    return JoinLenPrefix(paramsPrefix, Buffer.from('/f/'));
}

export function KeyForFeePool(chainId: Long): Uint8Array {
    return JoinLenPrefix(poolPrefix, formatUint64(chainId));
}

export function KeyForProfile(addr: Uint8Array): Uint8Array {
    return JoinLenPrefix(profilePrefix, Buffer.from(addr));
}

export function KeyForHandle(handle: string): Uint8Array {
    return JoinLenPrefix(handlePrefix, Buffer.from(normalizeHandle(handle)));
}

export function KeyForVibe(id: Long): Uint8Array {
    return JoinLenPrefix(vibePrefix, formatUint64(id));
}

export function KeyForVibeCounter(): Uint8Array {
    return JoinLenPrefix(socialCounterPrefix, Buffer.from('/next-vibe/'));
}

export function KeyForGuild(id: Long): Uint8Array {
    return JoinLenPrefix(guildPrefix, formatUint64(id));
}

export function KeyForGuildSlug(slug: string): Uint8Array {
    return JoinLenPrefix(guildSlugPrefix, Buffer.from(normalizeSlug(slug)));
}

export function KeyForGuildCounter(): Uint8Array {
    return JoinLenPrefix(guildCounterPrefix, Buffer.from('/next-guild/'));
}

export function KeyForQuest(id: Long): Uint8Array {
    return JoinLenPrefix(questPrefix, formatUint64(id));
}

export function KeyForQuestCounter(): Uint8Array {
    return JoinLenPrefix(questCounterPrefix, Buffer.from('/next-quest/'));
}

export function KeyForProof(id: Long): Uint8Array {
    return JoinLenPrefix(proofPrefix, formatUint64(id));
}

export function KeyForProofCounter(): Uint8Array {
    return JoinLenPrefix(proofCounterPrefix, Buffer.from('/next-proof/'));
}

export function KeyForBadge(id: Long): Uint8Array {
    return JoinLenPrefix(badgePrefix, formatUint64(id));
}

export function KeyForBadgeByOwnerName(addr: Uint8Array, guildId: Long, badgeName: string): Uint8Array {
    return JoinLenPrefix(
        badgeOwnerPrefix,
        Buffer.concat([Buffer.from(addr), formatUint64(guildId), Buffer.from(normalizeBadge(badgeName))])
    );
}

export function KeyForBadgeCounter(): Uint8Array {
    return JoinLenPrefix(badgeCounterPrefix, Buffer.from('/next-badge/'));
}

export function KeyForGate(id: Long): Uint8Array {
    return JoinLenPrefix(gatePrefix, formatUint64(id));
}

export function KeyForGateCounter(): Uint8Array {
    return JoinLenPrefix(gateCounterPrefix, Buffer.from('/next-gate/'));
}

export function KeyForGateAccess(id: Long): Uint8Array {
    return JoinLenPrefix(gateAccessPrefix, formatUint64(id));
}

export function KeyForGateAccessCounter(): Uint8Array {
    return JoinLenPrefix(gateAccessCounterPrefix, Buffer.from('/next-gate-access/'));
}

export function KeyForVote(id: Long): Uint8Array {
    return JoinLenPrefix(votePrefix, formatUint64(id));
}

export function KeyForVoteRecord(guildId: Long, proposalId: string, voter: Uint8Array): Uint8Array {
    return JoinLenPrefix(
        voteRecordPrefix,
        Buffer.concat([formatUint64(guildId), Buffer.from(normalizeProposal(proposalId)), Buffer.from(voter)])
    );
}

export function KeyForVoteCounter(): Uint8Array {
    return JoinLenPrefix(voteCounterPrefix, Buffer.from('/next-vote/'));
}

function formatUint64(u: Long): Buffer {
    const b = Buffer.alloc(8);
    b.writeBigUInt64BE(BigInt(u.toString()));
    return b;
}

function randomQueryId(): Long {
    return Long.fromNumber(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
}

function toLong(value: Long | number | string | undefined | null): Long {
    if (Long.isLong(value)) {
        return value;
    }
    if (typeof value === 'string') {
        return Long.fromString(value, true);
    }
    return Long.fromNumber(value || 0, true);
}

function isZeroAmount(value: Long | number | undefined): boolean {
    return toLong(value).isZero();
}

function isAddress(value: Uint8Array | undefined): boolean {
    return !!value && value.length === 20;
}

function sameBytes(left: Uint8Array | undefined | null, right: Uint8Array | undefined | null): boolean {
    if (!left || !right) {
        return false;
    }
    return Buffer.from(left).equals(Buffer.from(right));
}

function normalizeHandle(handle: string | undefined | null): string {
    return (handle || '').trim().toLowerCase();
}

function normalizeTag(tag: string | undefined | null): string {
    return (tag || '').trim().toLowerCase();
}

function normalizeSlug(slug: string | undefined | null): string {
    return (slug || '').trim().toLowerCase();
}

function normalizeBadge(badge: string | undefined | null): string {
    return (badge || '').trim().toLowerCase();
}

function normalizeProposal(proposal: string | undefined | null): string {
    return (proposal || '').trim().toLowerCase();
}

function normalizeChoice(choice: string | undefined | null): string {
    return (choice || '').trim().toLowerCase();
}

function nextCounterId(value: Long | number | string | undefined | null): Long {
    const next = toLong(value);
    return next.isZero() ? Long.ONE : next;
}

function isValidHandle(handle: string | undefined): boolean {
    const normalized = normalizeHandle(handle);
    return /^[a-z0-9_]{3,24}$/.test(normalized);
}

function isValidBio(bio: string | undefined): boolean {
    return (bio || '').length <= 160;
}

function isValidTag(tag: string | undefined): boolean {
    const normalized = normalizeTag(tag);
    return /^[a-z0-9_ -]{1,24}$/.test(normalized);
}

function isOptionalTag(tag: string | undefined): boolean {
    return !tag || isValidTag(tag);
}

function isValidSlug(slug: string | undefined): boolean {
    return /^[a-z0-9-]{3,32}$/.test(normalizeSlug(slug));
}

function isValidTitle(value: string | undefined, min: number, max: number): boolean {
    const text = (value || '').trim();
    return text.length >= min && text.length <= max;
}

function isValidUri(value: string | undefined): boolean {
    const text = (value || '').trim();
    return text.length >= 6 && text.length <= 180;
}

function isValidNote(note: string | undefined): boolean {
    return (note || '').length <= 200;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readFirst(response: any, queryId: Long): Uint8Array | null {
    for (const result of response?.results || []) {
        const qid = result.queryId as Long;
        if (qid.equals(queryId)) {
            const value = result.entries?.[0]?.value as Uint8Array | undefined;
            return value && value.length > 0 ? value : null;
        }
    }
    return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function minimumFeeForMessage(msgType: string, feeParams: any): Long {
    switch (msgType) {
        case 'MessageRegisterProfile':
            return toLong(feeParams?.registerProfileFee);
        case 'MessageGiveVibe':
            return toLong(feeParams?.giveVibeFee);
        case 'MessageCreateGuild':
            return toLong(feeParams?.createGuildFee);
        case 'MessagePostQuest':
            return toLong(feeParams?.postQuestFee);
        case 'MessageSubmitProof':
            return toLong(feeParams?.submitProofFee);
        case 'MessageAttestContribution':
            return toLong(feeParams?.attestContributionFee);
        case 'MessageIssueBadge':
            return toLong(feeParams?.issueBadgeFee);
        case 'MessageCreateGate':
            return toLong(feeParams?.createGateFee);
        case 'MessageCheckGateAccess':
            return toLong(feeParams?.checkGateAccessFee);
        case 'MessageCastReputationVote':
            return toLong(feeParams?.castReputationVoteFee);
        case 'MessageSend':
        default:
            return toLong(feeParams?.sendFee);
    }
}
