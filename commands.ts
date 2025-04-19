import { setConfigsData, getServerConfig, setServerConfig, getChannelConfig, setChannelConfig, getCOSConfigsData, removeChannelConfig, stringify } from "./config.ts";
import { SystemInfos, getSystem, getParameter, getSubCommandName, checkPermissionByMember } from "./helper.ts";
import bcdice from '@bcdice';
import { CreateSlashApplicationCommand, Bot, Interaction, InteractionResponseTypes, transformEmbed, getChannel } from "@discordeno/mod.ts";
import { ApplicationCommandOptionTypes, ChannelTypes } from "@discordeno/types/shared.ts";

interface SlashCommand {
    info: CreateSlashApplicationCommand;
    response(bot: Bot, interaction: Interaction): Promise<void>;
}

export const BCDiceCommand: SlashCommand = {
    info: {
        name: "bcdice",
        description: "BCDice関連のコマンドです",
        options: [
            {
                type: ApplicationCommandOptionTypes.SubCommand,
                name: "version",
                description: "BCDiceのバージョンを表示します"
            },
            {
                type: ApplicationCommandOptionTypes.SubCommandGroup,
                name: "system",
                description: "システム関連のコマンドです",
                options: [
                    {
                        type: ApplicationCommandOptionTypes.SubCommand,
                        name: "search",
                        description: "システムの検索をします",
                        options: [
                            {
                                type: ApplicationCommandOptionTypes.String,
                                name: "id",
                                description: "システムIdで検索します"
                            },
                            {
                                type: ApplicationCommandOptionTypes.String,
                                name: "name",
                                description: "システム名で検索します"
                            },
                            {
                                type: ApplicationCommandOptionTypes.Boolean,
                                name: "only_yourself",
                                description: "システムのヘルプを自分だけに表示 (デフォルト:true)"
                            }
                        ]
                    }
                ]
            },
            {
                type: ApplicationCommandOptionTypes.SubCommand,
                name: "help",
                description: "ヘルプを表示します",
                options: [
                    {
                        type: ApplicationCommandOptionTypes.String,
                        name: "system",
                        description: "ヘルプの表示するシステム (デフォルト:実行するチャンネルのデフォルトシステム)"
                    },
                    {
                        type: ApplicationCommandOptionTypes.Boolean,
                        name: "only_yourself",
                        description: "システムのヘルプを自分だけに表示 (デフォルト:true)"
                    }
                ]
            },
            {
                type: ApplicationCommandOptionTypes.SubCommand,
                name: "roll",
                description: "指定したシステムでダイスを振ります",
                options: [
                    {
                        type: ApplicationCommandOptionTypes.String,
                        name: "dice",
                        description: "ダイスのコマンド",
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionTypes.String,
                        name: "system",
                        description: "振るダイスのシステムを指定します (デフォルト:実行するチャンネルのデフォルトシステム)"
                    },
                    {
                        type: ApplicationCommandOptionTypes.Boolean,
                        name: "only_yourself",
                        description: "結果を自分だけに表示 (デフォルト:false)"
                    }
                ]
            }
        ]
    },
    response: async (bot, interaction) => {
        switch (getSubCommandName(interaction.data?.options)) {
            case "version":
            {
                return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                    type: InteractionResponseTypes.ChannelMessageWithSource,
                    data: {
                        content: `BCDiceバージョン : ${bcdice.Version}`,
                        flags: 0b01000000
                    }
                });
            }
            case "system":
            {
                switch (getSubCommandName(getParameter(interaction, "system")?.options)) {
                    case "search":
                    {
                        const id = getParameter(interaction, "system", "search", "id")?.value as string;
                        const name = getParameter(interaction, "system", "search", "name")?.value as string;
                        if (id == undefined && name == undefined) {
                            return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                                type: InteractionResponseTypes.ChannelMessageWithSource,
                                data: {
                                    content: "idまたはnameに入力してください",
                                    flags: 0b01000000
                                }
                            });
                        }
                        if (id != undefined) {
                            const list = SystemInfos.filter(x => x.id.includes(id));
                            let text = list.slice(0, 20).reduce<string>((x, y) => `${x}${y.name} : ${y.id}\n`, "");
                            if (list.length > 20) {
                                text += `表示できなかった候補...${list.length - 20}個`;
                            }
                            return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                                type: InteractionResponseTypes.ChannelMessageWithSource,
                                data: {
                                    embeds: [
                                        transformEmbed(bot, {
                                            title: `システム検索 Id検索:${id}`,
                                            description: text
                                        })
                                    ],
                                    flags: ((getParameter(interaction, "system", "search", "only_yourself")?.value) as boolean ?? true) ? 0b01000000 : 0
                                }
                            });
                        }
                        if (name != undefined) {
                            const list = SystemInfos.filter(x => x.name.includes(name));
                            let text = list.slice(0, 20).reduce<string>((x, y) => `${x}${y.name} : ${y.id}\n`, "");
                            if (list.length > 20) {
                                text += `表示できなかった候補...${list.length - 20}個`;
                            }
                            return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                                type: InteractionResponseTypes.ChannelMessageWithSource,
                                data: {
                                    embeds: [
                                        transformEmbed(bot, {
                                            title: `システム検索 名前検索:${name}`,
                                            description: text
                                        })
                                    ],
                                    flags: (getParameter(interaction, "system", "search", "only_yourself")?.value as boolean ?? true) ? 0b01000000 : 0
                                }
                            });
                        }
                    }
                }
                break;
            }
            case "help":
            {
                const system = await getSystem(
                    getParameter(interaction, "help", "system")?.value as string ??
                    getCOSConfigsData(interaction.guildId!, interaction.channelId!, "DefaultSystem")
                );
                return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                    type: InteractionResponseTypes.ChannelMessageWithSource,
                    data: {
                        embeds: [
                            transformEmbed(bot, {
                                title: system.NAME,
                                description: system.HELP_MESSAGE
                            })
                        ],
                        flags: (getParameter(interaction, "help", "only_yourself")?.value as boolean ?? true) ? 0b01000000 : 0
                    }
                });
            }
            case "roll":
            {
                const system = await getSystem(
                    getParameter(interaction, "roll", "system")?.value as string ??
                    getCOSConfigsData(interaction.guildId!, interaction.channelId!, "DefaultSystem")
                );
                const dice = system.eval(getParameter(interaction, "roll", "dice")?.value as string);
                if (dice == undefined) {
                    return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                        type: InteractionResponseTypes.ChannelMessageWithSource,
                        data: {
                            content: "有効なコマンドではありません\nシステムが違う可能性があります",
                            flags: 0b01000000
                        }
                    });
                }
                if (dice.secret) {
                    bot.helpers.sendMessage(interaction.channelId!, {
                        content: "シークレットダイス"
                    });
                }
                return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                    type: InteractionResponseTypes.ChannelMessageWithSource,
                    data: {
                        content: dice.text,
                        flags: (getParameter(interaction, "roll", "only_yourself")?.value as boolean ?? false) || dice.secret ? 0b01000000 : 0
                    }
                });
            }
        }
    }
}

