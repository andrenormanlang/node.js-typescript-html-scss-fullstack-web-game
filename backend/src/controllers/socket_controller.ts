/**
 * Socket Controller
 */
import Debug from "debug";
import { io } from "../../server";
import { Socket } from "socket.io";
import { deleteUsersInRoom, getUserById } from "../services/user_service";
import {
	ClientToServerEvents,
	LiveGameData,
	ServerToClientEvents,
} from "../types/shared/socket_types";
import { getBestEverReactionTime } from "../services/reactionTime_service";
import {
	deleteGameRoom,
	findGameRoomById,
	findGameRooms,
} from "../services/gameRoom_service";
import { listenForVirusClick } from "./clickVirus_controller";
import { availableGameRooms, listenForUserJoin } from "./userJoin_controller";
import { getPreviousGames } from "../services/previousGame_service";
import { getBestAverageReactionTime } from "../services/averageReactionTime_service";

// Create a new debug instance
const debug = Debug("ktv:socket_controller");

// Handle the user connecting
export const handleConnection = async (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
) => {
	debug("🙋🏼 A user connected -", socket.id);

	// Get and emit the live games to the user
	try {
		// Get the live games
		const liveGameRooms = await findGameRooms();

		// Only include rooms with two users and an in-progress round count
		const liveGameRoomsFiltered = liveGameRooms.filter(
			(game) =>
				Array.isArray(game.users) &&
				game.users.length >= 2 &&
				(game.userCount ?? game.users.length) >= 2 &&
				(game.roundCount ?? 0) <= 10,
		);

		// Create a payload for every live game (use safe defaults)
		const liveGames = liveGameRoomsFiltered.map((game) => ({
			player1Username: game.users[0].name,
			player1Score: game.users[0].score ?? 0,
			player2Username: game.users[1].name,
			player2Score: game.users[1].score ?? 0,
			gameRoomId: game.id,
		}));

		// Send the live games to the frontend (always emit an array)
		socket.emit("liveGames", liveGames);
	} catch (err) {
		debug("Could not get the live games");
	}

	// Get and emit the latetsGames
	try {
		const latestGames = await getPreviousGames();
		socket.emit("tenLatestGames", latestGames);
	} catch (err) {
		debug("Could not get the 10 latest games");
	}

	// Get and emit the bestEverReactionTime
	try {
		const bestEverReactionTime = await getBestEverReactionTime();

		const userName = bestEverReactionTime?.user?.name ?? null;
		const time = bestEverReactionTime?.time ?? null;

		socket.emit("bestEverReactionTime", userName, time);
	} catch (err) {
		debug("Could not get the bestEverReactionTime");
	}

	// Get and emit the bestAverageReactionTime
	try {
		const bestAverageReactionTime = await getBestAverageReactionTime();

		const userName = bestAverageReactionTime?.name ?? null;
		const averageReactionTime =
			bestAverageReactionTime?.averageReactionTime ?? 0;

		socket.emit("bestAverageReactionTime", userName, averageReactionTime);
	} catch (err) {
		debug("Could not get the bestAverageReactionTime");
	}

	// Handle user disconnecting
	socket.on("disconnect", async () => {
		debug("✌🏻 A user disconnected", socket.id);

		try {
			const user = await getUserById(socket.id);
			if (!user) return;

			const gameRoomId = user.gameRoomId;

			io.emit("removeLiveGame", gameRoomId);
			socket.broadcast.to(gameRoomId).emit("opponentLeft");

			// Remove this room from the local "waiting rooms" list (don't pop blindly)
			const idx = availableGameRooms.findIndex(
				(r) => r.id === gameRoomId,
			);
			if (idx !== -1) availableGameRooms.splice(idx, 1);

			// Best-effort cleanup in DB
			try {
				await deleteUsersInRoom(gameRoomId);
				const deletedRoom = await deleteGameRoom(gameRoomId);
				debug("Room deleted:", deletedRoom);
			} catch (err) {
				debug("ERROR deleting disconnected room or its users", err);
			}
		} catch (err) {
			debug(
				"ERROR finding or deleting one of following: reactionTimes, user, gameRoom",
			);
		}
	});

	// socket.on('userJoin')
	listenForUserJoin(socket);

	// socket.on('virusClick')
	listenForVirusClick(socket);
};
