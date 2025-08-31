(() => {
  const debug = (...args) =>
    (window.debugLog
      ? window.debugLog('comments.js', ...args)
      : console.log('comments.js', ...args));
  debug('Loaded');

  async function init() {
    if (typeof postUrlID === 'undefined') {
      debug('No post ID');
      return;
    }

    if (typeof ethers === 'undefined') {
      await new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js';
        s.onload = resolve;
        document.head.appendChild(s);
      });
    }
    if (typeof DOMPurify === 'undefined') {
      await new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js';
        s.onload = resolve;
        document.head.appendChild(s);
      });
    }
    if (typeof marked === 'undefined') {
      await new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
        s.onload = resolve;
        document.head.appendChild(s);
      });
    }

    const provider = new ethers.providers.JsonRpcProvider(window.rpcUrl);
    const contract = new ethers.Contract(
      window.commentContractAddress,
      window.commentContractAbi,
      provider
    );

    const userBL = (window.Blacklist && window.Blacklist.get()) || {authors:[],posts:[],comments:[]};
    const localBlacklist = new Set([
      ...(window.blacklistedComments || []),
      ...(userBL.comments || [])
    ].map((n) => parseInt(n)));

  const commentsEl = document.getElementById('comments');
  const form = document.getElementById('comment-form');
  const textarea = document.getElementById('comment-input');
  const loginPrompt = document.getElementById('comment-login-prompt');
  const loadedComments = new Set();

    function applyFilters(text) {
      const filters = window.boardWordFilters || {};
      for (const [bad, good] of Object.entries(filters)) {
        const regex = new RegExp(bad, 'gi');
        text = text.replace(regex, good);
      }
      return text;
    }

    function formatContent(text) {
      return text.replace(/#(\d+)/g, (m, id) =>
        `<a href="#${id}" data-ref-id="${id}" class="comment-ref">#${id}</a>`
      );
    }

    function renderMarkdownSafe(text) {
      const raw = marked.parse(text);
      return DOMPurify.sanitize(raw, {
        ALLOWED_TAGS: [
          'p','br','strong','em','h1','h2','h3','h4','h5','h6',
          'ul','ol','li','blockquote','code','pre','a','img','hr',
          'table','thead','tbody','tr','th','td','del','s','ins','sub','sup'
        ],
        ALLOWED_ATTR: {
          a: ['href', 'title', 'data-ref-id', 'class'],
          img: ['src', 'alt', 'title', 'width', 'height', 'class']
        }
      });
    }

    function setupReferences(root = commentsEl) {
      root.querySelectorAll('.comment-ref').forEach((el) => {
        const id = el.dataset.refId;
        const target = () => commentsEl.querySelector(`[data-comment-id="${id}"]`);
        el.addEventListener('mouseenter', () => {
          const t = target();
          if (t) t.classList.add('highlight-comment');
        });
        el.addEventListener('mouseleave', () => {
          const t = target();
          if (t) t.classList.remove('highlight-comment');
        });
        el.addEventListener('click', (e) => {
          e.preventDefault();
          const t = target();
          if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    }

    function renderComment(id, author, content, timestamp) {
      if (loadedComments.has(id)) return;
      loadedComments.add(id);
      if (commentsEl.firstChild && !commentsEl.firstChild.dataset.commentId) {
        commentsEl.innerHTML = '';
      }
      const div = document.createElement('div');
      div.className = 'my-2 p-2 border rounded';
      div.dataset.commentId = id;
      div.id = `${id}`;
      const safe = renderMarkdownSafe(formatContent(applyFilters(content)));
      const timeText = timestamp ? new Date(timestamp * 1000).toLocaleString() : '';
      div.innerHTML = `<p class="mb-1">${safe}</p><p class="text-sm opacity-70">#${id} ${author} ${timeText}</p>`;
      commentsEl.appendChild(div);
      setupReferences(div);
    }

    async function loadExistingComments() {
      debug('Loading existing comments');
      let total;
      try {
        total = await contract.commentCount();
      } catch (err) {
        debug('commentCount failed', err);
        commentsEl.textContent = 'Failed to load comments.';
        return;
      }
      const count = total.toNumber ? total.toNumber() : parseInt(total);
      for (let i = 0; i < count; i++) {
        if (loadedComments.has(i)) continue;
        try {
          const c = await contract.getComment(i);
          if (c.postId.toString() !== postUrlID.toString() || localBlacklist.has(i) || (userBL.authors || []).includes(c.author.toLowerCase())) continue;
          const filter = contract.filters.CommentAdded(i);
          const events = await contract.queryFilter(filter);
          let ts = 0;
          if (events.length) {
            const block = await provider.getBlock(events[0].blockNumber);
            ts = block.timestamp;
          }
          renderComment(i, c.username, c.body, ts);
        } catch (err) {
          debug('getComment failed', i, err);
        }
      }
      if (loadedComments.size === 0) {
        commentsEl.innerHTML = '<p>No comments yet.</p>';
      }
      window.dispatchEvent(new Event('comments-updated'));
      const hash = window.location.hash.slice(1);
      if (hash) {
        const t = commentsEl.querySelector(`[data-comment-id="${hash}"]`);
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    async function submitComment(e) {
      e.preventDefault();
      const content = textarea.value.trim();
      if (!content) return;
      if (typeof window.ethereum === 'undefined') {
        alert('MetaMask required');
        return;
      }
      try {
        const providerMM = new ethers.providers.Web3Provider(window.ethereum);
        await providerMM.send('eth_requestAccounts', []);
        const signer = providerMM.getSigner();
        const c = new ethers.Contract(
          window.commentContractAddress,
          window.commentContractAbi,
          signer
        );
        const tx = await c.addComment(postUrlID, '', '', content);
        await tx.wait();
        textarea.value = '';
      } catch (err) {
        debug('submit failed', err);
      }
    }

    async function updateFormVisibility() {
      let connected = !!window.userAddress;
      if (!connected && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts[0]) {
            window.userAddress = accounts[0].toLowerCase();
            connected = true;
          }
        } catch (err) {
          debug('eth_accounts failed', err);
        }
      }
      if (connected) {
        form.classList.remove('hidden');
        loginPrompt.classList.add('hidden');
      } else {
        form.classList.add('hidden');
        loginPrompt.classList.remove('hidden');
      }
    }

    updateFormVisibility();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', () => {
        window.userAddress = undefined;
        updateFormVisibility();
      });
    }

    form.addEventListener('submit', submitComment);

    await loadExistingComments();

    contract.on('CommentAdded', async (commentId, postId, author, username, email, content, event) => {
      if (postId.toString() !== postUrlID.toString()) return;
      const id = commentId.toNumber ? commentId.toNumber() : parseInt(commentId);
      if (localBlacklist.has(id) || (userBL.authors || []).includes(author.toLowerCase())) return;
      let ts = 0;
      try {
        const block = await provider.getBlock(event.blockNumber);
        ts = block.timestamp;
      } catch (err) {
        debug('block fetch failed', err);
      }
      renderComment(id, author, content, ts);
      window.dispatchEvent(new Event('comments-updated'));
    });
  }

  window.addEventListener('load', init);
})();
