# HLS Video Downloader

A Python-based tool to download videos from any website using HLS (HTTP Live Streaming) protocol.

## Features

- **Automatic M3U8 Detection**: Monitors network requests to find HLS manifest files
- **Manual URL Support**: Can provide M3U8 URL directly if known
- **Full Video Download**: Downloads all segments and merges them into a complete MP4 file
- **User-Friendly**: Interactive command-line interface

## Prerequisites

- Python 3.8+
- FFmpeg (for merging video segments)
- pip (Python package manager)

## Installation

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
playwright install chromium
```

### 2. Install FFmpeg

**Windows:**
- Download from: https://ffmpeg.org/download.html
- Add FFmpeg to your PATH environment variable

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

## Usage

### Basic Usage

```bash
python main.py
```

Follow the prompts:
1. Enter the movie website URL
2. Optionally provide the M3U8 URL (leave blank to auto-detect)

### Example

```
[?] Enter movie website URL: https://example-movie-site.com/watch/movie123
[?] Enter M3U8 URL (leave blank to auto-detect): 
[*] Starting network request capture...
[*] Loading page: https://example-movie-site.com/watch/movie123
[+] Found M3U8: https://cdn.example.com/streams/movie123/playlist.m3u8
[*] Downloading M3U8: https://cdn.example.com/streams/movie123/playlist.m3u8
[*] Downloading 180 segments...
[+] Downloaded segment 1/180
...
[+] Video saved to: downloads/video_20240618_130000.mp4
```

## How It Works

1. **Network Interception**: Uses Playwright to load the webpage and intercept all network requests
2. **M3U8 Detection**: Searches for HLS manifest files (.m3u8) in network traffic and page content
3. **Segment Download**: Downloads all video segments from the M3U8 playlist
4. **Merging**: Uses FFmpeg to merge segments into a single MP4 file

## Troubleshooting

### FFmpeg Not Found
- Install FFmpeg and ensure it's in your system PATH
- Verify installation: `ffmpeg -version`

### No M3U8 Found
- Some sites may require user interaction (clicking play, etc.)
- Try providing the M3U8 URL manually if you can find it in network tools (F12 > Network tab)

### Segments Download Failed
- Check internet connection
- Some sites may have download restrictions
- Try using a different browser or VPN if blocked

## Legal Notice

Use this tool only for:
- Downloading videos you have the right to download
- Personal, non-commercial use
- Content you own or have permission to download

Respect copyright laws and website terms of service.

## License

MIT License
