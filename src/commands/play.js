const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ApplicationCommandOptionType,
} = require("discord.js");

const {
  createAudioResource,
  joinVoiceChannel,
  createAudioPlayer,
  VoiceConnectionStatus,
  AudioPlayerStatus,
  entersState,
  StreamType,
} = require("@discordjs/voice");

const fs = require("fs");
const path = require("path");
const { activeSessions } = require("../utils/session");
const logger = require("../utils/logger");
const { setNowPlaying, clearNowPlaying } = require("../utils/status");

const ITEMS_PER_PAGE = 25;
const VOLUME_DEFAULT = 10;
const VOLUME_STEP = 10;
const VOLUME_MIN = 0;
const VOLUME_MAX = 200;

module.exports = {
  name: "play",
  category: "Music",
  description: "Play radio with an interactive control panel",
  hidden: false,
  options: [
    {
      name: "list",
      description: "Browse radio stations with a paginated list",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "station",
      description: "Search and play a specific radio station",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "name",
          description: "Type to search for a radio station",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
        },
      ],
    },
  ],

  autocomplete: async (client, interaction) => {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const jsonPath = path.join(__dirname, "../assets/radio-list.json");

    if (!fs.existsSync(jsonPath)) return interaction.respond([]);

    const allRadio = JSON.parse(fs.readFileSync(jsonPath, { encoding: "utf-8" }));
    const filtered = allRadio.filter((item) =>
      item.nativeRadioName.toLowerCase().includes(focusedValue),
    );

    await interaction.respond(
      filtered.slice(0, 25).map((item) => ({
        name: item.nativeRadioName.substring(0, 100),
        value: item.radioName,
      })),
    );
  },

  callback: async (client, interaction) => {
    const jsonPath = path.join(__dirname, "../assets/radio-list.json");

    if (!fs.existsSync(jsonPath)) {
      return interaction.reply({
        content: "Radio list database is not available.",
        ephemeral: true,
      });
    }

    const allRadio = JSON.parse(fs.readFileSync(jsonPath, { encoding: "utf-8" }));
    const subcommand = interaction.options.getSubcommand();
    const member = interaction.guild.members.cache.get(interaction.user.id);
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: "You must be connected to a voice channel.",
        ephemeral: true,
      });
    }

    if (subcommand === "station") {
      await interaction.deferReply();

      const selectedRadioName = interaction.options.getString("name");
      const selectedRadio = allRadio.find((r) => r.radioName === selectedRadioName);

      if (!selectedRadio) {
        return interaction.editReply({
          content: "Station not found. Please select an option from autocomplete.",
        });
      }

      await setupAndPlayRadio(interaction, voiceChannel, selectedRadio, allRadio);
      return;
    }

    if (subcommand === "list") {
      let currentPage = 0;
      const totalPages = Math.ceil(allRadio.length / ITEMS_PER_PAGE);

      const generateListComponents = (page) => {
        const start = page * ITEMS_PER_PAGE;
        const currentList = allRadio.slice(start, start + ITEMS_PER_PAGE);

        const selectOptions = currentList.map((item) => ({
          label: item.nativeRadioName.substring(0, 100),
          value: item.radioName.substring(0, 100),
        }));

        const selectMenuRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("radio_select_list")
            .setPlaceholder(`Select station (Page ${page + 1}/${totalPages})`)
            .addOptions(selectOptions),
        );

        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("list_prev")
            .setLabel("Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId("list_next")
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1),
        );

        return [selectMenuRow, buttonRow];
      };

      const embed = new EmbedBuilder()
        .setAuthor({ name: "RADIO DIRECTORY" })
        .setColor("#2B2D31")
        .setDescription(
          `Total stations: **${allRadio.length}**\nSelect a station from the menu below to start streaming.`,
        )
        .setFooter({ text: `Page ${currentPage + 1} of ${totalPages}` });

      const replyResponse = await interaction.reply({
        embeds: [embed],
        components: generateListComponents(currentPage),
        withResponse: true,
      });

      const fetchInteraction = replyResponse.resource?.message || (await interaction.fetchReply());

      const collector = fetchInteraction.createMessageComponentCollector({
        time: 120_000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: "Unauthorized interaction.", ephemeral: true });
        }

        if (i.componentType === ComponentType.Button) {
          if (i.customId === "list_prev" && currentPage > 0) currentPage--;
          else if (i.customId === "list_next" && currentPage < totalPages - 1) currentPage++;

          embed.setFooter({ text: `Page ${currentPage + 1} of ${totalPages}` });

          return i.update({
            embeds: [embed],
            components: generateListComponents(currentPage),
          });
        }

        if (i.componentType === ComponentType.StringSelect) {
          await i.deferUpdate();
          const currentVoiceChannel = i.member?.voice?.channel;
          if (!currentVoiceChannel) {
            return i.followUp({
              content: "You must be connected to a voice channel.",
              ephemeral: true,
            });
          }

          const selectedRadio = allRadio.find((r) => r.radioName === i.values[0]);
          await setupAndPlayRadio(i, currentVoiceChannel, selectedRadio, allRadio);
          collector.stop("selected");
        }
      });
    }
  },
};

