import Debug from "debug";
import { Socket } from "socket.io";
import {
	deleteGameRoom,
	findGameRoomById,
	updateGameRoomsRoundCount,
	markGameRoomLockedIfNotLocked,
	setGameRoomRoundLocked,
} from "../services/gameRoom_service";
import {
	createReactionTime,
	findReactionTimesByUserId,
	getBestEverReactionTime,
} from "../services/reactionTime_service";
import {
	getUserById,
	getUsersInRoom,
	updateUsersScore,
	updateUsersVirusClicked,
} from "../services/user_service";
import {
	ClientToServerEvents,
	NewRoundData,
	ServerToClientEvents,
} from "../types/shared/socket_types";
import { calcAverageReactionTime, calcVirusData } from "./function_controller";
import { io } from "../../server";
import {
	countPreviousGames,
	getPreviousGames,
	getOldestGame,
	deleteOldestGame,
	createPreviousGame,
} from "../services/previousGame_service";
import {
	createAverageReactionTime,
	getBestAverageReactionTime,
} from "../services/averageReactionTime_service";

// Create a new debug instance
const debug = Debug("ktv:socket_controller");

/**
 * clickVirus Controller
 */
export const listenForVirusClick = (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
) => {
	socket.on("clickVirus", async (timeTakenToClick) => {
		try {
			const user = await getUserById(socket.id);
			if (!user) return;

				const gameRoom = await findGameRoomById(user.gameRoomId);
				if (!gameRoom) return;
				const gameRoomId = gameRoom.id;

			// Atomically lock the room for this round so only the first clicker wins.
				const lockResult = await markGameRoomLockedIfNotLocked(gameRoomId);
			if (lockResult.count === 0) return; // someone else already claimed this round

			// Save the winner's reaction time in the database
			await createReactionTime(timeTakenToClick, user.id);

			// Get and emit the best ever reaction time
			const bestEverReactionTime = await getBestEverReactionTime();
			const userName = bestEverReactionTime?.user?.name ?? null;
			const time = bestEverReactionTime?.time ?? null;
			io.emit("bestEverReactionTime", userName, time);

			// Award the point to the first clicker
			await updateUsersScore(user.id);

			const players = await getUsersInRoom(gameRoom.id);
			const player1Score = players[0].score ?? 0;
			const player2Score = players[1].score ?? 0;
			const player1Id = players[0].id;

			// Update scores for both players
			io.to(gameRoom.id).emit(
				"updateScore",
				player1Score,
				player2Score,
				player1Id,
			);

			// Broadcast live game data
			const liveGamePayload = {
				player1Username: players[0].name,
				player1Score,
				player2Username: players[1].name,
				player2Score,
				gameRoomId: gameRoom.id,
			};
			io.emit("liveGame", liveGamePayload);

			// Tell both players who won this round
			io.to(gameRoom.id).emit(
				"roundWon",
				user.id,
				user.name,
				timeTakenToClick,
			);

			// Reset user virusClicked flags for next round (set false for all users in room)
			const usersInRoom = await getUsersInRoom(gameRoom.id);
			for (const u of usersInRoom) {
				await updateUsersVirusClicked(u.id, { virusClicked: false });
			}

				const updatedGameRoom = await updateGameRoomsRoundCount(gameRoomId);

			// Short pause so players can see the round result, then next round
			setTimeout(async () => {
				try {
						if (updatedGameRoom.roundCount <= 10) {
						// Unlock the room so next round can be claimed
							await setGameRoomRoundLocked(gameRoomId, false);

						const virusData = calcVirusData();
							io.to(gameRoomId).emit("newRound", {
							row: virusData.row,
							column: virusData.column,
							delay: virusData.delay,
						});
					} else {
						// ── Game over ──
						const userDataArray = await Promise.all(
								updatedGameRoom.users.map(async (u) => {
								const reactionTimes =
									await findReactionTimesByUserId(u.id);
								const avg = reactionTimes.length
									? Number(
											calcAverageReactionTime(
												reactionTimes,
											).toFixed(3),
										)
									: 0;
								await createAverageReactionTime(u.name, avg);
								return {
									id: u.id,
									name: u.name,
										gameRoomId,
									score: u.score!,
									averageReactionTime: avg,
								};
							}),
						);

							io.to(gameRoomId).emit("endGame", userDataArray);

							const [p1, p2] = updatedGameRoom.users;
						await createPreviousGame(
							p1.name,
							p2.name,
							p1.score!,
							p2.score!,
						);

						const latestGamesCount = await countPreviousGames();
						if (latestGamesCount > 10) {
							const oldestGame = await getOldestGame();
							if (oldestGame)
								await deleteOldestGame(oldestGame.id);
						}

						const latestGames = await getPreviousGames();
						io.emit("tenLatestGames", latestGames);

						const bestAvg = await getBestAverageReactionTime();
						io.emit(
							"bestAverageReactionTime",
							bestAvg?.name ?? null,
							bestAvg?.averageReactionTime ?? 0,
						);

							io.emit("removeLiveGame", gameRoomId);
							deleteGameRoom(gameRoomId);
					}
				} catch (err) {
					debug("ERROR in delayed round/endgame logic", err);
				}
			}, 1500); // 1.5 s pause between rounds
		} catch (err) {
			debug("ERROR clicking the virus!", err);
		}
	});
};
