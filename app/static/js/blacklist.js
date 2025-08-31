(function(){
  function load(){
    try{
      return JSON.parse(localStorage.getItem('userBlacklist')) || {authors:[],posts:[],comments:[]};
    }catch(e){
      return {authors:[],posts:[],comments:[]};
    }
  }
  function save(data){
    localStorage.setItem('userBlacklist', JSON.stringify(data));
  }
  async function sync(){
    try{
      const res = await fetch('/api/blacklist');
      if(res.ok){
        const remote = await res.json();
        const local = load();
        const merged = {
          authors: local.authors,
          posts: Array.from(new Set([...(local.posts||[]), ...(remote.posts||[])])),
          comments: Array.from(new Set([...(local.comments||[]), ...(remote.comments||[])]))
        };
        save(merged);
      }
    }catch(e){
      /* ignore network errors */
    }
  }
  const api = {
    get(){
      return load();
    },
    addAuthor(name){
      const data = load();
      const n = name.toLowerCase();
      if(!data.authors.includes(n)){
        data.authors.push(n);
        save(data);
      }
    },
    addPost(id){
      const data = load();
      if(!data.posts.includes(id)){
        data.posts.push(id);
        save(data);
        fetch('/api/blacklist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'post',contentID:id})});
      }
    },
    addComment(id){
      const data = load();
      if(!data.comments.includes(id)){
        data.comments.push(id);
        save(data);
        fetch('/api/blacklist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'comment',contentID:id})});
      }
    }
  };
  sync();
  window.Blacklist = api;
})();
