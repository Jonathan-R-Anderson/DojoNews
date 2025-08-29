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
      }
    },
    addComment(id){
      const data = load();
      if(!data.comments.includes(id)){
        data.comments.push(id);
        save(data);
      }
    }
  };
  window.Blacklist = api;
})();
