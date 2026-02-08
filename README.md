# 🦠 KILL THE VIRUS 🦠

Welcome to the Kill the Virus game! This is a fun and interactive game where you can test your reaction time by whacking viruses. The game keeps track of the best times and allows multiplayer interaction. Ready to kill some viruses? Let’s get started!

## 🚀 Quick Start Guide

### Prerequisites

- [Node.js](https://nodejs.org/)
- [Prisma](https://www.prisma.io/) 
- [MongoDB](https://www.mamp.info/en/) (A MongoDB account and Database)
- A good sense of humor and a knack for speed! ⚡

### Installation

1. **Clone the Repository**

   ```sh
   git clone https://github.com/your-username/whack-a-virus.git
   cd whack-a-virus
   ```

2. **Install Dependencies**

   For the backend:
   ```sh
   cd backend
   npm install
   ```

   For the frontend:
   ```sh
   cd frontend
   npm install
   ```

3. **Set Up Environment Variables**

   Create a `.env` file in both the `backend` and `frontend` directories based on the provided `.env.example` files.

### Running the Application

1. **Backend**

   Start the backend server:
   ```sh
   cd backend
   npm start
   ```

2. **Frontend**

   Start the frontend server:
   ```sh
   cd frontend
   npm run dev
   ```

3. **Docker**

   Alternatively, you can use Docker to run both frontend and backend:

   ```sh
   docker-compose up
   ```

### Tech Stack

- **Frontend:** TypeScript, Vite, HTML, SCSS
- **Backend:** TypeScript, Node.js, Prisma, MongoDB
- **Realtime Communication:** Socket.IO
- **Containerization:** Docker

## 📂 Project Structure

Here's an overview of the project structure:

### Backend

- `controllers/` - Contains the controllers for handling various routes.
- `routes/` - Defines the API routes.
- `services/` - Contains the business logic of the application.
- `types/` - Defines TypeScript types used across the project.
- `prisma/` - Prisma ORM configuration and schema.

### Frontend

- `public/` - Static assets.
- `src/` - Main source code for the frontend application.
  - `assets/` - Static assets like styles and images.
  - `main.ts` - Entry point for the frontend application.

## 🏆 High Scores

The game keeps track of the best ever reaction times and average reaction times. Can you top the leaderboard?

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 🎉 Acknowledgements

- Thanks to all contributors and players who made this game awesome!