export const ConfigCommand: SlashCommand = {
    info: {
        name: "config",
        description: "設定関連のコマンドです",
        options: [
            {
                type: ApplicationCommandOptionTypes.SubCommand,
                name: "view",
                description: "設定を表示します",
                options: [
                    {
                        type: ApplicationCommandOptionTypes.Channel,
                        name: "channel",
                        description: "どのチャンネルの設定を表示するか (デフォルト:実行したチャンネル)",
                        channelTypes: [ChannelTypes.GuildText, ChannelTypes.GuildVoice, ChannelTypes.GuildForum]
                    },
                    {
                        type: ApplicationCommandOptionTypes.Boolean,
                        name: "detail",
                        description: "設定の詳細を表示 (デフォルト:false)"
                    },
                    {
                        type: ApplicationCommandOptionTypes.Boolean,
                        name: "only_yourself",
                        description: "結果を自分だけに表示 (デフォルト:true)"
                    }
                ]
            }
        ]
    },
    response: async (bot, interaction) => {
        switch (getSubCommandName(interaction.data?.options)) {
            case "view":
            {
                const id = BigInt(getParameter(interaction, "view", "channel")?.value as string ?? interaction.channelId!);
                if (getParameter(interaction, "view", "detail")?.value as boolean ?? false) {
                    const text1 = stringify(getServerConfig(interaction.guildId!));
                    const text2 = stringify(getChannelConfig(interaction.guildId!, id));
                    return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                        type: InteractionResponseTypes.ChannelMessageWithSource,
                        data: {
                            embeds: [
                                transformEmbed(bot, {
                                    title: `サーバー設定`,
                                    description: text1
                                }),
                                transformEmbed(bot, {
                                    title: "チャンネル設定",
                                    description: text2
                                })
                            ],
                            flags: (getParameter(interaction, "view", "only_yourself")?.value as boolean ?? true) ? 0b01000000 : 0
                        }
                    });
                }
                else {
                    const config = getServerConfig(interaction.guildId!);
                    const channel = getChannelConfig(interaction.guildId!, id);
                    return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                        type: InteractionResponseTypes.ChannelMessageWithSource,
                        data: {
                            embeds: [
                                transformEmbed(bot, {
                                    title: `設定`,
                                    description: stringify({
                                        DefaultSystem: channel.DefaultSystem ?? config.DefaultSystem
                                    })
                                })
                            ],
                            flags: (getParameter(interaction, "view", "only_yourself")?.value as boolean ?? true) ? 0b01000000 : 0
                        }
                    });
                }
            }
        }
    }
}

