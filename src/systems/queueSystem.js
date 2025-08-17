const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice");
const ytdl = require("@distube/ytdl-core");

const queues = new Map();

function initializeQueueSystem(client) {
  client.queues = queues;
}

function ensureQueue(message) {
  const guildId = message.guild.id;
  let serverQueue = queues.get(guildId);

  if (!serverQueue) {
    const connection = joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    player.on("error", (err) => {
      console.error("Player error:", err);
      const q = queues.get(guildId);
      if (!q) return;
      q.songs.shift();
      playNext(client, guildId);
    });

    serverQueue = {
      connection,
      player,
      songs: [],
      textChannelId: message.channel.id,
      volume: 0.5,
      audioResource: null,
    };

    queues.set(guildId, serverQueue);
    connection.subscribe(player);
  }

  return serverQueue;
}

async function playNext(client, guildId) {
  const serverQueue = queues.get(guildId);
  if (!serverQueue) return;

  if (!serverQueue.songs.length) {
    try {
      serverQueue.connection.destroy();
    } catch (_) {}
    queues.delete(guildId);
    return;
  }

  const current = serverQueue.songs[0];

  const stream = ytdl(current.url, {
    filter: "audioonly",
    quality: "highestaudio",
    highWaterMark: 1 << 25,
  });

  const resource = createAudioResource(stream, { inlineVolume: true });
  resource.volume.setVolume(serverQueue.volume || 0.5);
  serverQueue.audioResource = resource;

  serverQueue.player.once(AudioPlayerStatus.Idle, () => {
    serverQueue.songs.shift();
    playNext(client, guildId);
  });

  serverQueue.player.play(resource);

  const channel = serverQueue.textChannelId
    ? client.channels.cache.get(serverQueue.textChannelId)
    : null;
  if (channel) {
    channel.send(`▶ **Tocando agora:** ${current.title || current.url}`);
  }
}

module.exports = {
  initializeQueueSystem,
  ensureQueue,
  playNext,
  queues
};
