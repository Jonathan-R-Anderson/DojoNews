(() => {
  const debug = (...args) => window.debugLog('comments.js', ...args);
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

    const provider = new ethers.providers.JsonRpcProvider(window.rpcUrl);
    const contract = new ethers.Contract(
      window.commentContractAddress,
      window.commentContractAbi,
      provider
    );

    const commentsEl = document.getElementById('comments');
    const form = document.getElementById('comment-form');
    const textarea = document.getElementById('comment-input');
    const loginPrompt = document.getElementById('comment-login-prompt');
    const loadedComments = new Set();

    function formatContent(text) {
      return text.replace(/#(\d+)/g, (m, id) =>
        `<a href="#comment-${id}" data-ref-id="${id}" class="comment-ref">#${id}</a>`
      );
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

    function renderComment(id, author, content) {
      if (loadedComments.has(id)) return;
      loadedComments.add(id);
      if (commentsEl.firstChild && !commentsEl.firstChild.dataset.commentId) {
        commentsEl.innerHTML = '';
      }
      const div = document.createElement('div');
      div.className = 'my-2 p-2 border rounded';
      div.dataset.commentId = id;
      div.id = `comment-${id}`;
      div.innerHTML = `<p class="mb-1">${formatContent(content)}</p><p class="text-sm opacity-70">#${id} ${author}</p>`;
      commentsEl.appendChild(div);
      setupReferences(div);
    }

    async function loadExistingComments() {
      debug('Loading existing comments');
      let nextId;
      try {
        nextId = await contract.nextCommentId();
      } catch (err) {
        debug('nextCommentId failed', err);
        commentsEl.textContent = 'Failed to load comments.';
        return;
      }
      const total = nextId.toNumber ? nextId.toNumber() : parseInt(nextId);
      for (let i = 0; i < total; i++) {
        if (loadedComments.has(i)) continue;
        try {
          const c = await contract.getComment(i);
          if (!c.exists || c.postId.toString() !== postUrlID.toString() || c.blacklisted) continue;
          renderComment(i, c.author, c.content);
        } catch (err) {
          debug('getComment failed', i, err);
        }
      }
      if (loadedComments.size === 0) {
        commentsEl.innerHTML = '<p>No comments yet.</p>';
      }
      window.dispatchEvent(new Event('comments-updated'));
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
        const tx = await c.addComment(postUrlID, content);
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

    contract.on('CommentAdded', (commentId, postId, author, content) => {
      if (postId.toString() !== postUrlID.toString()) return;
      const id = commentId.toNumber ? commentId.toNumber() : parseInt(commentId);
      renderComment(id, author, content);
      window.dispatchEvent(new Event('comments-updated'));
    });
  }

  window.addEventListener('load', init);
})();
