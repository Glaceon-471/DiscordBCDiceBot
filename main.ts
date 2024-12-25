import { createBot, getBotIdFromToken, startBot, Intents } from "@discordeno/mod.ts";
// import { BCDiceVersionCommand, BCDiceRoll } from "./commands.ts";
import { CreateSlashApplicationCommand, Bot, Interaction, InteractionResponseTypes } from "@discordeno/mod.ts";
import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "@discordeno/types/shared.ts";
import { ApplicationCommandOptionChoice } from "@discordeno/transformers/applicationCommandOptionChoice.ts"

interface SlashCommand {
    info: CreateSlashApplicationCommand;
    response(bot: Bot, interaction: Interaction): Promise<void>;
};

export const BCDice: SlashCommand = {
    info: {
        name: "bcdice",
        description: "BCDiceのバージョンを表示します。",
        type: ApplicationCommandTypes.ChatInput
    },
    response: async (bot, interaction) => {
        return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
            type: InteractionResponseTypes.ChannelMessageWithSource,
            data: {
                content: `BCDiceバージョン : 出力できないよ....もう....`,
                flags: 0b01000000
            }
        });
    }
}

const BotToken: string = Deno.env.get("BOT_TOKEN")!;

const bot = createBot({
    token: BotToken,
    botId: getBotIdFromToken(BotToken) as bigint,
    
    intents: Intents.Guilds | Intents.GuildMessages,
    
    events: {
        ready: (_bot, payload) => {
            console.log(`${payload.user.username} is ready!`);
        },
        interactionCreate: async (_bot, interaction) => {
            // await BCDiceVersionCommand.response(bot, interaction);
            await BCDice.response(bot, interaction);
        }
    }
});

const info_list = [BCDice.info];// [BCDiceVersionCommand.info, BCDiceRoll.info]
info_list.forEach(element => {
    bot.helpers.createGlobalApplicationCommand(element);
});
bot.helpers.upsertGlobalApplicationCommands(info_list);


await startBot(bot);