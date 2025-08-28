(() => {
  const debug = (...args) =>
    (window.debugLog
      ? window.debugLog('post.js', ...args)
      : console.log('post.js', ...args));
  debug('Loaded');

let currentTreeSignature = "";
async function fetchCommentTree() {
  debug('fetchCommentTree');
  try {
    const response = await fetch(`/post/${postUrlID}/comment-tree`);
    const data = await response.json();
    debug('comment tree data', data);
    const signature = data.nodes.map((n) => n.id).sort().join(",");
    if (signature !== currentTreeSignature) {
      currentTreeSignature = signature;
      renderCommentTree(data);
    }
  } catch (err) {
    debug('fetchCommentTree failed', err);
  }
}

if (typeof postUrlID !== "undefined") {
  debug('Setting up comment tree', postUrlID);
  fetchCommentTree();
  window.addEventListener('comments-updated', fetchCommentTree);
}

function renderCommentTree(data) {
  debug('renderCommentTree', data);
  if (!data.nodes.length) return;

  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));
  const rootId = data.nodes[0].id;

  const sentimentColors = {
    positive: "#22c55e",
    neutral: "#9ca3af",
    negative: "#ef4444",
  };

  const adjacency = {};
  data.links.forEach((l) => {
    (adjacency[l.source] ??= []).push({ id: l.target, keywords: l.keywords });
    (adjacency[l.target] ??= []).push({ id: l.source, keywords: l.keywords });
  });

  function build(id, parent = null, keywords = []) {
    return {
      id,
      text: nodeMap.get(id).text,
      sentiment: nodeMap.get(id).sentiment,
      sentiment_label: nodeMap.get(id).sentiment_label,
      keywords,
      children: (adjacency[id] || [])
        .filter((n) => n.id !== parent)
        .map((n) => build(n.id, id, n.keywords)),
    };
  }

  const root = d3.hierarchy(build(rootId));
  const width = 600;
  const radius = width / 2;

  const tree = d3.tree().size([2 * Math.PI, radius - 40]);
  tree(root);

  const treeCommentIds = new Set(data.nodes.map((n) => n.id));

  const container = d3.select("#comment-tree");
  const legend = container.select("#branch-legend").node();
  let selectedBranch = null;
  container.select("svg").remove();
  const svg = container
    .append("svg")
    .attr("viewBox", `${-radius} ${-radius} ${width} ${width}`)
    .append("g");

  const linkGen = d3
    .linkRadial()
    .angle((d) => d.x)
    .radius((d) => d.y);

  const links = svg
    .append("g")
    .selectAll("g")
    .data(root.links())
    .join("g");

  links
    .append("path")
    .attr("class", "link")
    .attr("d", linkGen);

  links
    .append("path")
    .attr("class", "link-hover")
    .attr("d", linkGen)
    .on("mouseenter", (_, d) => {
      if (!selectedBranch) showBranch(d.target);
    })
    .on("mouseleave", () => {
      if (!selectedBranch) showAll();
    })
    .on("click", (event, d) => {
      selectedBranch = d.target;
      showBranch(d.target);
      event.stopPropagation();
    });

  svg
    .append("g")
    .selectAll("circle")
    .data(root.descendants())
    .join("circle")
    .attr(
      "transform",
      (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`
    )
    .attr("r", 5)
    .attr("class", "node")
    .attr("fill", (d) => sentimentColors[d.data.sentiment_label])
    .attr("stroke", (d) => sentimentColors[d.data.sentiment_label]);

  container
    .on("mouseleave", () => {
      if (!selectedBranch) showAll();
    })
    .on("click", () => {
      if (selectedBranch) {
        selectedBranch = null;
        showAll();
      }
    });

  function animateComments(ids) {
    debug('animateComments', ids.size);
    document.querySelectorAll("[data-comment-id]").forEach((el) => {
      const show = ids.has(parseInt(el.dataset.commentId));
      el.classList.toggle("hidden-comment", !show);
    });
  }

  function showBranch(d) {
    debug('showBranch', d.data.id);
    const ids = new Set(d.descendants().map((n) => n.data.id));
    animateComments(ids);
    const keywords = d.data.keywords || [];
    const sentiments = d.descendants().map((n) => n.data.sentiment || 0);
    const labels = d.descendants().map((n) => n.data.sentiment_label);
    const avgSent =
      sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
    const labelCounts = {};
    labels.forEach((l) => (labelCounts[l] = (labelCounts[l] || 0) + 1));
    const sentimentLabel = Object.entries(labelCounts).sort((a, b) => b[1] - a[1])[0][0];
    const parts = [`Sentiment: ${sentimentLabel} (${avgSent.toFixed(2)})`];
    if (keywords.length) parts.push(`Keywords: ${keywords.join(", ")}`);
    legend.textContent = parts.join(" | ");
  }

  function showAll() {
    debug('showAll');
    animateComments(treeCommentIds);
    legend.textContent = "Hover or click a branch to see details";
  }

  showAll();
})();
