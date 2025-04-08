import { BCDiceCommand, ConfigCommand } from "./commands.ts";
import { createBot, getBotIdFromToken, startBot, Intents, InteractionTypes } from "@discordeno/mod.ts";

const BotToken: string = Deno.env.get("BOT_TOKEN") as string;

const Commands = [BCDiceCommand, ConfigCommand];
const Bot = createBot({
    token: BotToken,
    botId: getBotIdFromToken(BotToken) as bigint,
    
    intents: Intents.Guilds | Intents.GuildMessages,
    
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
        }
    }
});

for (const element of Commands) {
    Bot.helpers.createGlobalApplicationCommand(element.info);
}
Bot.helpers.upsertGlobalApplicationCommands(Commands.map(x => x.info));

await startBot(Bot);