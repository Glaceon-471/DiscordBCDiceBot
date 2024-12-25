import { createBot, getBotIdFromToken, startBot, Intents } from "@discordeno/mod.ts";
// import { BCDiceVersionCommand, BCDiceRoll } from "./commands.ts";
import { BCDice } from "./test_commands.ts"

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