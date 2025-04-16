import { DB } from "@db";

const DataBase = new DB("dicebot.db");
DataBase.query(
    `
    CREATE TABLE IF NOT EXISTS configs (
        id TEXT PRIMARY KEY,
        default_system TEXT NOT NULL DEFAULT 'DiceBot',
        chat_dice_roll BOOLEAN NOT NULL DEFAULT '1',
        channel_configs JSON NOT NULL DEFAULT '{}'
    )
    `
);

export interface ConfigsData {
    DefaultSystem?: string;
    ChatDiceRoll?: boolean;
}

export type ConfigsKey = keyof ConfigsData;

export function getConfigsData(data: ConfigsData, key: ConfigsKey) {
    switch (key) {
        case "DefaultSystem":
            return data.DefaultSystem;
        case "ChatDiceRoll":
            return data.ChatDiceRoll;
    }
}

export function setConfigsData(data: ConfigsData, key: ConfigsKey, value: string | boolean) {
    switch (key) {
        case "DefaultSystem":
            data.DefaultSystem = value as string;
            break;
        case "ChatDiceRoll":
            data.ChatDiceRoll = value as boolean;
            break;
    }
}

export function getServerConfig(id: bigint): ConfigsData {
    const server_configs = DataBase.queryEntries<{
        default_system: string,
        chat_dice_roll: number,
    }>("SELECT * FROM configs WHERE id = ?", [id]);
    
    if (server_configs.length <= 0) return { DefaultSystem: "DiceBot", ChatDiceRoll: true };
    const server_config = server_configs[0];
    return { DefaultSystem: server_config.default_system, ChatDiceRoll: Boolean(server_config.chat_dice_roll) };
}

export function getChannelConfigs(id: bigint): Map<bigint, ConfigsData> {
    const server_configs = DataBase.queryEntries<{ channel_configs: string }>("SELECT json_extract(channel_configs, '$') AS channel_configs FROM configs WHERE id = ?", [id]);
    const result = new Map<bigint, ConfigsData>();
    if (server_configs.length <= 0) return result;
    for (const [key, value] of Object.entries<ConfigsData>(JSON.parse(server_configs[0].channel_configs))) {
        result.set(BigInt(key), value);
    }
    return result;
}

export function getChannelConfig(id: bigint, channel: bigint): ConfigsData {
    const server_configs = getServerConfig(id);
    const channel_configs = getChannelConfigs(id);
    if (!channel_configs.has(channel)) return { DefaultSystem: server_configs.DefaultSystem, ChatDiceRoll: server_configs.ChatDiceRoll };
    return channel_configs.get(channel)!;
}

export function setServerConfig(id: bigint, data: ConfigsData) {
    DataBase.query(
        `
        INSERT INTO configs (id, default_system, chat_dice_roll)
        VALUES (?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET default_system = excluded.default_system, chat_dice_roll = excluded.chat_dice_roll
        `,
        [id, data.DefaultSystem, data.ChatDiceRoll ? 1 : 0]
    );
}

export function setChannelConfigs(id: bigint, data: Map<bigint, ConfigsData>) {
    DataBase.query("UPDATE configs SET channel_configs = ? WHERE id = ?", [JSON.stringify(data), id]);
}

export function setChannelConfig(id: bigint, channel: bigint, data: ConfigsData) {
    DataBase.query("UPDATE configs SET channel_configs = json_set(channel_configs, '$.' || ?, json(?)) WHERE id = ?", [channel, JSON.stringify(data), id]);
}

export function removeChannelConfig(id: bigint, channel: bigint) {
    DataBase.query("UPDATE configs SET channel_configs = json_remove(channel_configs, '$.' || ?) WHERE id = ?", [channel, id]);
}

export function getCOSConfigsData(id: bigint, channel: bigint, key: ConfigsKey) {
    return getConfigsData(getChannelConfig(id, channel), key) ?? getConfigsData(getServerConfig(id), key);
}

export function stringify(data: ConfigsData) {
    const text: Array<string> = new Array<string>(0);
    if (data.DefaultSystem != undefined) text.push(`デフォルトシステム : ${data.DefaultSystem}`);
    if (data.ChatDiceRoll != undefined) text.push(`チャットでダイスロールが可能 : ${data.ChatDiceRoll}`);
    return text.join("\n");
}