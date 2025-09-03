function goTo(act, bool) {
    let x = document.forms["Form"]["ID"].value;
    if (bool == false) 
      {document.forms["Form"].action = x + ".html";}
    else {document.forms["Form"].action = act + ".html";
          alert(y);
          return false;}
    }
    