export const ServerConfigCommand: SlashCommand = {
    info: {
        name: "server_config",
        description: "設定関連のコマンドです",
        options: [
            {
                type: ApplicationCommandOptionTypes.SubCommandGroup,
                name: "set",
                description: "設定を変更します (管理者限定)",
                options: [
                    {
                        type: ApplicationCommandOptionTypes.SubCommand,
                        name: "default_system",
                        description: "デフォルトのシステムを変更します (管理者限定)",
                        options: [
                            {
                                type: ApplicationCommandOptionTypes.String,
                                name: "value",
                                description: "変更する値",
                                required: true
                            }
                        ]
                    },
                    {
                        type: ApplicationCommandOptionTypes.SubCommand,
                        name: "chat_dice_roll",
                        description: "チャットでダイスロールが可能かを変更します (管理者限定)",
                        options: [
                            {
                                type: ApplicationCommandOptionTypes.Boolean,
                                name: "value",
                                description: "変更する値",
                                required: true
                            }
                        ]
                    }
                ]
            }
        ]
    },
    response: async (bot, interaction) => {
        switch (getSubCommandName(interaction.data?.options)) {
            case "set":
            {
                if (!checkPermissionByMember(interaction.member!, "ADMINISTRATOR")) {
                    return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                        type: InteractionResponseTypes.ChannelMessageWithSource,
                        data: {
                            content: "あなたの権限では実行できません",
                            flags: 0b01000000
                        }
                    });
                }
                switch (getSubCommandName(getParameter(interaction, "set")?.options)) {
                    case "default_system":
                    {
                        const value = getParameter(interaction, "set", "default_system", "value")?.value as string;
                        if (SystemInfos.findIndex(x => x.id == value || x.name == value) == -1) {
                            return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                                type: InteractionResponseTypes.ChannelMessageWithSource,
                                data: {
                                    content: `${value}というシステムを確認することができませんでした`,
                                    flags: 0b01000000
                                }
                            });
                        }
                        const config = getServerConfig(interaction.guildId!);
                        setConfigsData(config, "DefaultSystem", value);
                        setServerConfig(interaction.guildId!, config);
                        return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                            type: InteractionResponseTypes.ChannelMessageWithSource,
                            data: {
                                content: `設定を変更しました。\nデフォルトシステム : ${value}`
                            }
                        });
                    }
                    case "chat_dice_roll":
                    {
                        const value = getParameter(interaction, "set", "chat_dice_roll", "value")?.value as boolean;
                        const config = getServerConfig(interaction.guildId!);
                        setConfigsData(config, "ChatDiceRoll", value);
                        setServerConfig(interaction.guildId!, config);
                        return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                            type: InteractionResponseTypes.ChannelMessageWithSource,
                            data: {
                                content: `設定を変更しました。\nチャットでダイスロールが可能 : ${value}`
                            }
                        });
                    }
                }
                break;
            }
        }
    }
}

