window.onload = choosePic;

var myPix = new Array(
     "gifheaders/adamant.gif",
     "gifheaders/aeviternal.gif",
     "gifheaders/ambrosial.gif",
     "gifheaders/anonymous.gif",
     "gifheaders/another.gif",
     "gifheaders/anti.gif"
);

function choosePic() {
     var randomNum = Math.floor(Math.random() * myPix.length);
     document.getElementById("giflogo").src = myPix[randomNum];
}
