const musicContainer = document.getElementById('music-container');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');

const audio = document.getElementById('audio');
const progress = document.getElementById('progress');
const progressContainer = document.getElementById('progress-container');
const title = document.getElementById('title');
const cover = document.getElementById('cover');
const currTime = document.querySelector('#currTime');
const durTime = document.querySelector('#durTime');
let slideIndex = 1;
const slides = document.getElementsByClassName("slides");
let buttonAuto = document.getElementById("auto");
let timeout;

const timing = document.querySelector("#timing");
const showTime = document.querySelector("#show-time")

showSlides(slideIndex);

// Next/previous images
function plusSlides(n) {
    showSlides(slideIndex += n);
}

function hideSlides(){
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
}

// Thumbnail image controls
function currentSlide(n) {
    showSlides(slideIndex = n);
}

function showSlides(n) {
    let i;
    if (n > slides.length) {slideIndex = 1}
    if (n < 1) {slideIndex = slides.length}
    hideSlides();
    slides[slideIndex-1].style.display = "block";
}

function autoBut(){
    if (buttonAuto.style.backgroundColor == "red"){
        buttonAuto.style.backgroundColor = "white";
        stopShow();
    }else{
        buttonAuto.style.backgroundColor = "red";
        autoShow();
    }
}

function autoShow(){
    plusSlides(1);
    let time = 3000;
    if (timing.textContent){time = timing.textContent + "000";}
    timeout = setTimeout(autoShow, time);
}

function stopShow(){
    clearTimeout(timeout);
}

showTime.addEventListener("input", (event) => {
    timing.textContent = event.target.value;
});

// Song titles
const songs = ['libet\'s delay (the caretaker)', 'number world (yume nikki ost)', 'track 15 (rule of rose ost)', 'childishly fresh eyes (the caretaker)','command center (hellnight ost)','cottage - ambient a (lsd dream simulator music)'];

// Keep track of song
let songIndex = 0;

// Initially load song details into DOM
loadSong(songs[songIndex]);

// Update song details
function loadSong(song) {
    title.innerText = song;
    audio.src = `music/${song}.mp3`;
}

// Play song
function playSong() {
    musicContainer.classList.add('play');
    playBtn.querySelector('i.fas').classList.remove('fa-play');
    playBtn.querySelector('i.fas').classList.add('fa-pause');

    audio.play();
}

// Pause song
function pauseSong() {
    musicContainer.classList.remove('play');
    playBtn.querySelector('i.fas').classList.add('fa-play');
    playBtn.querySelector('i.fas').classList.remove('fa-pause');

    audio.pause();
}

// Previous song
function prevSong() {
    songIndex--;

    if (songIndex < 0) {
        songIndex = songs.length - 1;
    }

    loadSong(songs[songIndex]);

    playSong();
}

// Next song
function nextSong() {
    songIndex++;

    if (songIndex > songs.length - 1) {
        songIndex = 0;
    }

    loadSong(songs[songIndex]);

    playSong();
}

// Update progress bar
function updateProgress(e) {
    const { duration, currentTime } = e.srcElement;
    const progressPercent = (currentTime / duration) * 100;
    progress.style.width = `${progressPercent}%`;
}

// Set progress bar
function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;

    audio.currentTime = (clickX / width) * duration;
}

//get duration & currentTime for Time of song
function DurTime (e) {
    const {duration,currentTime} = e.srcElement;
    var sec;
    var sec_d;

    // define minutes currentTime
    let min = (currentTime==null)? 0:
        Math.floor(currentTime/60);
    min = min <10 ? '0'+min:min;

    // define seconds currentTime
    function get_sec (x) {
        if(Math.floor(x) >= 60){

            for (var i = 1; i<=60; i++){
                if(Math.floor(x)>=(60*i) && Math.floor(x)<(60*(i+1))) {
                    sec = Math.floor(x) - (60*i);
                    sec = sec <10 ? '0'+sec:sec;
                }
            }
        }else{
            sec = Math.floor(x);
            sec = sec <10 ? '0'+sec:sec;
        }
    }

    get_sec (currentTime,sec);

    // change currentTime DOM
    currTime.innerHTML = min +':'+ sec;

    // define minutes duration
    let min_d = (isNaN(duration) === true)? '0':
        Math.floor(duration/60);
    min_d = min_d <10 ? '0'+min_d:min_d;


    function get_sec_d (x) {
        if(Math.floor(x) >= 60){

            for (var i = 1; i<=60; i++){
                if(Math.floor(x)>=(60*i) && Math.floor(x)<(60*(i+1))) {
                    sec_d = Math.floor(x) - (60*i);
                    sec_d = sec_d <10 ? '0'+sec_d:sec_d;
                }
            }
        }else{
            sec_d = (isNaN(duration) === true)? '0':
                Math.floor(x);
            sec_d = sec_d <10 ? '0'+sec_d:sec_d;
        }
    }

    // define seconds duration

    get_sec_d (duration);

    // change duration DOM
    durTime.innerHTML = min_d +':'+ sec_d;

};

// Event listeners
playBtn.addEventListener('click', () => {
    const isPlaying = musicContainer.classList.contains('play');

    if (isPlaying) {
        pauseSong();
    } else {
        playSong();
    }
});

// Change song
prevBtn.addEventListener('click', prevSong);
nextBtn.addEventListener('click', nextSong);

// Time/song update
audio.addEventListener('timeupdate', updateProgress);

// Click on progress bar
progressContainer.addEventListener('click', setProgress);

// Song ends
audio.addEventListener('ended', nextSong);

// Time of song
audio.addEventListener('timeupdate',DurTime);