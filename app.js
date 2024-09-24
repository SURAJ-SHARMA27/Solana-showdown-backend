const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json()); // For parsing JSON requests
app.use(cors()); // Enable CORS

// MongoDB connection
const mongoURI = "mongodb+srv://surajrace21:123@users.klkfw.mongodb.net/?retryWrites=true&w=majority&appName=users"; // Replace with your MongoDB URI
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));

// Game schema
const gameSchema = new mongoose.Schema({
    createdBy: String,
    startingAmount: Number,
    duration: Number,
    endTime: Date,
    userCount: { type: Number, default: 0 },
    payers: [
        {
            publicKey: String,
            amount: Number,
        },
    ],
    prize: { type: Number, default: 0 },
    winner: String,
    isActive:{type: Boolean, default:true},
    expiredAt:Date,
    isWinnerPaid:{type: Boolean, default:false},
});

const Game = mongoose.model("Game", gameSchema);

// Start a new game
app.get("/",(req,res)=>{
    console.log("Hello this is health checkup and successfull")
    res.send({ "message": "Hello, this is health checkup and successful" });
    })
app.post("/game/create", async (req, res) => {
    const { createdBy, startingAmount, duration,publicKey } = req.body;

    // Check for an active game
    const activeGame = await Game.findOne({ endTime: { $gte: new Date() } });
    if (activeGame) {
        return res.status(400).json({ message: "A game is already active." });
    }

    const endTime = new Date(Date.now() + duration * 1000);
    const winner=createdBy;
    const prize=startingAmount;
    const amount=prize;
    const newGame = new Game({ createdBy, startingAmount, duration, endTime,winner,prize });
    newGame.payers.push({ publicKey, amount });  
    await newGame.save();

    // Set a timeout to end the game automatically
    setTimeout(async () => {
        newGame.userCount = 0; // Reset user count or apply any other logic
        newGame.isActive=false;
        console.log(publicKey,prize,"here is this")
        newGame.expiredAt=Date.now();
        await newGame.save();
        console.log(`Game ended: ${newGame._id}`);
    }, duration * 1000); // Duration in milliseconds

    res.json(newGame);
});

// Join the game
app.post("/game/join", async (req, res) => {
    const { publicKey, amount } = req.body;

    // Find the active game
    const activeGame = await Game.findOne({ endTime: { $gte: new Date() } });
    if (!activeGame) {
        return res.status(404).json({ message: "No active game found." });
    }

    // Calculate total amount contributed so far
    const totalContribution = activeGame.payers.reduce((acc, payer) => acc + payer.amount, 0);

    // Check if the joining amount is at least double the current total amount
    if (amount < 2 * totalContribution) {
        return res.status(400).json({ message: `You need to contribute at least ${2 * totalContribution} SOL to join the game.` });
    }

    // Add the payer to the payers array
    activeGame.payers.push({ publicKey, amount });
    activeGame.prize += amount; // Update the prize amount
    activeGame.winner = publicKey; // Update the winner to the latest payer

    await activeGame.save();

    res.json({
        message: "Joined the game successfully!",
        game: activeGame,
    });
});

// Get the current game
app.get("/game/current", async (req, res) => {
    const currentGame = await Game.findOne({ endTime: { $gte: new Date() } });
    if (!currentGame) {
        return res.status(404).json({ message: "No active game found." });
    }
    res.json(currentGame);
});

// Find game status
app.get("/game/findstatus", async (req, res) => {
    const activeGame = await  Game.findOne({ isActive: true })

   
    res.json({ isActive: !!activeGame });
});

// Get game dashboard (winner and payers sorted)
app.get("/game/dashboard", async (req, res) => {
    const activeGame = await Game.findOne({ endTime: { $gte: new Date() } });
    if (!activeGame) {
        return res.status(404).json({ message: "No active game found." });
    }

    // Sort payers by amount in descending order
    const sortedPayers = activeGame.payers.sort((a, b) => b.amount - a.amount);

    res.json({
        winner: activeGame.winner,
        payers: sortedPayers,
        prize: activeGame.prize,
    });
});

app.get("/game/findRecent", async (req, res) => {
    const recentGame = await Game.findOne().sort({ expiredAt: -1 });
    if (!recentGame) {
        return res.status(404).json({ message: "No Recent game found." });
    }

    // Sort payers by amount in descending order
    const sortedPayers = recentGame.payers.sort((a, b) => b.amount - a.amount);

    res.json({
        winner: recentGame.winner,
        payers: sortedPayers,
        prize: recentGame.prize,
    });
});
app.get("/game/findWinner", async (req, res) => {
    const recentGame = await Game.findOne().sort({ expiredAt: -1 });

   
    if (!recentGame) {
        return res.status(404).json({ message: "No Recent game found." });
    }
    res.json({
        winner: recentGame.winner,
        amount: recentGame.prize,
        isPaid:isWinnerPaid
    });
});
app.get("/game/postWinner", async (req, res) => {
    const recentGame = await Game.findOne().sort({ expiredAt: -1 });
    if (!recentGame) {
        return res.status(404).json({ message: "No Recent game found." });
    }
    recentGame.isWinnerPaid=true;
    await recentGame.save();
});
// Server listening
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
