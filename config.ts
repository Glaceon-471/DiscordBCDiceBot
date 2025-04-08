import { DB } from "@db";

const DataBase = new DB("dicebot.db");
DataBase.query(
    `
    CREATE TABLE IF NOT EXISTS configs (
        id TEXT PRIMARY KEY,
        default_system TEXT DEFAULT 'DiceBot',
        channel_configs JSON NOT NULL
    )
    `
);

export class ConfigsData {
    DefaultSystem?: string;
    
    parse(): void {
        
    }
    
    stringify(): string {
        return [
            `デフォルトシステム : ${this.DefaultSystem}`
        ].join("\n")
    }
}

export class ServerConfigsData extends ConfigsData {
    ChannelConfigs?: Map<string, ConfigsData>
}

export function getConfig(id: string): ServerConfigsData {
    const server_configs = DataBase.query("SELECT default_system, channel_configs FROM configs WHERE id = ?", [id]);
    if (server_configs.length <= 0) return { DefaultSystem: "DiceBot", ChannelConfigs: new Map() };
    return { DefaultSystem: server_configs[0][0] as string, ChannelConfigs: JSON.parse(server_configs[0][1] as string) as Map<string, ConfigsData> };
}

export function getChannelConfig(id: string, channel: string): ConfigsData {
    const channel_configs = DataBase.query("SELECT json_extract(channel_configs, '$.' || ?) FROM configs WHERE id = ?", [channel, id]);
    if (channel_configs.length <= 0) return { DefaultSystem: "DiceBot" };
    const map = JSON.parse(channel_configs[0][0] as string);
    return { DefaultSystem: map.DefaultSystem as string };
}

export function setConfig(id: string, data: ServerConfigsData) {
    DataBase.query(
        `
        INSERT INTO configs (id, default_system, channel_configs)
        VALUES (?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET default_system = excluded.default_system, channel_configs = excluded.channel_configs
        `,
        [id, data.DefaultSystem, JSON.stringify(data.ChannelConfigs)]
    )
}