export const ChannelConfigCommand: SlashCommand = {
    info: {
        name: "channel_config",
        description: "設定関連のコマンドです",
        options: [
            {
                type: ApplicationCommandOptionTypes.SubCommandGroup,
                name: "set",
                description: "チャンネルの設定を変更します (管理者 及び チャンネル作成者限定)",
                options: [
                    {
                        type: ApplicationCommandOptionTypes.SubCommand,
                        name: "default_system",
                        description: "チャンネルのデフォルトのシステムを変更します (管理者 及び チャンネル作成者限定)",
                        options: [
                            {
                                type: ApplicationCommandOptionTypes.String,
                                name: "value",
                                description: "変更する値",
                                required: true
                            }
                        ]
                    },
                    {
                        type: ApplicationCommandOptionTypes.SubCommand,
                        name: "chat_dice_roll",
                        description: "チャンネルのチャットでダイスロールが可能かを変更します (管理者 及び チャンネル作成者限定)",
                        options: [
                            {
                                type: ApplicationCommandOptionTypes.Boolean,
                                name: "value",
                                description: "変更する値",
                                required: true
                            }
                        ]
                    }
                ]
            },
            {
                type: ApplicationCommandOptionTypes.SubCommand,
                name: "remove",
                description: "チャンネルの設定を削除します (管理者 及び チャンネル作成者限定)"
            }
        ]
    },
    response: async (bot, interaction) => {
        switch (getSubCommandName(interaction.data?.options)) {
            case "set":
            {
                if (!(checkPermissionByMember(interaction.member!, "ADMINISTRATOR") || (await getChannel(bot, interaction.channelId!)).ownerId == interaction.user.id)) {
                    return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                        type: InteractionResponseTypes.ChannelMessageWithSource,
                        data: {
                            content: "あなたの権限では実行できません",
                            flags: 0b01000000
                        }
                    });
                }
                switch (getSubCommandName(getParameter(interaction, "set")?.options)) {
                    case "default_system":
                    {
                        const value = getParameter(interaction, "set", "default_system", "value")?.value as string;
                        if (SystemInfos.findIndex(x => x.id == value || x.name == value) == -1) {
                            return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                                type: InteractionResponseTypes.ChannelMessageWithSource,
                                data: {
                                    content: `${value}というシステムを確認することができませんでした`,
                                    flags: 0b01000000
                                }
                            });
                        }
                        const config = getChannelConfig(interaction.guildId!, interaction.channelId!);
                        setConfigsData(config, "DefaultSystem", value);
                        setChannelConfig(interaction.guildId!, interaction.channelId!, config);
                        return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                            type: InteractionResponseTypes.ChannelMessageWithSource,
                            data: {
                                content: `チャンネル設定を変更しました。\nデフォルトシステム : ${value}`
                            }
                        });
                    }
                    case "chat_dice_roll":
                    {
                        const value = getParameter(interaction, "channel", "chat_dice_roll", "value")?.value as boolean;
                        const config = getChannelConfig(interaction.guildId!, interaction.channelId!);
                        setConfigsData(config, "ChatDiceRoll", value);
                        setChannelConfig(interaction.guildId!, interaction.channelId!, config);
                        return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                            type: InteractionResponseTypes.ChannelMessageWithSource,
                            data: {
                                content: `チャンネル設定を変更しました。\nチャットでダイスロールが可能 : ${value}`
                            }
                        });
                    }
                }
                break;
            }
            case "remove":
            {
                if (!(checkPermissionByMember(interaction.member!, "ADMINISTRATOR") || (await getChannel(bot, interaction.channelId!)).ownerId == interaction.user.id)) {
                    return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                        type: InteractionResponseTypes.ChannelMessageWithSource,
                        data: {
                            content: "あなたの権限では実行できません",
                            flags: 0b01000000
                        }
                    });
                }
                removeChannelConfig(interaction.guildId!, interaction.channelId!);
                return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                    type: InteractionResponseTypes.ChannelMessageWithSource,
                    data: {
                        content: `チャンネル設定を削除しました`
                    }
                });
            }
        }
    }
}