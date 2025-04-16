import bcdice from '@bcdice';
import { ApplicationCommandOptionTypes, calculatePermissions, Interaction, InteractionDataOption, Member, PermissionStrings } from "@discordeno/mod.ts";

const Loader = new bcdice.DynamicLoader();

export const SystemInfos = Loader.listAvailableGameSystems();
const Systems = new Map([
    ["DiceBot", await Loader.dynamicLoad("DiceBot")]
]);
export async function getSystem(name: string) {
    if (Systems.has(name)) return Systems.get(name)!;
    if (SystemInfos.findIndex(x => x.id == name) != -1) {
        const system = await Loader.dynamicLoad(name);
        Systems.set(name, system);
        Systems.set(system.NAME, system);
        return system;
    }
    if (SystemInfos.findIndex(x => x.name == name) != -1) {
        const system = await Loader.dynamicLoad(Loader.getGameSystemIdByName(name));
        Systems.set(name, system);
        Systems.set(system.ID, system);
        return system;
    }
    const system = await Loader.dynamicLoad("DiceBot");
    Systems.set(name, system);
    return system;
}

export function getParameter(interaction: Interaction, ...names: string[]) {
    if (names.length == 0) throw new Error("names length must be greater than or equal to 1");
    let data = interaction.data?.options?.find(x => x.name = names[0]);
    if (names.length == 1 || data == undefined) {
        return data;
    }
    const slice = names.slice(1);
    for (const element of slice) {
        data = data?.options?.find(x => x.name == element);
        if (data == undefined) {
            return data;
        }
    }
    return data;
}

export function getSubCommandName(data: InteractionDataOption[] | undefined) {
    return data?.find(x => x.type == ApplicationCommandOptionTypes.SubCommand || x.type == ApplicationCommandOptionTypes.SubCommandGroup)?.name;
}

export function checkPermissionByMember(member: Member, permission: PermissionStrings): boolean {
    return calculatePermissions(member.permissions!).findIndex(x => x == permission) != -1;
}

export function checkPermission(permissions: bigint, permission: PermissionStrings): boolean {
    return calculatePermissions(permissions).findIndex(x => x == permission) != -1;
}