/**
 * Build the radio control panel embed and interactive components
 * @param {Object} radioObj - The radio station object
 * @param {VoiceChannel} voiceChannel - The voice channel the bot is in
 * @param {string} statusText - Current status label (PLAYING, PAUSED, etc.)
 * @param {User} user - The user who requested the station
 * @param {Array} allRadio - Full list of radio stations
 * @param {string} statusColor - Hex color for the embed
 * @param {number} stationPage - Current page index of the station select menu
 * @param {number} volume - Current volume (0–200)
 */
const buildControlCard = (
  radioObj,
  voiceChannel,
  statusText,
  user,
  allRadio,
  statusColor = "#2B2D31",
  stationPage = 0,
  volume = VOLUME_DEFAULT,
) => {
  const totalStationPages = Math.ceil(allRadio.length / ITEMS_PER_PAGE);
  const stationStart = stationPage * ITEMS_PER_PAGE;
  const currentStations = allRadio.slice(stationStart, stationStart + ITEMS_PER_PAGE);

  const embed = new EmbedBuilder()
    .setAuthor({
      name: radioObj.nativeRadioName,
      iconURL:
        radioObj.radioImg && radioObj.radioImg.startsWith("http") ? radioObj.radioImg : undefined,
    })
    .setColor(statusColor)
    .setThumbnail(
      radioObj.radioImg && radioObj.radioImg.startsWith("http") ? radioObj.radioImg : null,
    )
    .setDescription(
      `Status: **${statusText}**\nChannel: <#${voiceChannel.id}>\nVolume: **${volume}%**`,
    )
    .setFooter({
      text: `Requested by ${user.username}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    });

  const selectOptions = currentStations.map((item) => ({
    label: item.nativeRadioName.substring(0, 100),
    value: item.radioName.substring(0, 100),
  }));

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("switch_station")
      .setPlaceholder(`Change station... (Page ${stationPage + 1}/${totalStationPages})`)
      .addOptions(selectOptions),
  );

  const stationNavRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_station_prev")
      .setLabel("◀ Stations")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(stationPage === 0),
    new ButtonBuilder()
      .setCustomId("btn_station_next")
      .setLabel("Stations ▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(stationPage >= totalStationPages - 1),
    new ButtonBuilder()
      .setCustomId("btn_vol_down")
      .setLabel("🔉 Vol -")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(volume <= VOLUME_MIN),
    new ButtonBuilder()
      .setCustomId("btn_vol_up")
      .setLabel("🔊 Vol +")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(volume >= VOLUME_MAX),
  );

  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("btn_pause").setLabel("Pause").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("btn_resume")
      .setLabel("Resume")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("btn_stop").setLabel("Stop").setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [selectRow, stationNavRow, controlRow] };
};

/**
 * Audio Connection & Controller Setup
 * @param {CommandInteraction|MessageComponentInteraction} interaction
 * @param {VoiceChannel} voiceChannel
 * @param {Object} radioObj
 * @param {Array} allRadio
 */
const setupAndPlayRadio = async (interaction, voiceChannel, radioObj, allRadio) => {
  const guildId = voiceChannel.guildId;

  if (activeSessions.has(guildId)) {
    const oldSession = activeSessions.get(guildId);
    try {
      oldSession.collector?.stop("replaced");
      oldSession.player.stop();
      oldSession.connection.destroy();
    } catch {}
    activeSessions.delete(guildId);
  }

  const connection = joinVoiceChannel({
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    channelId: voiceChannel.id,
    guildId: guildId,
    selfDeaf: true,
  });

  const player = createAudioPlayer();
  const resource = createAudioResource(radioObj.streamURL, {
    inputType: StreamType.Arbitrary,
    inlineVolume: true,
  });

  resource.volume.setVolume(VOLUME_DEFAULT / 100);

  player.play(resource);
  connection.subscribe(player);

  const payload = buildControlCard(
    radioObj,
    voiceChannel,
    "PLAYING",
    interaction.user,
    allRadio,
    "#57F287",
    0,
    VOLUME_DEFAULT,
  );

  let controlMessage = await interaction.editReply(payload);

  const controlCollector = controlMessage.createMessageComponentCollector({
    time: 86_400_000,
  });

  activeSessions.set(guildId, {
    connection,
    player,
    resource,
    collector: controlCollector,
    message: controlMessage,
    radioObj,
    voiceChannel,
    user: interaction.user,
    allRadio,
    stationPage: 0,
    volume: VOLUME_DEFAULT,
  });

  setNowPlaying(interaction.client, radioObj.nativeRadioName);

  controlCollector.on("collect", async (i) => {
    const session = activeSessions.get(guildId);
    if (!session) return;

    const isPaused = player.state.status === AudioPlayerStatus.Paused;
    const displayStatus = isPaused ? "PAUSED" : "PLAYING";
    const displayColor = isPaused ? "#FEE75C" : "#57F287";

    if (i.customId === "btn_pause") {
      if (player.pause()) {
        await i.update(
          buildControlCard(
            radioObj,
            voiceChannel,
            "PAUSED",
            interaction.user,
            allRadio,
            "#FEE75C",
            session.stationPage,
            session.volume,
          ),
        );
      } else {
        await i.reply({ content: "Failed to pause playback.", ephemeral: true });
      }
    } else if (i.customId === "btn_resume") {
      if (player.unpause()) {
        await i.update(
          buildControlCard(
            radioObj,
            voiceChannel,
            "PLAYING",
            interaction.user,
            allRadio,
            "#57F287",
            session.stationPage,
            session.volume,
          ),
        );
      } else {
        await i.reply({ content: "Failed to resume playback.", ephemeral: true });
      }
    } else if (i.customId === "btn_stop") {
      player.stop();
      connection.destroy();
      activeSessions.delete(guildId);
      controlCollector.stop("stopped");
      clearNowPlaying(i.client);

      await i.update({
        content: "Playback stopped.",
        embeds: [],
        components: [],
      });
    } else if (i.customId === "btn_station_prev") {
      if (session.stationPage > 0) {
        session.stationPage--;
        await i.update(
          buildControlCard(
            radioObj,
            voiceChannel,
            displayStatus,
            interaction.user,
            allRadio,
            displayColor,
            session.stationPage,
            session.volume,
          ),
        );
      } else {
        await i.deferUpdate();
      }
    } else if (i.customId === "btn_station_next") {
      const totalStationPages = Math.ceil(allRadio.length / ITEMS_PER_PAGE);
      if (session.stationPage < totalStationPages - 1) {
        session.stationPage++;
        await i.update(
          buildControlCard(
            radioObj,
            voiceChannel,
            displayStatus,
            interaction.user,
            allRadio,
            displayColor,
            session.stationPage,
            session.volume,
          ),
        );
      } else {
        await i.deferUpdate();
      }
    } else if (i.customId === "btn_vol_down") {
      session.volume = Math.max(VOLUME_MIN, session.volume - VOLUME_STEP);
      session.resource.volume.setVolume(session.volume / 100);
      await i.update(
        buildControlCard(
          radioObj,
          voiceChannel,
          displayStatus,
          interaction.user,
          allRadio,
          displayColor,
          session.stationPage,
          session.volume,
        ),
      );
    } else if (i.customId === "btn_vol_up") {
      session.volume = Math.min(VOLUME_MAX, session.volume + VOLUME_STEP);
      session.resource.volume.setVolume(session.volume / 100);
      await i.update(
        buildControlCard(
          radioObj,
          voiceChannel,
          displayStatus,
          interaction.user,
          allRadio,
          displayColor,
          session.stationPage,
          session.volume,
        ),
      );
    } else if (i.customId === "switch_station") {
      await i.deferUpdate();
      const newRadioName = i.values[0];
      const newRadio = allRadio.find((r) => r.radioName === newRadioName);

      if (newRadio) {
        player.stop();
        controlCollector.stop("switched");
        const currentVoiceChannel = i.member?.voice?.channel || voiceChannel;
        await setupAndPlayRadio(i, currentVoiceChannel, newRadio, allRadio);
      }
    }
  });

  player.on("error", (err) => {
    logger.error(`Player error: ${err.message}`);
    const session = activeSessions.get(guildId);
    controlMessage
      .edit(
        buildControlCard(
          radioObj,
          voiceChannel,
          "STREAM ERROR",
          interaction.user,
          allRadio,
          "#ED4245",
          session?.stationPage ?? 0,
          session?.volume ?? VOLUME_DEFAULT,
        ),
      )
      .catch(() => {});
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
      ]);
    } catch {
      const session = activeSessions.get(guildId);
      connection.destroy();
      activeSessions.delete(guildId);
      clearNowPlaying(interaction.client);
      controlMessage
        .edit(
          buildControlCard(
            radioObj,
            voiceChannel,
            "DISCONNECTED",
            interaction.user,
            allRadio,
            "#ED4245",
            session?.stationPage ?? 0,
            session?.volume ?? VOLUME_DEFAULT,
          ),
        )
        .catch(() => {});
    }
  });
};
