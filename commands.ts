import { getConfig, getChannelConfig, setConfig, ConfigsData, stringify } from "./config.ts";
import { SystemInfos, getSystem, getParameter, checkPermissionByMember } from "./helper.ts";
import bcdice from '@bcdice';
import { CreateSlashApplicationCommand, Bot, Interaction, InteractionResponseTypes, transformEmbed, DiscordChannel } from "@discordeno/mod.ts";
import { ApplicationCommandOptionTypes } from "@discordeno/types/shared.ts";

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
                        description: "ヘルプの表示するシステム (デフォルト:DiceBot)"
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
                        description: "振るダイスのシステムを指定します (デフォルト:DiceBot)"
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
        switch (interaction.data?.options?.find(x => x.type == ApplicationCommandOptionTypes.SubCommand)?.name) {
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
            case "help":
            {
                const system = await getSystem(getParameter(interaction, "help", "system")?.value as string);
                return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                    type: InteractionResponseTypes.ChannelMessageWithSource,
                    data: {
                        embeds: [
                            transformEmbed(bot, {
                                title: `${system.NAME}`,
                                description: system.HELP_MESSAGE
                            })
                        ],
                        flags: (getParameter(interaction, "help", "only_yourself")?.value as boolean ?? true) ? 0b01000000 : 0
                    }
                });
            }
            case "roll":
            {
                const system = await getSystem(getParameter(interaction, "roll", "system")?.value as string);
                return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                    type: InteractionResponseTypes.ChannelMessageWithSource,
                    data: {
                        content: system.eval(getParameter(interaction, "roll", "dice")?.value as string)?.text,
                        flags: (getParameter(interaction, "roll", "only_yourself")?.value as boolean ?? false) ? 0b01000000 : 0
                    }
                });
            }
        }
        switch (interaction.data?.options?.find(x => x.type == ApplicationCommandOptionTypes.SubCommandGroup)?.name) {
            case "system":
            {
                switch (getParameter(interaction, "system")?.options?.find(x => x.type == ApplicationCommandOptionTypes.SubCommand)?.name) {
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
                name: "init",
                description: "サーバー設定を初期化します (管理者限定)"
            },
            {
                type: ApplicationCommandOptionTypes.SubCommand,
                name: "view",
                description: "設定を表示します",
                options: [
                    {
                        type: ApplicationCommandOptionTypes.Channel,
                        name: "channel",
                        description: "どのチャンネルの設定を表示するか (デフォルト:実行したチャンネル)"
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
        switch (interaction.data?.options?.find(x => x.type == ApplicationCommandOptionTypes.SubCommand)?.name) {
            case "init":
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
                setConfig(interaction.guildId!.toString(), {
                    DefaultSystem: "DiceBot",
                    ChannelConfigs: new Map()
                });
                return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
                    type: InteractionResponseTypes.ChannelMessageWithSource,
                    data: {
                        content: "サーバー設定を初期化しました",
                        flags: 0b01000000
                    }
                });
            }
            case "view":
            {
                const id = (getParameter(interaction, "view", "channel")?.value as DiscordChannel)?.id ?? interaction.channelId!
                if (getParameter(interaction, "view", "detail")?.value as boolean ?? false) {
                    const text1 = stringify(getConfig(interaction.guildId!.toString()));
                    const text2 = stringify(getChannelConfig(interaction.guildId!.toString(), id));
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
                    const config = getConfig(interaction.guildId!.toString());
                    const channel = getChannelConfig(interaction.guildId!.toString(), id);
                }
            }
        }
    }
}