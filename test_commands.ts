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