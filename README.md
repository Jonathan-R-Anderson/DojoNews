# FlaskBlog

A modern blog application built with Flask, featuring a clean UI and powerful admin tools. 

Sponsored by [CreateMyBanner](https://createmybanner.com)

![FlaskBlog Light Theme](/images/Light.png)
[Watch demo on YouTube](https://youtu.be/WyIpAlSp2RM) — [See screenshots (mobile/desktop, dark/light)](https://github.com/DogukanUrker/flaskBlog/tree/main/images)

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
