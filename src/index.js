require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { joinVoiceChannel, createAudioPlayer } = require("@discordjs/voice");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Importar handlers
const { setupEventHandlers } = require("./handlers/eventHandler");
const { initializeQueueSystem } = require("./systems/queueSystem");

// Inicializar sistemas
initializeQueueSystem(client);
setupEventHandlers(client);

client.login(process.env.TOKEN);
