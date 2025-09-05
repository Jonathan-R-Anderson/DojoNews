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

function plusSlides(n) {
    showSlides(slideIndex += n);
}

function hideSlides(){
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
}

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

const songs = ['tape'];

let songIndex = 0;

loadSong(songs[songIndex]);

function loadSong(song) {
    title.innerText = song;
    audio.src = `${song}.mp3`;
}

function playSong() {
    musicContainer.classList.add('play');
    playBtn.querySelector('i.fas').classList.remove('fa-play');
    playBtn.querySelector('i.fas').classList.add('fa-pause');

    audio.play();
}

function pauseSong() {
    musicContainer.classList.remove('play');
    playBtn.querySelector('i.fas').classList.add('fa-play');
    playBtn.querySelector('i.fas').classList.remove('fa-pause');

    audio.pause();
}

function prevSong() {
    songIndex--;

    if (songIndex < 0) {
        songIndex = songs.length - 1;
    }

    loadSong(songs[songIndex]);

    playSong();
}

function nextSong() {
    songIndex++;

    if (songIndex > songs.length - 1) {
        songIndex = 0;
    }

    loadSong(songs[songIndex]);

    playSong();
}

function updateProgress(e) {
    const { duration, currentTime } = e.srcElement;
    const progressPercent = (currentTime / duration) * 100;
    progress.style.width = `${progressPercent}%`;
}

function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;

    audio.currentTime = (clickX / width) * duration;
}

function DurTime (e) {
    const {duration,currentTime} = e.srcElement;
    var sec;
    var sec_d;

    let min = (currentTime==null)? 0:
        Math.floor(currentTime/60);
    min = min <10 ? '0'+min:min;

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

    currTime.innerHTML = min +':'+ sec;

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


    get_sec_d (duration);

    durTime.innerHTML = min_d +':'+ sec_d;

};

playBtn.addEventListener('click', () => {
    const isPlaying = musicContainer.classList.contains('play');

    if (isPlaying) {
        pauseSong();
    } else {
        playSong();
    }
});

prevBtn.addEventListener('click', prevSong);
nextBtn.addEventListener('click', nextSong);

audio.addEventListener('timeupdate', updateProgress);

progressContainer.addEventListener('click', setProgress);

audio.addEventListener('ended', nextSong);

audio.addEventListener('timeupdate',DurTime);
