import "./assets/scss/style.scss";
import { io, Socket } from "socket.io-client";
import {
	ClientToServerEvents,
	PlayerData,
	ServerToClientEvents,
	VirusData,
} from "@backend/types/shared/socket_types";

const SOCKET_HOST = import.meta.env.VITE_APP_SOCKET_HOST;
const socket: Socket<ServerToClientEvents, ClientToServerEvents> =
	io(SOCKET_HOST);

// ──── DOM refs ────
const usernameFormEl = document.querySelector(
	"#username-form",
) as HTMLFormElement;
const enterBtnEl = document.querySelector("#enter") as HTMLButtonElement;
const waitingMsgEl = document.querySelector("#waiting-msg") as HTMLDivElement;
const toLobbyEl = document.querySelector("#toLobby") as HTMLButtonElement;

const lobbyEl = document.querySelector("#lobby") as HTMLDivElement;
const gameEl = document.querySelector("#game") as HTMLDivElement;
const endGameBoardEl = document.querySelector(
	"#endGameBoard",
) as HTMLDivElement;

const gameScreenEl = document.querySelector("#gameScreen") as HTMLDivElement;
const roundBadgeEl = document.querySelector("#roundBadge") as HTMLDivElement;
const roundDotsEl = document.querySelector("#roundDots") as HTMLDivElement;
const countdownEl = document.querySelector(
	"#countdown-overlay",
) as HTMLDivElement;
const countdownNumEl = document.querySelector(
	"#countdown-number",
) as HTMLSpanElement;
const earlyWarnEl = document.querySelector(
	"#early-click-warn",
) as HTMLDivElement;
const roundResultEl = document.querySelector("#round-result") as HTMLDivElement;
const roundResultTextEl = document.querySelector(
	"#round-result-text",
) as HTMLSpanElement;

const winnerTitleEl = document.querySelector(
	"#winnerTitle",
) as HTMLHeadingElement;
const winnerEl = document.querySelector("#winner") as HTMLHeadingElement;
const trophyIconEl = document.querySelector("#trophyIcon") as HTMLDivElement;
const yourReactionTimeEl = document.querySelector(
	"#yourReactionTime",
) as HTMLParagraphElement;
const opponentReactionTimeEl = document.querySelector(
	"#opponentReactionTime",
) as HTMLParagraphElement;
const yourScoreEl = document.querySelector(
	"#yourScore",
) as HTMLParagraphElement;
const opponentScoreEl = document.querySelector(
	"#opponentScore",
) as HTMLParagraphElement;

const liveTimerEl = document.querySelector("#liveTimer") as HTMLSpanElement;
const myTimeEl = document.querySelector("#myTime") as HTMLSpanElement;
const opponentTimeEl = document.querySelector(
	"#opponentTime",
) as HTMLSpanElement;
const scoreEl = document.querySelector("#score") as HTMLDivElement;
const yourNameLabelEl = document.querySelector(
	"#yourNameLabel",
) as HTMLSpanElement;
const oppNameLabelEl = document.querySelector(
	"#opponentNameLabel",
) as HTMLSpanElement;

const gameListEl = document.querySelector("#gameList") as HTMLUListElement;
const reactionListEl = document.querySelector(
	"#reactionList",
) as HTMLUListElement;
const noLiveGamesEl = document.querySelector(
	"#noLiveGames",
) as HTMLParagraphElement;
const noRecentGamesEl = document.querySelector(
	"#noRecentGames",
) as HTMLParagraphElement;

// ──── State ────
let username: string | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let counter = 0;
let currentRound = 1;
let virusVisible = false; // true only while virus is on screen
const TOTAL_ROUNDS = 10;

// ──── Helpers ────

function showView(view: "lobby" | "game" | "end") {
	lobbyEl.style.display = view === "lobby" ? "" : "none";
	gameEl.style.display = view === "game" ? "flex" : "none";
	endGameBoardEl.style.display = view === "end" ? "flex" : "none";
}

/** Render the 10 round-dots in the sidebar */
function renderRoundDots() {
	roundDotsEl.innerHTML = Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
		const cls = i + 1 === currentRound ? "current" : "";
		return `<span class="round-dot ${cls}" data-round="${i + 1}"></span>`;
	}).join("");
}

/** Animated 3-2-1 countdown, resolves when done */
function playCountdown(): Promise<void> {
	return new Promise((resolve) => {
		countdownEl.classList.remove("hide");
		let n = 3;
		countdownNumEl.textContent = String(n);

		const iv = setInterval(() => {
			n--;
			if (n > 0) {
				countdownNumEl.textContent = String(n);
				// re-trigger animation
				countdownNumEl.style.animation = "none";
				void countdownNumEl.offsetWidth; // reflow
				countdownNumEl.style.animation = "";
			} else {
				countdownNumEl.textContent = "GO!";
				setTimeout(() => {
					countdownEl.classList.add("hide");
					resolve();
				}, 350);
				clearInterval(iv);
			}
		}, 650);
	});
}

function startTimer() {
	const start = Date.now();
	timerInterval = setInterval(() => {
		counter = (Date.now() - start) / 1000;
		liveTimerEl.textContent = counter.toFixed(3);
	}, 16); // ~60 fps
}

function stopTimer() {
	if (timerInterval) {
		clearInterval(timerInterval);
		timerInterval = null;
	}
}

function flashEarlyWarning() {
	earlyWarnEl.classList.remove("hide");
	earlyWarnEl.style.animation = "none";
	void earlyWarnEl.offsetWidth;
	earlyWarnEl.style.animation = "";
	setTimeout(() => earlyWarnEl.classList.add("hide"), 900);
}

/** Show explosion then clear game screen */
function showExplosion(row: number, col: number) {
	gameScreenEl.innerHTML = `
    <div class="explosion" style="grid-row:${row};grid-column:${col};">💥</div>
  `;
	setTimeout(() => {
		gameScreenEl.innerHTML = "";
	}, 450);
}

/** Toggle empty-state hints based on list children */
function refreshListHints() {
	noLiveGamesEl.classList.toggle("hide", gameListEl.children.length > 0);
	noRecentGamesEl.classList.toggle(
		"hide",
		reactionListEl.children.length > 0,
	);
}

// ──── Virus display (with countdown on first round) ────

async function displayVirus(virusData: VirusData, isFirstRound = false) {
	const { row, column, delay } = virusData;

	virusVisible = false;
	stopTimer();
	liveTimerEl.textContent = "0.000";
	myTimeEl.textContent = "—";
	opponentTimeEl.textContent = "—";

	roundBadgeEl.textContent = `Round ${currentRound} / ${TOTAL_ROUNDS}`;
	renderRoundDots();

	if (isFirstRound) await playCountdown();

	// Delay before virus pops up
	setTimeout(() => {
		gameScreenEl.innerHTML = `
      <div class="virus" id="virus"
           style="grid-row:${row};grid-column:${column};"
           data-row="${row}" data-col="${column}">🦠</div>
    `;
		virusVisible = true;
		startTimer();
	}, delay);
}

// ──── Socket events ────

// Latest games
socket.on("tenLatestGames", (latestGames) => {
	reactionListEl.innerHTML = latestGames
		.map(
			(g) =>
				`<li>${g.player1} <strong>${g.player1Score}</strong> — <strong>${g.player2Score}</strong> ${g.player2}</li>`,
		)
		.join("");
	refreshListHints();
});

// Best reaction time
socket.on("bestEverReactionTime", (name, time) => {
	const el = document.querySelector("#highScore")!;
	el.textContent = name && time ? `${name} — ${time}s` : "—";
});

// Best average
socket.on("bestAverageReactionTime", (name, time) => {
	const el = document.querySelector("#averageHighScore")!;
	el.textContent = name && time ? `${name} — ${time}s` : "—";
});

// Live game update
socket.on("liveGame", (data) => {
	const {
		player1Username,
		player1Score,
		player2Username,
		player2Score,
		gameRoomId,
	} = data;
	const info = `${player1Username} <strong>${player1Score}</strong> <span class="emoji">⚔️</span> <strong>${player2Score}</strong> ${player2Username}`;

	const existing = document.getElementById(gameRoomId);
	if (existing) {
		existing.innerHTML = info;
	} else {
		gameListEl.innerHTML += `<li id="${gameRoomId}">${info}</li>`;
	}
	refreshListHints();
});

socket.on("liveGames", (games) => {
	gameListEl.innerHTML = games
		.map(
			(g) =>
				`<li id="${g.gameRoomId}">${g.player1Username} <strong>${g.player1Score}</strong> <span class="emoji">⚔️</span> <strong>${g.player2Score}</strong> ${g.player2Username}</li>`,
		)
		.join("");
	refreshListHints();
});

