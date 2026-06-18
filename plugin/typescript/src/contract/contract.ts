/* This file contains the VibeGraph Social-Fi contract implementation. */

import Long from 'long';

import { types } from '../proto/types.js';

import {
    IPluginError,
    ErrHandleTaken,
    ErrInsufficientFunds,
    ErrInvalidAddress,
    ErrInvalidAmount,
    ErrInvalidHandle,
    ErrInvalidMessageCast,
    ErrInvalidSocialText,
    ErrProfileRequired,
    ErrSelfVibe,
    ErrTxFeeBelowStateLimit
} from './error.js';

import type { Plugin, Config } from './plugin.js';
import { JoinLenPrefix, FromAny, Unmarshal } from './plugin.js';
import { fileDescriptorProtos } from '../proto/descriptors.js';

export const ContractConfig: any = {
    name: 'vibegraph_social_fi',
    id: 1,
    version: 1,
    supportedTransactions: ['send', 'register_profile', 'give_vibe'],
    transactionTypeUrls: [
        'type.googleapis.com/types.MessageSend',
        'type.googleapis.com/types.MessageRegisterProfile',
        'type.googleapis.com/types.MessageGiveVibe'
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
}

const accountPrefix = Buffer.from([1]);
const poolPrefix = Buffer.from([2]);
const paramsPrefix = Buffer.from([7]);
const profilePrefix = Buffer.from([16]);
const handlePrefix = Buffer.from([17]);
const vibePrefix = Buffer.from([18]);
const socialCounterPrefix = Buffer.from([19]);

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

function isValidNote(note: string | undefined): boolean {
    return (note || '').length <= 200;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readFirst(response: any, queryId: Long): Uint8Array | null {
    for (const result of response?.results || []) {
        const qid = result.queryId as Long;
        if (qid.equals(queryId)) {
            return result.entries?.[0]?.value || null;
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
        case 'MessageSend':
        default:
            return toLong(feeParams?.sendFee);
    }
}
