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

    async function loadComments() {
      debug('Loading comments');
      commentsEl.innerHTML = '';
      let nextId;
      try {
        nextId = await contract.nextCommentId();
      } catch (err) {
        debug('nextCommentId failed', err);
        commentsEl.textContent = 'Failed to load comments.';
        return;
      }
      const total = nextId.toNumber ? nextId.toNumber() : parseInt(nextId);
      let count = 0;
      for (let i = 0; i < total; i++) {
        try {
          const c = await contract.getComment(i);
          if (!c.exists || c.postId.toString() !== postUrlID.toString() || c.blacklisted) continue;
          count++;
          const div = document.createElement('div');
          div.className = 'my-2 p-2 border rounded';
          div.innerHTML = `<p class="mb-1">${c.content}</p><p class="text-sm opacity-70">${c.author}</p>`;
          commentsEl.appendChild(div);
        } catch (err) {
          debug('getComment failed', i, err);
        }
      }
      if (count === 0) {
        commentsEl.innerHTML = '<p>No comments yet.</p>';
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
        const tx = await c.addComment(postUrlID, content);
        await tx.wait();
        textarea.value = '';
        loadComments();
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

    loadComments();
  }

  window.addEventListener('load', init);
})();
