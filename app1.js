const express = require('express');
const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram } = require('@solana/web3.js');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Initialize Solana connection
const connection = new Connection(process.env.SOLANA_NETWORK, 'confirmed');

// Helper function to get the sender's keypair from the private key stored in the .env file
const getSenderKeypair = () => {
    const secretKey = Uint8Array.from(JSON.parse(process.env.SENDER_PRIVATE_KEY));
    return Keypair.fromSecretKey(secretKey);
};

// POST endpoint to send SOL
app.post('/send', async (req, res) => { 
    const { receiverPublicKey, amount } = req.body;
    
    if (!receiverPublicKey || !amount) {
        return res.status(400).json({ error: 'Receiver public key and amount are required.' });
    }

    try {
        // Get sender's keypair
        const senderKeypair = getSenderKeypair();

        // Convert the receiver's public key string to a PublicKey object
        const receiverPublicKeyObj = new PublicKey(receiverPublicKey);

        // Convert amount to lamports (1 SOL = 1 billion lamports)
        const lamports = amount * LAMPORTS_PER_SOL;

        // Create the transaction instruction to transfer SOL
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: senderKeypair.publicKey,
                toPubkey: receiverPublicKeyObj,
                lamports: lamports,
            })
        );

        // Sign the transaction with the sender's keypair
        const signature = await connection.sendTransaction(transaction, [senderKeypair]);

        // Use getSignatureStatuses to confirm the transaction status
        let confirmed = false;
        while (!confirmed) {
            const { value: status } = await connection.getSignatureStatuses([signature]);
            if (status[0] && status[0].confirmationStatus === 'confirmed') {
                confirmed = true;
            }
            // Wait a bit before checking again
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Return success response
        res.json({ success: true, signature: signature });
    } catch (error) {
        console.error('Transaction error:', error);
        res.status(500).json({ error: 'Transaction failed', details: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