socket.on("removeLiveGame", (id) => {
	document.getElementById(id)?.remove();
	refreshListHints();
});

// ──── Game flow ────

socket.on("firstRound", (firstRoundData, p1: PlayerData, p2: PlayerData) => {
	currentRound = 1;

	if (socket.id === p1.id) {
		yourNameLabelEl.textContent = p1.name;
		oppNameLabelEl.textContent = p2.name;
	} else {
		yourNameLabelEl.textContent = p2.name;
		oppNameLabelEl.textContent = p1.name;
	}

	scoreEl.textContent = "0 — 0";
	showView("game");
	displayVirus(firstRoundData, true);
});

socket.on("newRound", (data) => {
	currentRound++;
	displayVirus(data);
});

socket.on("updateScore", (p1Score, p2Score, p1Id) => {
	scoreEl.textContent =
		socket.id === p1Id
			? `${p1Score} — ${p2Score}`
			: `${p2Score} — ${p1Score}`;
});

socket.on("reactionTime", (rt) => {
	opponentTimeEl.textContent = `${rt.toFixed(3)}s`;
});

// Round won — first clicker wins the round instantly
socket.on("roundWon", (winnerId, winnerName, winnerTime) => {
	virusVisible = false;
	stopTimer();

	// Clear the virus from screen
	gameScreenEl.innerHTML = "";

	const iWon = winnerId === socket.id;

	if (!iWon) {
		opponentTimeEl.textContent = `${winnerTime.toFixed(3)}s`;
	}

	// Show round result banner
	roundResultEl.classList.remove("hide", "win", "lose");
	roundResultEl.classList.add(iWon ? "win" : "lose");
	roundResultTextEl.textContent = iWon
		? `You won this round! (${winnerTime.toFixed(3)}s)`
		: `${winnerName} was faster! (${winnerTime.toFixed(3)}s)`;

	// Hide banner before next round starts
	setTimeout(() => {
		roundResultEl.classList.add("hide");
	}, 1400);
});

socket.on("endGame", (users) => {
	const [u1, u2] = users;
	showView("end");

	// Determine winner
	const winner = u1.averageReactionTime! < u2.averageReactionTime! ? u1 : u2;
	const isMe = winner.id === socket.id;

	winnerTitleEl.textContent = "Winner";
	winnerEl.textContent = winner.name;
	trophyIconEl.textContent = isMe ? "🏆" : "😢";

	const me = u1.id === socket.id ? u1 : u2;
	const opp = u1.id === socket.id ? u2 : u1;

	yourReactionTimeEl.textContent = `Avg reaction: ${me.averageReactionTime!.toFixed(3)}s`;
	yourScoreEl.textContent = `Score: ${me.score}`;
	opponentReactionTimeEl.textContent = `Avg reaction: ${opp.averageReactionTime!.toFixed(3)}s`;
	opponentScoreEl.textContent = `Score: ${opp.score}`;
});

socket.on("opponentLeft", () => {
	showView("end");
	winnerTitleEl.textContent = "Opponent left";
	winnerEl.textContent = "You win by default!";
	trophyIconEl.textContent = "🚪";
});

// ──── User actions ────

usernameFormEl.addEventListener("submit", (e) => {
	e.preventDefault();
	username = (
		usernameFormEl.querySelector("#username-input") as HTMLInputElement
	).value.trim();
	if (!username) return;

	enterBtnEl.setAttribute("disabled", "disabled");
	waitingMsgEl.classList.remove("hide");
	socket.emit("userJoin", username);
});

// Click on game screen — virus hit or early click
gameScreenEl.addEventListener("click", (e) => {
	const target = e.target as HTMLElement;

	// Early click (no virus yet)
	if (!virusVisible || !target.classList.contains("virus")) {
		if (!virusVisible && gameEl.style.display === "flex")
			flashEarlyWarning();
		return;
	}

	// Valid click
	virusVisible = false;
	stopTimer();

	const row = Number(target.dataset.row) || 5;
	const col = Number(target.dataset.col) || 5;
	showExplosion(row, col);

	const timeTaken = counter;
	myTimeEl.textContent = `${timeTaken.toFixed(3)}s`;
	socket.emit("clickVirus", timeTaken);
});

toLobbyEl.addEventListener("click", () => {
	location.reload();
});

// Initialise empty-state hints
refreshListHints();

export default socket;
