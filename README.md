<!--suppress HtmlDeprecatedAttribute -->

[![logo](https://repository-images.githubusercontent.com/556876246/97fc51e6-1179-4eb8-8401-0fc20a25636e)]()

<div align="center">

[![Dashboard](https://img.shields.io/static/v1?style=for-the-badge&logo=google%20chrome&label=Dashboard&message=kalliope.xyz&color=121212)](http://kalliope.xyz)
[![Discord](https://shields.io/discord/610498937874546699?style=for-the-badge&logo=discord&label=discord)](https://discord.gg/qX2CBrrUpf)
[![License](https://img.shields.io/github/license/MeridianGH/kalliope?logo=gnu&style=for-the-badge)](https://github.com/MeridianGH/Kalliope/blob/main/LICENSE.md)

# Kalliope.
<b>A Discord music bot that still supports most platforms.</b>

</div>

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
  - [Size](#size)
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
- **[FFmpeg](https://ffmpeg.org/download.html)**
- **[OpenJDK](https://openjdk.org/projects/jdk/)** (Java v11 or newer is required. Try the newest version, if you encounter issues use v13)

### Getting started
To install Kalliope, simply download the respective file for your operating system from **[releases](https://github.com/MeridianGH/Kalliope/releases)**.\
On Linux and macOS you'll need to make the file explicitly executable using `chmod`.

If you choose to install Kalliope manually, here's how to do so. Make sure you have **[Node.js](https://nodejs.org/en/download/)** installed.
```shell
git clone https://github.com/MeridianGH/kalliope.git
cd kalliope
npm install
```

### Configuration
Create a file `config.json` in the same directory as your executable and copy the file contents from [<u>`config_example.json`</u>](https://github.com/MeridianGH/Kalliope/blob/main/config_example.json). If you're installing manually, simply rename the file.

Replace the placeholders inside with your info:
- A Discord Bot Token (**[Guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)**)
- Your Application ID which you can find in the `General Information` tab in your Discord application.
- Get your YouTube keys like described in this **[Guide](https://github.com/Walkyst/lavaplayer-fork/issues/18)**. Once you have `PAPISID` and `PSID`, set them in the config.
- Create a Genius API application **[here](https://docs.genius.com/)**, generate an access token and paste it in the config.

### Run
Start Kalliope by running the executable using double-click on Windows and `./<filename>` on Linux and macOS.

If you installed Kalliope manually, start the bot with the following command:
```shell
node .
```

If you encounter any errors, make sure you have Java and FFmpeg properly installed.\
Check your Java version using `java --version`.

---

## Stats

### Size
[![Total lines](https://img.shields.io/tokei/lines/github/MeridianGH/Kalliope?style=for-the-badge)]()
[![Repo size](https://img.shields.io/github/repo-size/MeridianGH/Kalliope?style=for-the-badge)]()

### Code
[![GitHub release](https://img.shields.io/github/v/release/MeridianGH/Kalliope?style=for-the-badge)]()
[![Top language](https://img.shields.io/github/languages/top/MeridianGH/Kalliope?style=for-the-badge)]()
\
[![CodeFactor](https://img.shields.io/codefactor/grade/github/MeridianGH/Kalliope?style=for-the-badge)](https://www.codefactor.io/repository/github/meridiangh/kalliope)
[![Libraries.io](https://img.shields.io/librariesio/github/MeridianGH/Kalliope?style=for-the-badge)](https://libraries.io/github/MeridianGH/Kalliope)
\
[![discord.js](https://img.shields.io/github/package-json/dependency-version/MeridianGH/Kalliope/discord.js?color=44b868&logo=npm&style=for-the-badge)](https://www.npmjs.com/package/discord.js)
[![erela.js](https://img.shields.io/github/package-json/dependency-version/MeridianGH/Kalliope/erela.js?color=44b868&logo=npm&style=for-the-badge)](https://www.npmjs.com/package/erela.js)

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

[Back to top ↥](#readme)

</div>
