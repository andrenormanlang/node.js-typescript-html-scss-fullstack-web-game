/**
 *
 */

import Debug from "debug";
import { io } from "../../server";
import { Socket } from "socket.io";
import {
	createGameRoom,
	updateGameRoomsUserCount,
} from "../services/gameRoom_service";
import { createUser, getUsersInRoom } from "../services/user_service";
import {
	ClientToServerEvents,
	LiveGameData,
	PlayerData,
	ServerToClientEvents,
} from "../types/shared/socket_types";
import { calcVirusData } from "./function_controller";
import { GameRoom } from "@prisma/client";

// Create a new debug instance
const debug = Debug("ktv:socket_controller");

export let availableGameRooms: GameRoom[] = [];

export const listenForUserJoin = (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
) => {
	socket.on("userJoin", async (username) => {
		try {
			if (availableGameRooms.length === 0) {
				// Create a new gameRoom
				const gameRoom = await createGameRoom({
					userCount: 1,
					roundCount: 1,
				});

				// Create a user and connect with newly created gameRoom
				await createUser({
					id: socket.id,
					name: username,
					gameRoomId: gameRoom.id,
					score: 0,
				});

				socket.join(gameRoom.id);

				availableGameRooms.push(gameRoom);
				return;
			}

			// Join the existing gameRoom
			const existingRoom = availableGameRooms.pop()!;

			const user = await createUser({
				id: socket.id,
				name: username,
				gameRoomId: existingRoom.id,
				score: 0,
			});

			await updateGameRoomsUserCount(existingRoom.id, { userCount: 2 });

			socket.join(existingRoom.id);
			debug(user.name, "joined a game:", existingRoom.id);

			const virusData = calcVirusData();
			const firstRoundPayload = {
				row: virusData.row,
				column: virusData.column,
				delay: virusData.delay,
			};

			const userInformation = await getUsersInRoom(existingRoom.id);

			const playerData1: PlayerData = {
				id: userInformation[0].id,
				name: userInformation[0].name,
			};

			const playerData2: PlayerData = {
				id: userInformation[1].id,
				name: userInformation[1].name,
			};

			const liveGamePayload: LiveGameData = {
				player1Username: userInformation[0].name,
				player1Score: userInformation[0].score ?? 0,
				player2Username: userInformation[1].name,
				player2Score: userInformation[1].score ?? 0,
				gameRoomId: existingRoom.id,
			};

			io.to(existingRoom.id).emit(
				"firstRound",
				firstRoundPayload,
				playerData1,
				playerData2,
			);
			io.emit("liveGame", liveGamePayload);
		} catch (err) {
			debug("ERROR creating or joining a game!", err);
		}
	});
};
