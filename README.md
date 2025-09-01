# FlaskBlog

A modern blog application built with Flask, featuring a clean UI and powerful admin tools. 

Sponsored by [CreateMyBanner](https://createmybanner.com)

![FlaskBlog Light Theme](/images/Light.png)
[Watch demo on YouTube](https://youtu.be/WyIpAlSp2RM)

## ✨ Features

- **User System** - Registration, login, profiles with custom avatars
- **Rich Editor** - [Milkdown](https://milkdown.dev/) editor for creating beautiful posts
- **Admin Panel** - Full control over users, posts, and comments
- **Dark/Light Themes** - Automatic theme switching
- **Categories** - Organize posts by topics
- **Search** - Find posts quickly
- **Responsive Design** - Works great on all devices
- **Analytics** – Tracks post views, visitor countries, and operating systems
- **Security** - Google reCAPTCHA v3, secure authentication
- **Advanced Logging** - Powered by [Tamga](https://github.com/dogukanurker/tamga) logger
- **Member Tiers** – Metered paywall with on-chain accounting
- **Sponsor Blocks** – First‑party ad slots with frequency capping
- **Tip Jar** – Per‑author and per‑post tipping using Ethereum with a configurable sysop commission
- **Forum Boards** – Minimal 4chan-inspired smart contract storing latest post images
- **Torrent-backed Media** – Images are also distributed via BitTorrent for load balancing

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- [astral/uv](https://docs.astral.sh/uv/)

### Installation

```bash
# Clone the repository
git clone https://github.com/DogukanUrker/flaskBlog.git
cd flaskBlog/app

# Run with uv
uv run app.py
```

Visit `http://localhost:1283` in your browser.

### Docker Compose

Run the full stack with Docker:

```bash
# edit DOMAIN in .env if you want BunkerWeb to answer on a custom domain
docker compose up --build
```

The `gateway` service now listens on port `80` and decides whether to send
traffic to BunkerWeb or to an [annoying honeypot](https://github.com/feross/TheAnnoyingSite.com)
based on a simple user‑agent check. BunkerWeb's management UI is still
available on port `8000`. The `DOMAIN` value defines which Host header
the stack accepts.

If you need to expose a running container on all host ports (except SSH on
port 22 and HTTP on port 80), use the `host_port_forward.sh` script on the
host:

```bash
sudo ./host_port_forward.sh <container_name>
```


### Blockchain

User accounts, posts, comments, tipping, sponsor slots and media magnets are now handled by dedicated contracts under [`contracts/`](contracts/). Each contract is owned by the sysop who deployed it, while public methods let authors create posts or comments and fans send tips. All smart-contract interactions are performed in the browser via `ethers.js`, keeping the Flask backend free of blockchain dependencies.

### Static Files via BitTorrent

All images in [`images/`](images/) are served normally by the Flask server but
are also seeded over BitTorrent for additional distribution. Magnet URLs for
the images are stored on-chain and fetched directly in the browser via the
PostStorage smart contract, then rendered using WebTorrent and Blob URLs for
load-balanced delivery.

### Default Admin Account
- Username: `admin`
- Password: `admin`

## 🛠️ Tech Stack

**Backend:** Flask, SQLite3, WTForms, Passlib \
**Frontend:** TailwindCSS, jQuery, Summer Note Editor \
**Icons:** Tabler Icons

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Doğukan Ürker** \
[Website](https://dogukanurker.com) | [Email](mailto:dogukanurker@icloud.com)

---

⭐ If you find this project useful, please consider giving it a star!
