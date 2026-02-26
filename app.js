const $=id=>document.getElementById(id);

function applyMobileToolbarIcons(){
 if(window.innerWidth>420) return;
 const map={toggleShuffle:'🔀Q',toggleShuffleAnswers:'🔀A',toggleMissed:'❌',toggleQuiz:'📝',btnReset:'♻️'};
 Object.entries(map).forEach(([id,txt])=>{const el=$(id);if(el) el.textContent=txt});
}
window.addEventListener('resize',applyMobileToolbarIcons);
applyMobileToolbarIcons();
