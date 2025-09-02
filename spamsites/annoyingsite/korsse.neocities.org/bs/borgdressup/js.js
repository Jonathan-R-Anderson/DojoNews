var state = {
i : 0,
j :0
};

function nextshirt()
{
console.log("inside function nextshirt");
console.log(state.i);
var shirt=document.getElementById("shirt");
if(state.i===0){
shirt.setAttribute("class","shirt0");
state.i++;
console.log(state.i);
}
else
if(state.i===1){
shirt.setAttribute("class","shirt1");
state.i++;
console.log(state.i);
}
else
if(state.i===2){
shirt.setAttribute("class","shirt2");
state.i++;
console.log(state.i);
}
else
if(state.i===3){
shirt.setAttribute("class","shirt3");
state.i++;
console.log(state.i);

}
else
if (state.i===4){
shirt.setAttribute("class","shirt4");
state.i=0;
}

}

function nextpants()
{
console.log("inside function nextpants");
console.log(state.j);
var shirt=document.getElementById("pants");
if(state.j===0){
pants.setAttribute("class","pants0");
state.j++;
console.log(state.j);
}
else
if(state.j===1){
pants.setAttribute("class","pants1");
state.j++;
console.log(state.j);
}
else
if(state.j===2){
pants.setAttribute("class","pants2");
state.j++;
console.log(state.j);
}
else
if(state.j===3){
pants.setAttribute("class","pants3");
state.j++;
console.log(state.j);
}
else
if (state.j===4){
pants.setAttribute("class","pants4");
state.j=0;
}

}

window.onload=init;

function init()
{
console.log("window has loaded");
state.i=0;
state.j=0;
}