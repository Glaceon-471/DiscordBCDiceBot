import { BCDiceCommand, ConfigCommand, ServerConfigCommand, ChannelConfigCommand } from "./commands.ts";
import { getCOSConfigsData } from "./config.ts";
import { getSystem } from "./helper.ts";
import { createBot, getBotIdFromToken, startBot, Intents, InteractionTypes, MessageTypes } from "@discordeno/mod.ts";

const BotToken: string = Deno.env.get("BOT_TOKEN") as string;

const Commands = [BCDiceCommand, ConfigCommand, ServerConfigCommand, ChannelConfigCommand];
const Bot = createBot({
    token: BotToken,
    botId: getBotIdFromToken(BotToken) as bigint,
    
    intents: Intents.Guilds | Intents.GuildMessages | Intents.DirectMessages | Intents.MessageContent,
    
    events: {
        ready: (_bot, payload) => {
            console.log(`${payload.user.username} is ready!`);
        },
        interactionCreate: async (_bot, interaction) => {
            if (interaction.guildId == undefined) return;
            switch (interaction.type) {
                case InteractionTypes.ApplicationCommand:
                    await Commands.find(x => x.info.name == interaction.data?.name)?.response(Bot, interaction);
                    break;
            }
        },
        messageCreate: async (_bot, message) => {
            if (message.guildId == undefined) return;
            if (message.isFromBot) return;
            if (message.type != MessageTypes.Default) return;
            if (!getCOSConfigsData(message.guildId!, message.channelId!, "ChatDiceRoll")) return;
            const system = await getSystem(getCOSConfigsData(message.guildId!, message.channelId!, "DefaultSystem") as string);
            const dice = system.eval(message.content);
            if (dice == undefined) return;
            if (!dice.secret) {
                await Bot.helpers.sendMessage(message.channelId, {
                    content: dice.text
                });
            }
            else {
                try {
                    await Bot.helpers.sendMessage((await Bot.helpers.getDmChannel(message.authorId)).id, {
                        content: `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}\n${dice.text}`
                    });
                    await Bot.helpers.sendMessage(message.channelId, {
                        content: "シークレットダイス",
                        allowedMentions: {
                            repliedUser: false
                        },
                        messageReference: {
                            messageId: message.id,
                            channelId: message.channelId,
                            guildId: message.guildId!,
                            failIfNotExists: false
                        }
                    });
                }
                catch {
                    await Bot.helpers.sendMessage(message.channelId, {
                        content: "ユーザーがDMを受け取れない設定のようです",
                        allowedMentions: {
                            repliedUser: false
                        },
                        messageReference: {
                            messageId: message.id,
                            channelId: message.channelId,
                            guildId: message.guildId!,
                            failIfNotExists: false
                        }
                    });
                }
            }
        }
    }
});

for (const element of Commands) {
    Bot.helpers.createGlobalApplicationCommand(element.info);
}
Bot.helpers.upsertGlobalApplicationCommands(Commands.map(x => x.info));

await startBot(Bot);