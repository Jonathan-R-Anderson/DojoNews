"""Utility functions for building a comment similarity tree."""

from __future__ import annotations

from typing import Dict, List, Tuple

import networkx as nx
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer


def build_comment_tree(comments: List[Tuple]) -> Dict[str, List[Dict[str, object]]]:
    """Generate a tree structure from a list of comments.

    Each comment must be a sequence where index ``0`` is the comment id and
    index ``2`` is the comment text. The function computes TF-IDF vectors for
    the comments, calculates pairwise cosine similarity and links comments
    whose similarity is greater than or equal to the average similarity. A
    minimum spanning tree is created from these links and returned in a JSON
    serialisable format.

    Args:
        comments: List of tuples returned from the database.

    Returns:
        A dictionary with ``nodes`` and ``links`` ready for JSON
        serialisation. Each node contains a ``sentiment`` score.
    """

    if not comments:
        return {"nodes": [], "links": []}

    texts = [c[2] for c in comments]
    ids = [c[0] for c in comments]

    try:
        nltk.data.find("sentiment/vader_lexicon.zip")
    except LookupError:
        nltk.download("vader_lexicon", quiet=True)
    sia = SentimentIntensityAnalyzer()

    scores = [sia.polarity_scores(t) for t in texts]
    sentiment_map = {}
    label_lookup = {"pos": "positive", "neu": "neutral", "neg": "negative"}
    for cid, s in zip(ids, scores):
        label_key = max(("pos", "neu", "neg"), key=lambda k: s[k])
        sentiment_map[cid] = {
            "compound": s["compound"],
            "label": label_lookup[label_key],
        }

    vectoriser = TfidfVectorizer(stop_words="english")
    tfidf = vectoriser.fit_transform(texts)
    features = vectoriser.get_feature_names_out()
    tfidf_arr = tfidf.toarray()
    similarity = cosine_similarity(tfidf)

    tri_upper = similarity[np.triu_indices(len(texts), 1)]
    average_sim = float(tri_upper.mean()) if tri_upper.size else 0.0

    graph = nx.Graph()
    for cid in ids:
        graph.add_node(cid)

    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            if similarity[i, j] >= average_sim:
                top_i = tfidf_arr[i].argsort()[::-1][:5]
                top_j = tfidf_arr[j].argsort()[::-1][:5]
                keywords = list(set(features[top_i]) & set(features[top_j]))[:5]
                graph.add_edge(
                    ids[i],
                    ids[j],
                    weight=float(similarity[i, j]),
                    keywords=keywords,
                )

    tree = nx.minimum_spanning_tree(graph)

    text_map = dict(zip(ids, texts))
    # ``networkx.minimum_spanning_tree`` can omit isolated nodes from the
    # resulting graph, which would cause the front-end to render fewer
    # comments than actually exist.  Ensure every comment id is present in the
    # output regardless of connectivity by iterating over ``ids`` instead of
    # the nodes contained in ``tree``.
    nodes = [
        {
            "id": cid,
            "text": text_map[cid],
            "sentiment": sentiment_map[cid]["compound"],
            "sentiment_label": sentiment_map[cid]["label"],
        }
        for cid in ids
    ]
    links = [
        {
            "source": u,
            "target": v,
            "weight": d.get("weight", 0.0),
            "keywords": d.get("keywords", []),
        }
        for u, v, d in tree.edges(data=True)
    ]
    return {"nodes": nodes, "links": links}
