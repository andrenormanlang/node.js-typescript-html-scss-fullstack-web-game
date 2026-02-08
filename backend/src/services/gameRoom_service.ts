/**
 * gameRoom Servive
 */
import prisma from "../prisma";
import { GameRoomData } from "../types/shared/socket_types";

export const findGameRooms = () => {
	return prisma.gameRoom.findMany({ include: { users: true } });
};

export const findGameRoomById = (gameRoomId: string) => {
	return prisma.gameRoom.findUnique({
		where: { id: gameRoomId },
		include: { users: true },
	});
};

export const findGameRoomByUserCount = (userCount: number) => {
	return prisma.gameRoom.findFirst({ where: { userCount } });
};

export const createGameRoom = (data: GameRoomData) => {
	return prisma.gameRoom.create({ data });
};

export const updateGameRoomsUserCount = (
	gameRoomId: string,
	userCountData: { userCount: number },
) => {
	return prisma.gameRoom.update({
		where: { id: gameRoomId },
		data: userCountData,
	});
};

export const updateGameRoomsRoundCount = (gameRoomId: string) => {
	return prisma.gameRoom.update({
		where: { id: gameRoomId },
		include: { users: true },
		data: { roundCount: { increment: 1 } },
	});
};

export const markGameRoomLockedIfNotLocked = (gameRoomId: string) => {
	return prisma.gameRoom.updateMany({
		where: { id: gameRoomId, roundLocked: false },
		data: { roundLocked: true },
	});
};

export const setGameRoomRoundLocked = (gameRoomId: string, locked: boolean) => {
	return prisma.gameRoom.update({
		where: { id: gameRoomId },
		data: { roundLocked: locked },
	});
};

export const deleteGameRoom = (gameRoomId: string) => {
	return prisma.gameRoom.delete({ where: { id: gameRoomId } });
};
