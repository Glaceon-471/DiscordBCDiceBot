import { DynamicLoader, Version } from '@bcdice';
import { CreateSlashApplicationCommand, Bot, Interaction, InteractionResponseTypes } from "@discordeno/mod.ts";
import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "@discordeno/types/shared.ts";
import { ApplicationCommandOptionChoice } from "@discordeno/transformers/applicationCommandOptionChoice.ts"

const Loader = new DynamicLoader();

interface SlashCommand {
    info: CreateSlashApplicationCommand;
    response(bot: Bot, interaction: Interaction): Promise<void>;
};

export const BCDiceVersionCommand: SlashCommand = {
    info: {
        name: "bcdice_version",
        description: "BCDiceのバージョンを表示します。",
        type: ApplicationCommandTypes.ChatInput
    },
    response: async (bot, interaction) => {
        return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
            type: InteractionResponseTypes.ChannelMessageWithSource,
            data: {
                content: `BCDiceバージョン : ${Version}`,
                flags: 0b01000000
            }
        });
    }
}

const Systems: ApplicationCommandOptionChoice[] = []
Loader.listAvailableGameSystems().forEach(element => {
    Systems.push({
        name: element.NAME,
        value: element.ID
    });
});
export const BCDiceRoll: SlashCommand = {
    info: {
        name: "bcdice_roll",
        description: "BCDiceでダイスを振ります。",
        type: ApplicationCommandTypes.ChatInput,
        options: [
            {
                type: ApplicationCommandOptionTypes.String,
                name: "system",
                description: "振るダイスのシステムを指定します",
                choices: Systems
            },
            {
                type: ApplicationCommandOptionTypes.String,
                name: "dice",
                description: "ダイスのコマンド",
                required: true
            }
        ]
    },
    response: async (bot, interaction) => {
        const system = await Loader.dynamicLoad((interaction.data?.options?.find(x => x.name == "system")?.value ?? "DiceBot") as string);
        const dice = interaction.data?.options?.find(x => x.name == "dice")?.value as string;
        return await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
            type: InteractionResponseTypes.ChannelMessageWithSource,
            data: {
                content: system.eval(dice)?.text,
            }
        });
    }
}