const cookie = document.getElementById('cookie');
const fortuneContainer = document.getElementById('fortune-container');
const fortuneText = document.getElementById('fortune');

let clickCount = 0;

const fortunes = [
  "you will lose a limb!",
  "u will become rich and drop all ur day 1s.",
  "32 10 14 N 110 51 12 W",
  "you will be betrayed by someone you love",
  "you will be left in a freezer and cannabilized",
  "ur medication will work today",
  "hug ur mom while u still can",
  "u will inherit all knowledge beyond human comprehension soon!",
  "500000 dollars or dinner with jay z",
  "ion give a FUCK about candy bars!",
  "whatever is troubling u will pass. it always does",
  "Ur gonna go schizo, enjoy reality while u can!",
  "U will wake up a man soon",
  "a pet isopod will come into ur life",
  "i hate Health insurance companies and i hate nestle and blackrock",
  "a magical fixing fairy will come a fix ur life soon."
];

const glowMilestones = [
  { count: 10, class: 'red-glow-10' },
  { count: 50, class: 'red-glow-50' },
  { count: 100, class: 'red-glow-100' },
  { count: 200, class: 'red-glow-200' },
];

cookie.addEventListener('click', () => {
  clickCount++;
  cookie.classList.add('crack');
  setTimeout(() => cookie.classList.remove('crack'), 700);
  fortuneContainer.classList.remove('show');
  void fortuneContainer.offsetWidth;
  fortuneContainer.classList.add('show');
  let fortune;
  if (clickCount >= 200) fortune = "u have a problem....";
  else if (clickCount >= 100) fortune = "how are u doing this????";
  else if (clickCount >= 50) fortune = "im actually impressed....";
  else if (clickCount >= 10) fortune = "fatass, ur eating too many cookies!";
  else fortune = fortunes[Math.floor(Math.random() * fortunes.length)];

  fortuneText.textContent = fortune;
  const parent = fortuneContainer.parentElement;
  parent.classList.remove('red-glow-10','red-glow-50','red-glow-100','red-glow-200');
  for (let i = glowMilestones.length-1; i>=0; i--) {
    if(clickCount >= glowMilestones[i].count) {
      parent.classList.add(glowMilestones[i].class);
      break;
    }
  }
});
