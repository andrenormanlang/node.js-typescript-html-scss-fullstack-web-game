/**
 * reactionTime Sercive
 */
import prisma from "../prisma";
import { ReactionTimeData } from "../types/shared/socket_types";

export const findReactionTimesByUserId = (userId: string) => {
	return prisma.reactionTime.findMany({ where: { userId } });
};

export const findRecentReactionTimes = (gameRoomId: string) => {
	return prisma.reactionTime.findMany({
		where: { user: { gameRoomId } },
		take: 2,
		orderBy: { id: "desc" },
		include: { user: true },
	});
};

export const getBestEverReactionTime = () => {
	return prisma.bestReactionTime.findFirst({
		orderBy: { time: "asc" },
	});
};

export const getBestEverReactionTimeTop3 = () => {
	return prisma.bestReactionTime.findMany({
		orderBy: { time: "asc" },
		take: 3,
		select: { name: true, time: true },
	});
};

export const createReactionTime = (
	timeTakenToClick: number,
	userId: string,
) => {
	return prisma.reactionTime.create({
		data: {
			time: timeTakenToClick,
			userId,
		},
	});
};

export const updateBestReactionTimesTop3 = async (
	name: string,
	time: number,
) => {
	// Only store names for top 3 reaction times
	const currentTop = await prisma.bestReactionTime.findMany({
		orderBy: { time: "asc" },
		take: 3,
	});

	// If we already have 3 scores and the new time is not better than the worst, skip
	if (
		currentTop.length === 3 &&
		time >= currentTop[currentTop.length - 1].time
	)
		return;

	await prisma.bestReactionTime.create({ data: { name, time } });

	// Trim to top 3
	const all = await prisma.bestReactionTime.findMany({
		orderBy: { time: "asc" },
	});
	const keepIds = new Set(all.slice(0, 3).map((r) => r.id));
	const deleteIds = all.filter((r) => !keepIds.has(r.id)).map((r) => r.id);
	if (deleteIds.length > 0) {
		await prisma.bestReactionTime.deleteMany({
			where: { id: { in: deleteIds } },
		});
	}
};
