<!--suppress HtmlDeprecatedAttribute -->

![logo](https://repository-images.githubusercontent.com/556876246/21bb7e66-4998-42b0-9d6f-651727daffda)

<div align="center">

[![Dashboard](https://img.shields.io/static/v1?style=for-the-badge&logo=google%20chrome&label=Dashboard&message=kalliope.cc&color=121212)](https://kalliope.cc)
[![Discord](https://shields.io/discord/610498937874546699?style=for-the-badge&logo=discord&label=discord)](https://discord.gg/qX2CBrrUpf)
[![License](https://img.shields.io/github/license/MeridianGH/Kalliope?logo=gnu&style=for-the-badge)](https://github.com/MeridianGH/Kalliope/blob/main/LICENSE.md)

# Kalliope.

<b>A Discord music bot that still supports most platforms.</b>

</div>
<br/>

<details>
<summary style="cursor: pointer"><b>Table of Contents</b></summary>

- [Features](#features)
- [Commands](#commands)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Getting started](#getting-started)
  - [Configuration](#configuration)
  - [Run](#run)
- [Stats](#stats)
  - [Code](#code)
  - [GitHub](#github)
- [Licensing](#licensing)

</details>

---

## Disclaimer
> The bot is still in development, so expect some bugs or features that might not work 100% yet. Please report any bugs you encounter by opening an issue.


## Features
- Kalliope still offers full support for almost every platform you can imagine:
  - YouTube, Spotify, Twitch and many others!
  - It also supports playlists, livestreams and HTTP sources.
  - Spotify queries will be resolved on YouTube.

- High quality
  - Kalliope is using the well established **[Lavalink](https://github.com/freyacodes/Lavalink)** library.
  - It allows for high quality playback by hosting its own audio server and streaming directly to Discord.


- YouTube Search
  - Search up to five songs from YouTube and play one directly from Discord, without ever opening a browser!
  - Playing music in your channel was never this easy.


- Dashboard
  - Use the web dashboard to control your bot without having to type out commands ever again.
  - You can even use your keyboard's built-in music buttons to skip songs and pause or resume playback.


- Genius Lyrics
  - Kalliope supports Genius Lyrics!
  - Quite literally actually, because they are directly accessible in Discord itself via a command.


## Commands
Kalliope uses slash commands to integrate itself into the server. You can easily access the commands directly by typing `/` in your chat window.

<details>
<summary style="cursor: pointer"><b>Show all commands</b></summary>

| Command     | Description                                                       |
|-------------|-------------------------------------------------------------------|
| /clear      | Clears the queue.                                                 |
| /filter     | Sets filter modes for the player.                                 |
| /lyrics     | Shows the lyrics of the currently playing song.                   |
| /nowplaying | Shows the currently playing song.                                 |
| /pause      | Pauses playback.                                                  |
| /play       | Searches and plays a song or playlist from YouTube or Spotify.    |
| /previous   | Plays the previous track.                                         |
| /queue      | Displays the queue.                                               |
| /remove     | Removes the specified track from the queue.                       |
| /repeat     | Sets the current repeat mode.                                     |
| /resume     | Resumes playback.                                                 |
| /search     | Searches five songs from YouTube and lets you select one to play. |
| /seek       | Skips to the specified point in the current track.                |
| /shuffle    | Shuffles the queue.                                               |
| /skip       | Skips the current track or to a specified point in the queue.     |
| /stop       | Stops playback.                                                   |
| /volume     | Sets the volume of the music player.                              |
</details>

## Installation

### Prerequisites
- **[Node.js](https://nodejs.org/en/download/)**

Install the latest version available.

<br/>

### Getting started

Download and install the latest version of Kalliope using git:
```shell
git clone https://github.com/MeridianGH/kalliope.git
cd kalliope
npm install
```

Alternatively use **[GitHub Desktop](https://desktop.github.com/)** or download as **[.zip](https://github.com/MeridianGH/Kalliope/archive/refs/heads/main.zip)**.

<br/>

### Configuration
Rename or copy `.env.example` to `.env` and replace the placeholders inside with your info:
- A Discord Bot Token (**[Guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)**)
- Your Application ID found in the `General Information` tab in your Discord application.
- Create a Genius API application **[here](https://docs.genius.com/)**, generate an access token and paste it in the config.

Run `npm run deploy` _**once**_ to synchronize the commands with Discord.\
You only need to run this during the initial setup or when you install a new update that changes some commands.


<details>
<summary style="cursor: pointer"><b>Advanced: Guild Commands</b></summary>

If only want to deploy the commands as guild commands (i.e. to test command changes), run this command instead:
```
npm run deploy -- guild [guildId]
```

Use the following command to clear all global commands or only guild commands, if you provide a guild ID:
```
npm run deploy -- clear [guildId]
```

---

</details>

<br/>

<details>
<summary style="cursor: pointer"><b>Optional: Lavalink</b></summary>

Install the latest version of **[Java](https://www.oracle.com/java/technologies/downloads/)** available.

Make sure Java is installed properly by running `java --version` in your terminal. If it displays the correct version, you are good to go!

If you are experiencing issues with age- or region-restricted videos, get your YouTube keys like described in this **[Guide](https://github.com/Walkyst/lavaplayer-fork/issues/18)**.\
Once acquired, set these tokens to `YOUTUBE_PAPISID` and `YOUTUBE_PSID` in your `.env`.

Uncomment the `localhost` node in `lavalink.ts` to make sure your bot actually connects to your Lavalink instance.\
You can use the hosted lavalink in parallel to your local instance as a redundant fallback.

---

</details>

<br/>

### Run
Start the bot using:
```shell
node .
```

<br>

<details>
<summary style="cursor: pointer"><b>Advanced: systemd unit file</b></summary>

When running Kalliope on a Linux server, chances are that you want to run it 24/7.\
If so, you'll find a sample systemd unit file in this repository.

This unit file assumes that you created a user `Kalliope` and placed this repository under `~/Kalliope/`

Copy this unit file to `/etc/systemd/user/` using following command:
```shell
sudo cp kalliope.service /etc/systemd/user/
```

Use the following commands to reload systemd and enable the service:
```shell
sudo systemctl daemon-reload
```
```shell
systemctl --user enable kalliope
```

Use `systemctl --user start kalliope` to start the service and `systemctl --user status kalliope` to check its status.
To view the logs use `journalctl --user-unit kalliope`.

---

</details>

---

## Stats

### Code
![Repo size](https://img.shields.io/github/repo-size/MeridianGH/Kalliope?style=for-the-badge)
[![Version](https://img.shields.io/github/package-json/v/MeridianGH/Kalliope?style=for-the-badge)](https://github.com/MeridianGH/Kalliope/blob/main/package.json#L2)
\
[![Top language](https://img.shields.io/github/languages/top/MeridianGH/Kalliope?style=for-the-badge)](https://github.com/MeridianGH/Kalliope/search?l=javascript)
[![CodeFactor](https://img.shields.io/codefactor/grade/github/MeridianGH/Kalliope?style=for-the-badge)](https://www.codefactor.io/repository/github/meridiangh/kalliope)
\
[![Libraries.io](https://img.shields.io/librariesio/github/MeridianGH/Kalliope?style=for-the-badge)](https://libraries.io/github/MeridianGH/Kalliope)
[![discord.js](https://img.shields.io/github/package-json/dependency-version/MeridianGH/Kalliope/discord.js?color=44b868&logo=npm&style=for-the-badge)](https://www.npmjs.com/package/discord.js)

### GitHub
[![GitHub issues](https://img.shields.io/github/issues/MeridianGH/Kalliope?style=for-the-badge)](https://github.com/MeridianGH/Kalliope/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/MeridianGH/Kalliope?style=for-the-badge)](https://github.com/MeridianGH/Kalliope/pulls)
\
[![GitHub last commit](https://img.shields.io/github/last-commit/MeridianGH/Kalliope?style=for-the-badge)](https://github.com/MeridianGH/Kalliope/commits)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/MeridianGH/Kalliope?style=for-the-badge)](https://github.com/MeridianGH/Kalliope/graphs/commit-activity)
\
[![GitHub Repo stars](https://img.shields.io/github/stars/MeridianGH/Kalliope?style=for-the-badge)](https://github.com/MeridianGH/Kalliope/stargazers)
[![GitHub watchers](https://img.shields.io/github/watchers/MeridianGH/Kalliope?style=for-the-badge)](https://github.com/MeridianGH/Kalliope/watchers)

---

## Licensing
Make sure to disclose the source when redistributing any part of the source code in this repository.\
For more information, please refer to the license.

[![License](https://img.shields.io/github/license/MeridianGH/Kalliope?logo=gnu&style=for-the-badge)](https://github.com/MeridianGH/Kalliope/blob/main/LICENSE.md)

---

<div align="center">

[Back to top 🡅](#kalliope)

</div>
