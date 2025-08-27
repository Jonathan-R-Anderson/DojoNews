let initialSpendTime = 0;

if (visitorID != null) {
  setInterval(() => {
    initialSpendTime += 5;

    const data = {
      visitorID: visitorID,
      spendTime: initialSpendTime,
    };

    fetch("/api/v1/timeSpendsDuration", {
      method: "POST",
      headers: { "X-CSRFToken": csrfToken, "Content-Type": "application/json" },
      body: JSON.stringify(data),
      keepalive: true,
    });
  }, 5000);
}

if (typeof postUrlID !== "undefined") {
  fetch(`/post/${postUrlID}/comment-tree`)
    .then((response) => response.json())
    .then((data) => {
      renderCommentTree(data);
    });
}

function renderCommentTree(data) {
  if (!data.nodes.length) return;

  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));
  const rootId = data.nodes[0].id;

  const adjacency = {};
  data.links.forEach((l) => {
    (adjacency[l.source] ??= []).push({ id: l.target, keywords: l.keywords });
    (adjacency[l.target] ??= []).push({ id: l.source, keywords: l.keywords });
  });

  function build(id, parent = null, keywords = []) {
    return {
      id,
      text: nodeMap.get(id).text,
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

  const svg = d3
    .select("#comment-tree")
    .append("svg")
    .attr("width", width)
    .attr("height", width)
    .append("g")
    .attr("transform", `translate(${radius},${radius})`);

  const linkGen = d3
    .linkRadial()
    .angle((d) => d.x)
    .radius((d) => d.y);

  svg
    .append("g")
    .selectAll("path")
    .data(root.links())
    .join("path")
    .attr("d", linkGen)
    .attr("stroke", "#d1d5db")
    .attr("fill", "none");

  svg
    .append("g")
    .selectAll("circle")
    .data(root.descendants())
    .join("circle")
    .attr(
      "transform",
      (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`
    )
    .attr("r", 4)
    .attr("fill", "#f43f5e")
    .on("click", (_, d) => showBranch(d));

  function showBranch(d) {
    const ids = d.descendants().map((n) => n.data.id);
    document.querySelectorAll("[data-comment-id]").forEach((el) => {
      el.style.display = ids.includes(parseInt(el.dataset.commentId)) ? "" : "none";
    });
    const keywords = d.data.keywords || [];
    const kwDiv = document.getElementById("branch-keywords");
    kwDiv.textContent = keywords.length ? `Keywords: ${keywords.join(", ")}` : "";
  }

  showBranch(root);
}
