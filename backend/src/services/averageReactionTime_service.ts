/**
 * averageReactionTime Servive
 */
import prisma from "../prisma";

export const getBestAverageReactionTime = () => {
	return prisma.bestAverageReactionTime.findFirst({
		orderBy: { averageReactionTime: "asc" },
	});
};

export const getBestAverageReactionTimeTop3 = () => {
	return prisma.bestAverageReactionTime.findMany({
		orderBy: { averageReactionTime: "asc" },
		take: 3,
		select: { name: true, averageReactionTime: true },
	});
};

export const updateBestAverageReactionTimesTop3 = async (
	name: string,
	averageReactionTime: number,
) => {
	// Only store names for top 3 average reaction times
	const currentTop = await prisma.bestAverageReactionTime.findMany({
		orderBy: { averageReactionTime: "asc" },
		take: 3,
	});

	if (
		currentTop.length === 3 &&
		averageReactionTime >=
			currentTop[currentTop.length - 1].averageReactionTime
	)
		return;

	await prisma.bestAverageReactionTime.create({
		data: { name, averageReactionTime },
	});

	const all = await prisma.bestAverageReactionTime.findMany({
		orderBy: { averageReactionTime: "asc" },
	});
	const keepIds = new Set(all.slice(0, 3).map((r) => r.id));
	const deleteIds = all.filter((r) => !keepIds.has(r.id)).map((r) => r.id);
	if (deleteIds.length > 0) {
		await prisma.bestAverageReactionTime.deleteMany({
			where: { id: { in: deleteIds } },
		});
	}
};
