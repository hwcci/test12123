require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const { Manager } = require('erela.js');

const prefix = process.env.COMMAND_PREFIX || '!';
const defaultVolume = Number(process.env.DEFAULT_VOLUME) || 70;

const botToken = process.env.DISCORD_TOKEN;
const lavalinkHost = process.env.LAVALINK_HOST || '127.0.0.1';
const lavalinkPort = Number(process.env.LAVALINK_PORT) || 2333;
const lavalinkPassword = process.env.LAVALINK_PASSWORD || 'youshallnotpass';
const lavalinkSecure = process.env.LAVALINK_SECURE === 'true';

if (!botToken) {
  console.error('DISCORD_TOKEN مفقود في المتغيرات البيئية.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const manager = new Manager({
  nodes: [
    {
      host: lavalinkHost,
      port: lavalinkPort,
      password: lavalinkPassword,
      secure: lavalinkSecure,
    },
  ],
  send(id, payload) {
    const guild = client.guilds.cache.get(id);
    if (guild?.shard) {
      guild.shard.send(payload);
    }
  },
  autoPlay: true,
});

client.once('ready', () => {
  console.log(`مفعل كسريفر ${client.user.tag}. جاري الاتصال بـ Lavalink...`);
  manager.init(client.user.id);
});

client.on('raw', (packet) => manager.updateVoiceState(packet));

manager.on('nodeConnect', (node) => {
  console.log(`تم الاتصال بـ Lavalink node: ${node.options.identifier}`);
});

manager.on('nodeError', (node, error) => {
  console.error(`خطأ في node ${node.options.identifier}:`, error);
});

manager.on('playerCreate', (player) => {
  player.setVolume(defaultVolume);
  player.on('queueEnd', () => {
    player.destroy();
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || !message.content.startsWith(prefix)) return;
  const [command, ...args] = message.content.slice(prefix.length).trim().split(/\s+/);
  const query = args.join(' ');

  const voiceChannel = message.member.voice.channel;

  switch (command.toLowerCase()) {
    case 'play':
      if (!voiceChannel) {
        return message.reply('دخل صوتك أول، لازم تكون في قناة صوتية.');
      }

      if (!query) {
        return message.reply('أرسل اسم أغنية أو رابط يوتيوب بعد الأمر.');
      }

      try {
        const player = ensurePlayer(message, voiceChannel);
        const source = query.startsWith('http') ? query : `ytsearch:${query}`;
        const result = await manager.search(source, message.author);

        if (result.loadType === 'LOAD_FAILED') {
          console.error(result.exception);
          return message.reply('حدث خطأ أثناء البحث، حاول مرة ثانية.');
        }

        if (result.loadType === 'NO_MATCHES') {
          return message.reply('ما حصلت على أغنية، جرّب اسم ثاني.');
        }

        if (result.loadType === 'TRACK_LOADED' || result.loadType === 'SEARCH_RESULT') {
          player.queue.add(result.tracks[0]);
          if (!player.playing && !player.paused && player.queue.size === 1) {
            player.play();
          }
          return message.reply(`تمت الإضافة: **${result.tracks[0].title}**`);
        }

        if (result.loadType === 'PLAYLIST_LOADED') {
          result.tracks.forEach((track) => player.queue.add(track));
          if (!player.playing && !player.paused) {
            player.play();
          }
          return message.reply(`تمت إضافة قائمة: **${result.playlist.name}** (${result.tracks.length} أغاني).`);
        }
      } catch (error) {
        console.error(error);
        return message.reply('مشكلة غير متوقعة، تأكد من صلاحيات البوت.');
      }
      break;

    case 'skip': {
      const player = manager.players.get(message.guild.id);
      if (!player) return message.reply('ما في شيء يشتغل الحين.');
      player.stop();
      return message.reply('تم التخطّي.');
    }

    case 'stop': {
      const player = manager.players.get(message.guild.id);
      if (!player) return message.reply('ما في شيء يشتغل الحين.');
      player.destroy();
      return message.reply('تم التوقف وترك القناة.');
    }

    case 'queue': {
      const player = manager.players.get(message.guild.id);
      if (!player || player.queue.size === 0) {
        return message.reply('القائمة فارغة.');
      }
      const upcoming = player.queue.slice(0, 5).map((track, index) => `${index + 1}. ${track.title}`);
      return message.reply(`قائمة التشغيل القادمة:\n${upcoming.join('\n')}`);
    }

    case 'volume': {
      const player = manager.players.get(message.guild.id);
      if (!player) return message.reply('ما في شيء يشتغل الحين.');
      const volume = Number(args[0]);
      if (Number.isNaN(volume) || volume < 1 || volume > 150) {
        return message.reply('حط رقم بين 1 و 150.');
      }
      player.setVolume(volume);
      return message.reply(`تم تغيير الصوت لـ ${volume}%`);
    }

    default:
      break;
  }
});

function ensurePlayer(message, voiceChannel) {
  let player = manager.players.get(message.guild.id);
  if (!player) {
    player = manager.create({
      guild: message.guild.id,
      voiceChannel: voiceChannel.id,
      textChannel: message.channel.id,
      selfDeafen: true,
    });
  }
  if (player.state !== 'CONNECTED') {
    player.connect();
  }
  player.set('textChannel', message.channel.id);
  return player;
}

client.login(botToken);
