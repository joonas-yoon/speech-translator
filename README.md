# Speech Translator Chrome Extension

<div align=center>

![Logo](./logo.png)

</div>

<div align=center>

![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)
[![Build Status](https://travis-ci.org/joonas-yoon/speech-translator-server.svg?branch=master)](https://travis-ci.org/joonas-yoon/speech-translator-server)
[![GitHub stars](https://img.shields.io/github/stars/joonas-yoon/speech-translator)](https://github.com/joonas-yoon/speech-translator/stargazers)
[![Code Style](https://img.shields.io/badge/code%20style-google-informational.svg)](https://google.github.io/styleguide/jsguide.html)

</div>

This browser extension shows the translated results of speech from browser tab sound.

**The server** is available on [@joonas-yoon/speech-translator-server](https://github.com/joonas-yoon/speech-translator-server)

<div align=center>

![architecture](./docs/images/overview.png)

</div>

## Dependencies

- [Google Chrome Extensions](https://developer.chrome.com/extensions/overview)
- [Google Cloud Speech-To-Text](https://cloud.google.com/speech-to-text/)
- [Google Cloud Storage](https://cloud.google.com/storage/)
- [Google Cloud Translation API](https://cloud.google.com/translate/)

## Chrome

Kill all chrome instances before running command:

Windows:

```
CMD> "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir="[temp directory here]"
```

Linux/Mac:

```
chromium-browser --disable-web-security --user-data-dir="[temp directory here]"
```

Getting started Chrome Extension:

- https://developer.chrome.com/extensions/getstarted

## Video

[![Video v1.2](https://img.youtube.com/vi/Dry5jo6nQF4/0.jpg)](https://youtu.be/Dry5jo6nQF4)

Youtube: https://youtu.be/Dry5jo6nQF4

## Contributors

Always thanks for your contribution :+1:
