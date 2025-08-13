const { ensureQueue, playNext } = require("../systems/queueSystem");
const ytdl = require("@distube/ytdl-core");

function setupEventHandlers(client) {
  // Evento Ready
  client.once("ready", () => {
    console.log(`✅ Bot logado como ${client.user.tag}`);
  });

  // Evento Message
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    
    const serverQueue = client.queues.get(message.guild.id);
    
    try {
      if (message.content.startsWith("!play ")) {
        await handlePlayCommand(client, message);
      }
      else if (message.content === "!queue") {
        handleQueueCommand(message, serverQueue);
      }
      else if (message.content === "!skip") {
        handleSkipCommand(message, serverQueue);
      }
      else if (message.content.startsWith("!remove ")) {
        handleRemoveCommand(message, serverQueue);
      }
      else if (message.content === "!np") {
        handleNowPlayingCommand(message, serverQueue);
      }
      else if (message.content.startsWith("!volume ")) {
        handleVolumeCommand(message, serverQueue);
      }
      else if (message.content === "!pause") {
        handlePauseCommand(message, serverQueue);
      }
      else if (message.content === "!resume") {
        handleResumeCommand(message, serverQueue);
      }
      else if (message.content === "!stop") {
        handleStopCommand(message, serverQueue);
      }
    } catch (error) {
      console.error("Erro ao processar comando:", error);
      message.reply("❌ Ocorreu um erro ao processar seu comando.");
    }
  });
}

async function handlePlayCommand(client, message) {
  const url = message.content.split(" ")[1];

  if (!message.member.voice.channel) {
    return message.reply("🎧 Você precisa estar em um canal de voz!");
  }
  if (!ytdl.validateURL(url)) {
    return message.reply("❌ Link inválido!");
  }

  const serverQueue = ensureQueue(message);

  let title = null;
  try {
    const info = await ytdl.getInfo(url);
    title = info?.videoDetails?.title || null;
  } catch (_) {}

  serverQueue.songs.push({
    url,
    title,
    requestedBy: message.author.globalName || message.author.username,
  });

  if (serverQueue.songs.length === 1) {
    await message.reply(`▶ Tocando agora: ${title || url}`);
    playNext(client, message.guild.id);
  } else {
    await message.reply(`📜 Adicionado à fila: ${title || url}`);
  }
}

function handleQueueCommand(message, serverQueue) {
  if (!serverQueue || !serverQueue.songs.length) {
    return message.reply("📭 A fila está vazia.");
  }

  const list = serverQueue.songs
    .map((s, i) => {
      const prefix = i === 0 ? "🎧 Agora: " : `${i}. `;
      return `${prefix}${s.title || s.url} ${s.requestedBy ? `— por ${s.requestedBy}` : ""}`;
    })
    .slice(0, 15)
    .join("\n");

  message.reply(`🎶 **Fila:**\n${list}`);
}

function handleSkipCommand(message, serverQueue) {
  if (!serverQueue || !serverQueue.songs.length) {
    return message.reply("❌ Não há música para pular.");
  }
  serverQueue.player.stop(true);
  message.reply("⏭ Pulando para a próxima música...");
}

function handleRemoveCommand(message, serverQueue) {
  const index = parseInt(message.content.split(" ")[1]);

  if (!serverQueue || !serverQueue.songs.length) {
    return message.reply("❌ A fila está vazia.");
  }
  if (isNaN(index) || index < 1 || index >= serverQueue.songs.length) {
    return message.reply("❌ Número inválido na fila.");
  }

  const removed = serverQueue.songs.splice(index, 1);
  message.reply(`🗑 Removido: **${removed[0].title || removed[0].url}**`);
}

function handleNowPlayingCommand(message, serverQueue) {
  if (!serverQueue || !serverQueue.songs.length) {
    return message.reply("❌ Nenhuma música está tocando.");
  }
  const current = serverQueue.songs[0];
  message.reply(`🎵 Tocando agora: **${current.title || current.url}**`);
}

function handleVolumeCommand(message, serverQueue) {
  const vol = parseInt(message.content.split(" ")[1]);

  if (!serverQueue) return message.reply("❌ Não estou tocando nada.");
  if (isNaN(vol) || vol < 0 || vol > 100) {
    return message.reply("❌ O volume deve estar entre 0 e 100.");
  }

  serverQueue.volume = vol / 100;
  if (serverQueue.audioResource) {
    serverQueue.audioResource.volume.setVolume(serverQueue.volume);
  }

  message.reply(`🔊 Volume ajustado para **${vol}%**`);
}

function handlePauseCommand(message, serverQueue) {
  if (!serverQueue) return message.reply("❌ Não estou tocando nada.");
  serverQueue.player.pause();
  message.reply("⏸ Música pausada.");
}

function handleResumeCommand(message, serverQueue) {
  if (!serverQueue) return message.reply("❌ Não estou tocando nada.");
  serverQueue.player.unpause();
  message.reply("▶ Música retomada.");
}

function handleStopCommand(message, serverQueue) {
  if (!serverQueue) return message.reply("❌ Não estou tocando nada.");
  serverQueue.songs = [];
  serverQueue.player.stop(true);
  try {
    serverQueue.connection.destroy();
  } catch (_) {}
  client.queues.delete(message.guild.id);
  message.reply("⏹ Música parada e saindo do canal.");
}

module.exports = {
  setupEventHandlers
};
