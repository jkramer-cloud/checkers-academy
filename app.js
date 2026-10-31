'use strict';
/* Checkers Academy — dependency-free American checkers engine and learning game.
   Sign convention: black = +1, red = -1, kings = +/-2.
   Men move and capture forward; kings may move/capture in both directions.
   Promotion ENDS the turn in American checkers, including during a capture.
*/
const $ = id => document.getElementById(id);
const FILES = 'abcdefgh';
const KEY = 'naches-checkers-academy-deluxe-v1';
const START_STATS = {xp:0,wins:0,losses:0,games:0,streak:0,bestStreak:0,solved:[],theme:'royal',pieces:'royal',sound:true,coordinates:true};
function loadStats(){try{let v=JSON.parse(localStorage.getItem(KEY));if(v&&typeof v==='object')return {...START_STATS,...v,solved:Array.isArray(v.solved)?v.solved:[]};}catch(e){}return {...START_STATS};}
let stats=loadStats();
function saveStats(){try{localStorage.setItem(KEY,JSON.stringify(stats));}catch(e){}}
const row = i=>Math.floor(i/8), col=i=>i%8;
const index=(r,c)=>r*8+c;
const inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const dark=i=>(row(i)+col(i))%2===1;
const sideOf=p=>Math.sign(p);
const xy=i=>`${FILES[col(i)]}${8-row(i)}`;
const fromXY=s=>{if(typeof s!=='string'||s.length!==2)return -1;const c=FILES.indexOf(s[0].toLowerCase()),r=8-Number(s[1]);return inside(r,c)?index(r,c):-1;};
const sideName=s=>s===1?'Black':'Red';
const opponent=s=>-s;
const promote=(p,r)=>(p===1&&r===0)?2:(p===-1&&r===7)?-2:p;
const clone=b=>b.slice();
function makeStart(){const b=Array(64).fill(0);for(let i=0;i<64;i++)if(dark(i)){if(row(i)<3)b[i]=-1;else if(row(i)>4)b[i]=1;}return b;}
function parsePosition(data){const b=Array(64).fill(0);for(const [kind,p] of [['black',1],['red',-1],['blackKings',2],['redKings',-2]])for(const place of (data[kind]||[])){const n=fromXY(place);if(n<0||!dark(n)||b[n])throw Error('Invalid puzzle square: '+place);b[n]=p;}return b;}
function directions(piece){const s=Math.sign(piece);return Math.abs(piece)===2?[[-1,-1],[-1,1],[1,-1],[1,1]]:s===1?[[-1,-1],[-1,1]]:[[1,-1],[1,1]];}
function getLegalMoves(board,side){
  const jumps=[];
  function explore(b,at,p,path,captures){
    let found=false;
    for(const [dr,dc] of directions(p)){
      const r=row(at),c=col(at),mr=r+dr,mc=c+dc,tr=r+dr*2,tc=c+dc*2;
      if(!inside(tr,tc)||!inside(mr,mc))continue;
      const mid=index(mr,mc),end=index(tr,tc);
      if(b[mid]*side>=0||b[mid]===0||b[end]!==0)continue;
      found=true;
      const next=clone(b);next[at]=0;next[mid]=0;
      const crowned=promote(p,tr)!==p;
      next[end]=crowned?promote(p,tr):p;
      if(crowned)jumps.push({from:path.length?path[0]:at,path:path.length?path.slice(1).concat(end):[end],captures:captures.concat(mid),promotes:true});
      else explore(next,end,p,path.length?path.concat(end):[at,end],captures.concat(mid));
    }
    if(!found&&captures.length)jumps.push({from:path[0],path:path.slice(1),captures:captures.slice(),promotes:false});
  }
  for(let i=0;i<64;i++)if(board[i]*side>0)explore(board,i,board[i],[],[]);
  if(jumps.length)return jumps;
  const steps=[];
  for(let i=0;i<64;i++)if(board[i]*side>0){for(const [dr,dc] of directions(board[i])){
    const r=row(i)+dr,c=col(i)+dc;
    if(inside(r,c)&&board[index(r,c)]===0)steps.push({from:i,path:[index(r,c)],captures:[],promotes:promote(board[i],r)!==board[i]});
  }}
  return steps;
}
function applyMove(board,move){const b=clone(board),p=b[move.from],end=move.path[move.path.length-1];b[move.from]=0;for(const cap of move.captures)b[cap]=0;b[end]=promote(p,row(end));return b;}
function formatMove(m){const join=m.captures.length?' × ':' – ';return [xy(m.from),...m.path.map(xy)].join(join)+(m.promotes?' ♛':'');}
function pieceCount(board,side){return board.filter(p=>p*side>0).length;}
function gameWinner(board,sideToPlay){if(pieceCount(board,sideToPlay)===0||getLegalMoves(board,sideToPlay).length===0)return -sideToPlay;return 0;}

/* A modest alpha-beta search with forced-capture move generation. */
function evaluate(board,side){let score=0;for(let i=0;i<64;i++){
  const p=board[i];if(!p)continue;const s=Math.sign(p),r=row(i),c=col(i);
  let v=Math.abs(p)===2?192:105;
  if(Math.abs(p)===1){v+=(s===1?7-r:r)*3.7;if((s===1&&r===7)||(s===-1&&r===0))v+=7;}
  v+=(3.5-Math.abs(3.5-r))*2+(3.5-Math.abs(3.5-c))*2;
  if(c===0||c===7)v+=3;
  score+=s* v;
}return score*side;}
function aiChoose(board,side,difficulty){
  const legal=getLegalMoves(board,side);if(!legal.length)return null;if(legal.length===1)return legal[0];
  const depth={rookie:1,tactician:3,master:5,champion:6}[difficulty]||3;
  let nodes=0;const maxNodes=difficulty==='champion'?140000:difficulty==='master'?125000:25000;
  function search(b,s,d,a,beta){
    nodes++;
    const moves=getLegalMoves(b,s);
    if(!moves.length)return -100000-d;
    if(d<=0||nodes>maxNodes)return evaluate(b,s);
    moves.sort((x,y)=>(y.captures.length-x.captures.length)||Number(y.promotes)-Number(x.promotes));
    let best=-Infinity;
    for(const m of moves){const value=-search(applyMove(b,m),-s,d-1,-beta,-a);if(value>best)best=value;if(best>a)a=best;if(a>=beta||nodes>maxNodes)break;}
    return best;
  }
  const ordered=legal.slice().sort((a,b)=>b.captures.length-a.captures.length||Number(b.promotes)-Number(a.promotes));
  const scored=ordered.map(m=>({move:m,score:-search(applyMove(board,m),-side,depth-1,-Infinity,Infinity)}));
  scored.sort((a,b)=>b.score-a.score);
  if(difficulty==='rookie'){
    const near=scored.filter(x=>x.score>=scored[0].score-45);
    return near[Math.floor(Math.random()*near.length)].move;
  }
  const near=scored.filter(x=>x.score>=scored[0].score-((difficulty==='master'||difficulty==='champion')?0:9));
  return near[Math.floor(Math.random()*near.length)].move;
}

const puzzles=[
  {id:'first',title:'The First Jump',level:'BEGINNER',description:'Find the mandatory capture.',note:'If you can jump an opponent’s piece into an empty square, you must capture it.',hint:'The black checker at b4 can hop over the red piece on c5.',pos:{black:['b4'],red:['c5','g7']},solution:['b4','d6'],why:'You recognized the required jump: b4 × d6.',xp:20},
  {id:'double',title:'Double Trouble',level:'BEGINNER',description:'Complete two captures in one turn.',note:'After a jump, check again from the landing square. If another capture is available, keep going.',hint:'Begin at b2. Follow the red pieces up and to the right.',pos:{black:['b2'],red:['c3','e5']},solution:['b2','d4','f6'],why:'A double jump removes two opposing pieces in a single turn.',xp:25},
  {id:'kingback',title:'The King Returns',level:'INTERMEDIATE',description:'Use a king to capture backward.',note:'A king can travel one diagonal square—or jump to capture—in any diagonal direction.',hint:'The black king at f4 can move toward the bottom-left.',pos:{blackKings:['f4'],red:['e3']},solution:['f4','d2'],why:'Kings can capture backward, unlike regular checkers.',xp:25},
  {id:'crown',title:'Road to Royalty',level:'BEGINNER',description:'Capture your way to the king row.',note:'A black checker becomes a king when it finishes on the top row. A red checker promotes on the bottom row.',hint:'Jump from d6 over the red piece on e7.',pos:{black:['d6'],red:['e7']},solution:['d6','f8'],why:'Landing on the final row crowned your piece. The turn ends at promotion.',xp:25},
  {id:'choice',title:'Choose the Bigger Jump',level:'INTERMEDIATE',description:'Two jumps are possible. Find the stronger sequence.',note:'American checkers requires a jump, but you may choose among legal capture routes. Look beyond the first landing.',hint:'The checker on b2 has a longer sequence than the checker on f2.',pos:{black:['b2','f2'],red:['c3','e5','g3']},solution:['b2','d4','f6'],why:'You chose the two-piece capture rather than settling for one.',xp:30},
  {id:'kingchain',title:'King’s Combination',level:'ADVANCED',description:'Chain two royal captures.',note:'Kings can continue capturing in any diagonal direction, with each captured piece removed before the next jump.',hint:'The king on f4 can follow the two red checkers toward b8.',pos:{blackKings:['f4'],red:['e5','c7']},solution:['f4','d6','b8'],why:'The king reached b8 by capturing twice in a row.',xp:30},
  {id:'triple',title:'Triple Jump',level:'ADVANCED',description:'Three jumps, three captures, one new king.',note:'Scan the full diagonal path. A forced multi-jump is a powerful way to turn a match around.',hint:'Start on b2, then continue diagonally toward the far corner.',pos:{black:['b2'],red:['c3','e5','g7']},solution:['b2','d4','f6','h8'],why:'An excellent triple capture finished with a promotion.',xp:35},
  {id:'redstrike',title:'The Other Side',level:'ADVANCED',description:'Move as Red and complete a double jump.',note:'Red moves toward the bottom of this board. Perspective matters: your opponent has the same tactical opportunities.',hint:'Start with the red piece on f6; capture toward the bottom-left.',pos:{red:['f6'],black:['e5','c3']},side:-1,solution:['f6','d4','b2'],why:'You successfully planned a double capture from Red’s perspective.',xp:35},
  {id:'switchback',title:'The Royal Switchback',level:'MASTERWORK',description:'Change direction in the middle of a king combination.',note:'Kings are powerful because they can reverse direction during a sequence of captures.',hint:'Start from b4, jump up-right, then turn down-right.',pos:{blackKings:['b4'],red:['c5','e5']},solution:['b4','d6','f4'],why:'You used a king to change direction and capture twice.',xp:40},
  {id:'redroyal',title:'Crimson Counterattack',level:'MASTERWORK',description:'Find the two-jump route for the Red king.',note:'When calculating a king move, check all four diagonals at each landing square.',hint:'From e5, jump toward c7, then change direction.',pos:{redKings:['e5'],black:['d6','b6']},side:-1,solution:['e5','c7','a5'],why:'You saw the full route instead of stopping after the first capture.',xp:40},
  {id:'tripleking',title:'Grandmaster’s Waltz',level:'MASTERWORK',description:'Navigate a three-capture zigzag with your king.',note:'A multi-jump may zigzag across the board. Count the landing squares before you commit.',hint:'Begin at d2 and travel toward f4. Keep changing course.',pos:{blackKings:['d2'],red:['e3','e5','c5']},solution:['d2','f4','d6','b4'],why:'Three captures and two changes of direction—excellent calculation.',xp:45},
  {id:'reversal',title:'The Golden Reversal',level:'MASTERWORK',description:'Finish a difficult three-capture Red king sequence.',note:'Look for captures that turn back on themselves. A king can attack from unexpected angles.',hint:'Start at g5 and keep moving diagonally left until the final backward jump.',pos:{redKings:['g5'],black:['f4','d2','b2']},side:-1,solution:['g5','e3','c1','a3'],why:'You followed a three-piece capture sequence and changed direction at the end.',xp:45}
];
const lessons=[
 {num:'01',glyph:'◩',title:'The Board & First Move',detail:'Checkers uses only the dark squares of an 8 × 8 board. Each side starts with 12 pieces. Black plays first and regular pieces step one square diagonally forward.',takeaway:'Try to move toward the center so you have two possible directions.',action:'Open a new match',view:'play'},
 {num:'02',glyph:'×',title:'Captures Are Required',detail:'Jump over an adjacent opposing checker into an empty dark square to capture it. In American checkers you must take a capture when one is available.',takeaway:'Before moving, scan for jumps—yours and your opponent’s.',action:'Practice a capture',puzzle:0},
 {num:'03',glyph:'↗',title:'The Multi-Jump',detail:'After capturing, if that same piece can jump another opponent, continue. A complete capture sequence is a single turn, even if it takes several jumps.',takeaway:'Plan the entire sequence before making your first jump.',action:'Try a double jump',puzzle:1},
 {num:'04',glyph:'♛',title:'Crowning a King',detail:'When a regular piece reaches the farthest row, it becomes a king. Kings can move and capture in all four diagonal directions, one step at a time or by jumping.',takeaway:'A regular piece that gets crowned ends its turn, even if a king could jump backward.',action:'Earn a crown',puzzle:3},
 {num:'05',glyph:'◇',title:'Control the Center',detail:'Pieces near the middle usually have more potential moves and support each other. Avoid advancing isolated pieces that can be jumped easily.',takeaway:'A pair of connected checkers is often safer than two pieces apart.',action:'Apply the strategy',view:'play'},
 {num:'06',glyph:'⚑',title:'Look Two Moves Ahead',detail:'Before you move, ask: What will my opponent do? Could they capture me? Can I force a useful trade? Think about the next position, not just this one.',takeaway:'When two captures are legal, compare the whole chains.',action:'Solve a choice puzzle',puzzle:4},
 {num:'07',glyph:'★',title:'Endgame Fundamentals',detail:'With fewer pieces on the board, kings and diagonal control become especially important. You win when the opponent has no checkers left—or no legal way to move.',takeaway:'Do not let your last checker become trapped on the edge.',action:'Challenge the computer',view:'play'},
 {num:'08',glyph:'♕',title:'Kings Can Switch Direction',detail:'During a multi-jump, a king may change diagonal direction at each landing square. Only the jumping king continues the capture sequence.',takeaway:'After each landing, scan all four diagonal directions before ending your move.',action:'Try the switchback',puzzle:8},
 {num:'09',glyph:'✧',title:'Plan a Counterattack',detail:'A strong player studies both sides of the board. A tempting move may expose your pieces to a chain capture. Before advancing, look for every jump your opponent will have.',takeaway:'Say the opponent’s best reply aloud before choosing your move.',action:'Solve the counterattack',puzzle:9}
];
const themes=[{id:'royal',name:'Royal Navy',xp:0,colors:['#1a3051','#e8d9b9']},{id:'ivory',name:'Ivory Palace',xp:80,colors:['#5b6175','#faf1db']},{id:'forest',name:'Emerald Chamber',xp:180,colors:['#235048','#ddd7b7']},{id:'midnight',name:'Midnight Sapphire',xp:320,colors:['#212547','#b5bbd2']},{id:'sunset',name:'Rosewood Hall',xp:500,colors:['#754957','#f1d6be']},{id:'arcade',name:'Celestial Blue',xp:750,colors:['#25648a','#c4e4e4']}];
const pieces=[{id:'royal',name:'Royal Medallions',xp:0},{id:'classic',name:'Tournament Classics',xp:150},{id:'arcade',name:'Starfall Tokens',xp:350}];
const badges=[{id:'first',name:'First Move',desc:'Solve any puzzle.',symbol:'✦',test:()=>stats.solved.length>=1},{id:'combo',name:'Combo Expert',desc:'Solve a multi-jump puzzle.',symbol:'×2',test:()=>['double','choice','kingchain','triple','redstrike'].some(p=>stats.solved.includes(p))},{id:'collector',name:'Puzzle Scholar',desc:'Solve all twelve puzzles.',symbol:'♛',test:()=>stats.solved.length===puzzles.length},{id:'victory',name:'First Victory',desc:'Beat a computer opponent.',symbol:'★',test:()=>stats.wins>=1},{id:'veteran',name:'Board Veteran',desc:'Complete ten matches.',symbol:'10',test:()=>stats.games>=10},{id:'streak',name:'Three in a Row',desc:'Win three computer games in a row.',symbol:'3',test:()=>stats.bestStreak>=3},{id:'royal',name:'Royal Scholar',desc:'Solve one of the four masterwork puzzles.',symbol:'♕',test:()=>['switchback','redroyal','tripleking','reversal'].some(id=>stats.solved.includes(id))}];
const milestones=[0,80,180,320,500,750,1050,1400,1800,2250,2750,3300];
function playerLevel(){let l=1;while(l<milestones.length&&stats.xp>=milestones[l])l++;return l;}
function levelLabel(l){return l<=2?'Rookie':l<=4?'Explorer':l<=6?'Tactician':l<=8?'Strategist':'Grandmaster';}
function awardXp(x){stats.xp+=x;saveStats();renderStats();renderLocker();if(x)toast(`+${x} Academy XP earned!`);}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),2800);}
function sound(kind='move'){
 if(!stats.sound)return;
 try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=sound.ctx||(sound.ctx=new C());if(ctx.state==='suspended')ctx.resume();const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type=kind==='win'?'sine':'triangle';o.frequency.setValueAtTime(kind==='capture'?370:kind==='win'?620:480,t);o.frequency.exponentialRampToValueAtTime(kind==='capture'?250:kind==='win'?880:320,t+.11);g.gain.setValueAtTime(.045,t);g.gain.exponentialRampToValueAtTime(.001,t+.15);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+.16);}catch(e){}
}
function modal(title,text,actions=[{label:'Continue',fn:()=>{}}],icon='★'){
 $('modal-title').textContent=title;$('modal-text').textContent=text;$('modal-icon').textContent=icon;
 const c=$('modal-actions');c.replaceChildren();for(const a of actions){const b=document.createElement('button');b.textContent=a.label;if(a.secondary)b.className='secondary';b.addEventListener('click',()=>{$('modal').classList.add('hidden');a.fn();});c.appendChild(b);} $('modal').classList.remove('hidden');
}
let currentView='play',turnSerial=0,game,puzzle;
const ui={mode:'ai',difficulty:'tactician',playerSide:1,flipped:false,puzzleIndex:0};
function newGame(){
 turnSerial++;
 game={board:makeStart(),side:1,mode:ui.mode,playerSide:ui.playerSide,difficulty:ui.difficulty,
  flipped:ui.mode==='ai'&&ui.playerSide===-1,selected:null,active:null,hint:null,history:[],logs:[],over:false,winner:0,lastMove:null,moves:0};
 renderGame();if(isAiTurn())scheduleAi();
}
function isAiTurn(){return game&&!game.over&&game.mode==='ai'&&game.side!==game.playerSide;}
function isHumanTurn(){return game&&!game.over&&!isAiTurn();}
function sideDisplay(s){if(game.mode==='local')return s===1?'Player 1 · Black':'Player 2 · Red';return s===game.playerSide?`You · ${sideName(s)}`:`Computer · ${sideName(s)}`;}
function saveHistory(){game.history.push({board:clone(game.board),side:game.side,logsLength:game.logs.length,moves:game.moves,lastMove:game.lastMove?{...game.lastMove}:null});}
function restoreHistory(item){game.board=item.board;game.side=item.side;game.logs.length=item.logsLength;game.moves=item.moves;game.lastMove=item.lastMove;game.over=false;game.winner=0;game.active=null;game.selected=null;game.hint=null;}
function userUndo(){
 if(!game||game.over)return;turnSerial++;
 if(game.active){const h=game.history.pop();if(h)restoreHistory(h);renderGame();return;}
 if(!game.history.length){toast('No moves to undo yet.');if(isAiTurn())scheduleAi();return;}
 let steps=1;
 // If the computer just completed a move, undo both that move and the human move.
 if(game.mode==='ai'&&game.logs.length>=2&&game.logs[game.logs.length-1].ai&&game.logs[game.logs.length-2].ai===false)steps=2;
 for(let i=0;i<steps;i++){const h=game.history.pop();if(h)restoreHistory(h);}
 renderGame();if(isAiTurn())scheduleAi();
}
function startMove(state,indexPiece,legal){state.selected=indexPiece;state.candidates=legal.filter(m=>m.from===indexPiece);state.hint=null;}
function destinations(state){
 if(state.active)return state.active.options.map(m=>m.path[state.active.step]).filter((n,i,a)=>a.indexOf(n)===i);
 return state.selected===null?[]:(state.candidates||[]).map(m=>m.path[0]).filter((n,i,a)=>a.indexOf(n)===i);
}
function moveStep(state,to,onComplete){
 if(!state.active){
  state.active={from:state.selected,options:state.candidates,step:0,last:state.selected};
  if(state===game)saveHistory();
 }
 const a=state.active,possible=a.options.filter(m=>m.path[a.step]===to);if(!possible.length)return false;
 const m=possible[0],piece=state.board[a.last];state.board[a.last]=0;state.board[to]=piece;
 if(m.captures.length){state.board[m.captures[a.step]]=0;sound('capture');}else sound('move');
 a.last=to;a.step++;a.options=possible;state.selected=to;
 if(a.step===m.path.length){state.board[to]=promote(piece,row(to));const full=m;state.active=null;state.selected=null;state.candidates=[];state.hint=null;onComplete(full);}
 else{state.hint=null;renderState(state);}
 return true;
}
function renderState(state){if(state===game)renderGame();else renderPuzzle();}
function clickGameSquare(i){
 if(!isHumanTurn())return;
 const legal=getLegalMoves(game.board,game.side);
 if(game.active){if(destinations(game).includes(i))moveStep(game,i,finishGameMove);else toast('Finish the required jump sequence.');return;}
 if(game.selected!==null&&destinations(game).includes(i)){moveStep(game,i,finishGameMove);return;}
 if(game.board[i]*game.side>0){
  if(!legal.some(m=>m.from===i)){toast(legal.some(m=>m.captures.length)?'A capture is required. Choose a piece that can jump.':'That piece has no legal move.');return;}
  startMove(game,i,legal);renderGame();return;
 }
 if(game.selected!==null){game.selected=null;game.candidates=[];renderGame();}
}
function finishGameMove(m,ai=false){
 const played=game.side;game.logs.push({side:played,move:m,ai});game.moves++;game.lastMove={from:m.from,to:m.path[m.path.length-1]};
 game.side=-played;
 const won=gameWinner(game.board,game.side);
 game.winner=won;game.over=won!==0;
 renderGame();
 if(game.over){endMatch(won);return;}
 if(isAiTurn())scheduleAi();
}
function scheduleAi(){
 if(!isAiTurn())return;
 const token=++turnSerial;
 renderGame();
 setTimeout(()=>{
  if(token!==turnSerial||!isAiTurn())return;
  let aiMove=aiChoose(game.board,game.side,game.difficulty);
  if(!aiMove)return;
  saveHistory();
  game.board=applyMove(game.board,aiMove);
  sound(aiMove.captures.length?'capture':'move');
  finishGameMove(aiMove,true);
 },['master','champion'].includes(game.difficulty)?340:290);
}
function endMatch(winner,{resigned=false}={}){
 const ai=game.mode==='ai',humanWon=winner===game.playerSide;
 stats.games++;
 let earned=0;
 if(ai){if(humanWon&&!resigned){stats.wins++;stats.streak++;stats.bestStreak=Math.max(stats.streak,stats.bestStreak);earned={rookie:30,tactician:55,master:95,champion:130}[game.difficulty];}else{stats.losses++;stats.streak=0;earned=(!resigned&&game.moves>=12)?10:0;}}
 else earned=(!resigned&&game.moves>=12)?12:0;
 saveStats();awardXp(earned);sound('win');
 const headline=resigned?'Match resigned':ai?(humanWon?'Victory!':'Computer wins'):`${sideName(winner)} wins!`;
 const message=resigned?'Your opponent wins by resignation. Review the board and try another strategy.':ai?(humanWon?`You outplayed the ${game.difficulty} computer. +${earned} XP!`:`The computer won this round. ${earned?`+${earned} XP for the completed match.`:'Keep practicing to earn XP.'}`):`Well played. Both students can analyze the game together. ${earned?`+${earned} academy XP.`:'Play a longer match to earn XP.'}`;
 modal(headline,message,[{label:'Play again',fn:newGame},{label:'Review board',secondary:true,fn:()=>{}}],humanWon?'★':'♛');
}
function resign(){if(!game||game.over)return;modal('Resign this match?','Resigning awards the game to your opponent. Resigned matches do not award XP.',[{label:'Keep playing',secondary:true,fn:()=>{}},{label:'Resign',fn:()=>{turnSerial++;game.winner=game.mode==='ai'?-game.playerSide:-game.side;game.over=true;endMatch(game.winner,{resigned:true});renderGame();}}],'⚑');}
function requestHint(){if(!isHumanTurn()){toast('Hints are available on your turn.');return;}
 if(game.active){const d=destinations(game);game.hint=d[0];toast(`Continue your jump to ${xy(d[0])}.`);renderGame();return;}
 const legal=getLegalMoves(game.board,game.side);if(!legal.length)return;
 const m=aiChoose(game.board,game.side,'tactician');game.selected=m.from;game.candidates=legal.filter(x=>x.from===m.from);game.hint=m.path[0];renderGame();toast(`Try ${xy(m.from)} → ${xy(m.path[0])}${m.captures.length?' (capture)':''}.`);
}
function renderBoard(el,state,handler,opt={}){
 const fragment=document.createDocumentFragment(),flipped=!!opt.flipped,opts=destinations(state);
 const selected=state.selected,last=opt.lastMove||null;
 for(let v=0;v<64;v++){
  const i=flipped?63-v:v,p=state.board[i],sq=document.createElement('button');
  sq.type='button';sq.className=`square ${dark(i)?'dark':'light'}`;
  if(i===selected)sq.classList.add('selected');
  if(last&&(i===last.from||i===last.to))sq.classList.add('last-move');
  if(i===state.hint)sq.classList.add('hint-square');
  if(opts.includes(i))sq.classList.add('legal',state.active||((state.candidates||[]).some(m=>m.captures.length))?'capture':'normal');
  const pieceDescription=p?`${sideName(Math.sign(p))} ${Math.abs(p)===2?'king':'checker'}`:'empty';
  sq.setAttribute('aria-label',`${xy(i)}, ${pieceDescription}${opts.includes(i)?', available move':''}`);
  sq.setAttribute('role','gridcell');sq.dataset.index=i;
  if(dark(i))sq.addEventListener('click',()=>handler(i));else sq.disabled=true;
  if(p){const disc=document.createElement('span');disc.className=`checker ${p>0?'black':'red'} ${stats.pieces}`;
   const inn=document.createElement('span');inn.className=Math.abs(p)===2?'crown':'inner-icon';inn.textContent=Math.abs(p)===2?'♛':(stats.pieces==='arcade'?'✦':stats.pieces==='royal'?'◆':'');disc.appendChild(inn);sq.appendChild(disc);
  }
  if(stats.coordinates&&((!flipped&&col(i)===0)||(flipped&&col(i)===7))){const coord=document.createElement('span');coord.className='coord';coord.textContent=8-row(i);sq.appendChild(coord);}
  if(stats.coordinates&&((!flipped&&row(i)===7)||(flipped&&row(i)===0))){const coord=document.createElement('span');coord.className='coord col-coord';coord.textContent=FILES[col(i)];sq.appendChild(coord);}
  fragment.appendChild(sq);
 }
 el.replaceChildren(fragment);
}
function renderGame(){if(!game)return;
 $('mode-ai').classList.toggle('active',ui.mode==='ai');$('mode-local').classList.toggle('active',ui.mode==='local');
 $('mode-ai').setAttribute('aria-pressed',String(ui.mode==='ai'));$('mode-local').setAttribute('aria-pressed',String(ui.mode==='local'));
 $('ai-options').classList.toggle('hidden',ui.mode==='local');$('difficulty').value=ui.difficulty;
 $('side-black').classList.toggle('active',ui.playerSide===1);$('side-red').classList.toggle('active',ui.playerSide===-1);
 $('side-black').setAttribute('aria-pressed',String(ui.playerSide===1));$('side-red').setAttribute('aria-pressed',String(ui.playerSide===-1));
 $('red-label').textContent=sideDisplay(-1);$('black-label').textContent=sideDisplay(1);
 $('black-count').textContent=pieceCount(game.board,1)+' pieces';$('red-count').textContent=pieceCount(game.board,-1)+' pieces';
 $('turn-status').textContent=game.over?`${sideName(game.winner)} wins!`:isAiTurn()?'Computer thinking…':`${sideName(game.side)} to move`;
 $('game-caption').textContent=game.active?'Complete every jump':game.over?'Match complete':getLegalMoves(game.board,game.side).some(m=>m.captures.length)?'A capture is required':'Select a checker to move';
 $('undo-btn').disabled=game.over||game.history.length===0;
 $('hint-btn').disabled=!isHumanTurn();$('resign-btn').disabled=game.over;
 $('move-counter').textContent=`MOVE ${String(Math.floor(game.moves/2)+1).padStart(2,'0')}`;
 renderBoard($('board'),game,clickGameSquare,{flipped:game.flipped,lastMove:game.lastMove});
 const history=$('move-history');if(!game.logs.length){history.innerHTML='<div class="history-empty">Your opening move is waiting.</div>';}else{
  history.replaceChildren();game.logs.forEach((item,n)=>{const e=document.createElement('div');e.className='move-entry';
   const number=document.createElement('span');number.className='move-num';number.textContent=`${Math.floor(n/2)+1}.${item.side===-1?'..':''}`;
   const label=document.createElement('b');label.textContent=formatMove(item.move);
   const note=document.createElement('span');note.className='move-note';note.textContent=item.move.captures.length?`${item.move.captures.length} CAP`:item.move.promotes?'KING':'';
   e.append(number,label,note);history.appendChild(e);
  });history.scrollTop=history.scrollHeight;
 }
 let tip='The middle squares give you more options. Look for safe ways to advance.';
 if(game.over)tip='Review the move history and consider one move you would change next time.';
 else if(isAiTurn())tip='Watch the computer move and look for a weakness in its next position.';
 else if(game.active)tip='You must finish all available jumps with the same piece.';
 else if(getLegalMoves(game.board,game.side).some(m=>m.captures.length))tip='A jump is available. American checkers requires you to capture.';
 else if(game.moves>14)tip='In the middle game, look for trades that favor your position and routes to a king.';
 $('coach-tip').textContent=tip;
 renderStats();
}
function renderStats(){
 $('stat-wins').textContent=stats.wins;$('stat-puzzles').textContent=`${stats.solved.length} / ${puzzles.length}`;
 $('stat-games').textContent=stats.games;$('stat-streak').textContent=stats.bestStreak;
 const l=playerLevel(),last=milestones[l-1]??0,next=milestones[l]??milestones[milestones.length-1]+750;
 $('level-badge').textContent=l;$('rank-name').textContent=levelLabel(l);$('xp-label').textContent=`${stats.xp-last} / ${next-last} XP`;
 $('xp-fill').style.width=`${Math.min(100,(stats.xp-last)/(next-last)*100)}%`;
 const nextBadge=badges.find(b=>!b.test());$('badge-goal').textContent=nextBadge?`${nextBadge.name}: ${nextBadge.desc}`:'All academy badges earned. Keep practicing!';
 $('puzzle-head-total').textContent=`${stats.solved.length} OF ${puzzles.length} COMPLETE`;
}
function loadPuzzle(n){
 ui.puzzleIndex=(n+puzzles.length)%puzzles.length;
 const config=puzzles[ui.puzzleIndex];turnSerial++;
 puzzle={board:parsePosition(config.pos),side:config.side||1,selected:null,active:null,candidates:[],hint:null,done:false,failed:false};
 renderPuzzle();
}
function clickPuzzleSquare(i){
 if(!puzzle||puzzle.done||puzzle.failed)return;
 const legal=getLegalMoves(puzzle.board,puzzle.side);
 if(puzzle.active){if(destinations(puzzle).includes(i))moveStep(puzzle,i,finishPuzzleMove);else toast('Complete your jump sequence.');return;}
 if(puzzle.selected!==null&&destinations(puzzle).includes(i)){moveStep(puzzle,i,finishPuzzleMove);return;}
 if(puzzle.board[i]*puzzle.side>0){
  if(!legal.some(m=>m.from===i)){toast('That piece cannot move here. Look for a required capture.');return;}
  startMove(puzzle,i,legal);renderPuzzle();return;
 }
 if(puzzle.selected!==null){puzzle.selected=null;puzzle.candidates=[];renderPuzzle();}
}
function finishPuzzleMove(m){
 const config=puzzles[ui.puzzleIndex];
 const found=[xy(m.from),...m.path.map(xy)];
 const success=found.length===config.solution.length&&found.every((x,i)=>x===config.solution[i]);
 if(success){
  puzzle.done=true;
  const newSolve=!stats.solved.includes(config.id);
  if(newSolve){stats.solved.push(config.id);awardXp(config.xp);saveStats();}
  sound('win');renderPuzzle();renderStats();
  toast(newSolve?`Solved! +${config.xp} XP`:'Solved! Puzzle already completed.');
 }else{
  puzzle.failed=true;renderPuzzle();
  $('puzzle-message').textContent='Not quite. That was legal, but another route is stronger. Press Retry.';
  toast('Good try! Look for a better sequence.');
 }
}
function renderPuzzle(){if(!puzzle)return;const config=puzzles[ui.puzzleIndex];
 $('puzzle-level-tag').textContent=`PUZZLE ${String(ui.puzzleIndex+1).padStart(2,'0')} · ${config.level}`;
 $('puzzle-title').textContent=config.title;$('puzzle-description').textContent=config.description;
 $('puzzle-coach-text').textContent=config.note;
 $('puzzle-message').textContent=puzzle.done?config.why:puzzle.failed?'Try again to find the stronger move.':puzzle.active?'Keep jumping with the same piece.':`${sideName(puzzle.side)} to move. ${config.description}`;
 $('puzzle-hint').disabled=puzzle.done||puzzle.failed;
 $('puzzle-next').textContent=ui.puzzleIndex===puzzles.length-1?'First puzzle ↺':'Next puzzle →';
 renderBoard($('puzzle-board'),puzzle,clickPuzzleSquare,{flipped:puzzle.side===-1});
 const overlay=$('puzzle-overlay');overlay.classList.toggle('hidden',!puzzle.done);
 if(puzzle.done){overlay.replaceChildren();const emblem=document.createElement('div');emblem.className='big-check';emblem.textContent='✓';
  const title=document.createElement('h3');title.textContent='Puzzle solved!';
  const why=document.createElement('p');why.textContent=config.why;
  const xp=document.createElement('div');xp.className='xp-earned';xp.textContent=stats.solved.includes(config.id)?`★ ${config.xp} XP CHALLENGE`:'★ COMPLETE';
  overlay.append(emblem,title,why,xp);
 }
 const cards=$('puzzle-cards');cards.replaceChildren();puzzles.forEach((p,n)=>{
  const b=document.createElement('button');b.className='puzzle-card'+(n===ui.puzzleIndex?' active':'');
  b.setAttribute('aria-pressed',String(n===ui.puzzleIndex));
  const num=document.createElement('span');num.className='num';num.textContent=String(n+1).padStart(2,'0');
  const middle=document.createElement('div');const name=document.createElement('b');name.textContent=p.title;const level=document.createElement('small');level.textContent=`${p.level} · +${p.xp} XP`;middle.append(name,level);
  const check=document.createElement('span');check.className='check';check.textContent=stats.solved.includes(p.id)?'✓':'';
  b.append(num,middle,check);b.addEventListener('click',()=>loadPuzzle(n));cards.appendChild(b);
 });
}
function hintPuzzle(){if(!puzzle||puzzle.done||puzzle.failed)return;
 const config=puzzles[ui.puzzleIndex],solution=config.solution.map(fromXY);
 const origin=solution[0];
 if(puzzle.active){const n=solution[puzzle.active.step+1];if(destinations(puzzle).includes(n))puzzle.hint=n;}
 else {const legal=getLegalMoves(puzzle.board,puzzle.side);if(legal.some(m=>m.from===origin)){startMove(puzzle,origin,legal);puzzle.hint=solution[1];}}
 renderPuzzle();toast(config.hint);
}
function drawLessons(){const host=$('lesson-grid');host.replaceChildren();lessons.forEach(x=>{
 const item=document.createElement('article');item.className='lesson surface';
 const num=document.createElement('div');num.className='lesson-number';num.textContent=`LESSON ${x.num}`;
 const icon=document.createElement('div');icon.className='lesson-glyph';icon.textContent=x.glyph;
 const title=document.createElement('h2');title.textContent=x.title;
 const p=document.createElement('p');p.textContent=x.detail;
 const takeaway=document.createElement('div');takeaway.className='takeaway';takeaway.textContent=`COACH TIP · ${x.takeaway}`;
 const button=document.createElement('button');button.textContent=x.action+' →';button.addEventListener('click',()=>{if(x.puzzle!==undefined){loadPuzzle(x.puzzle);showView('puzzles');}else{showView('play');newGame();}});
 item.append(num,icon,title,p,takeaway,button);host.appendChild(item);
 });}
function drawCosmetics(){
 const th=$('theme-options');th.replaceChildren();themes.forEach(x=>{
  const unlocked=stats.xp>=x.xp;const b=document.createElement('button');b.className=`cosmetic-option ${stats.theme===x.id?'active':''} ${unlocked?'':'locked'}`;b.disabled=!unlocked;
  const preview=document.createElement('div');preview.className='sample-swatches';x.colors.forEach(c=>{const span=document.createElement('span');span.style.background=c;preview.appendChild(span);});
  const title=document.createElement('b');title.textContent=x.name;const desc=document.createElement('small');desc.textContent=unlocked?(stats.theme===x.id?'✓ Equipped':'Tap to equip'):`🔒 Unlock at ${x.xp} XP`;
  b.append(preview,title,desc);b.addEventListener('click',()=>{stats.theme=x.id;saveStats();setCosmetics();drawCosmetics();renderGame();renderPuzzle();});th.appendChild(b);
 });
 const ph=$('piece-options');ph.replaceChildren();pieces.forEach(x=>{
  const unlocked=stats.xp>=x.xp;const b=document.createElement('button');b.className=`cosmetic-option ${stats.pieces===x.id?'active':''} ${unlocked?'':'locked'}`;b.disabled=!unlocked;
  const preview=document.createElement('span');preview.className='sample-piece '+x.id;
  const title=document.createElement('b');title.textContent=x.name;const desc=document.createElement('small');desc.textContent=unlocked?(stats.pieces===x.id?'✓ Equipped':'Tap to equip'):`🔒 Unlock at ${x.xp} XP`;
  b.append(preview,title,desc);b.addEventListener('click',()=>{stats.pieces=x.id;saveStats();setCosmetics();drawCosmetics();renderGame();renderPuzzle();});ph.appendChild(b);
 });
}
function setCosmetics(){const t=themes.find(x=>x.id===stats.theme&&stats.xp>=x.xp);const p=pieces.find(x=>x.id===stats.pieces&&stats.xp>=x.xp);if(!t)stats.theme='royal';if(!p)stats.pieces='royal';document.body.dataset.theme=stats.theme;document.body.dataset.pieces=stats.pieces;}
function renderLocker(){
 const l=playerLevel(),start=milestones[l-1]??0,end=milestones[l]??milestones[milestones.length-1]+750;
 $('locker-level').textContent=l;$('locker-rank').textContent=levelLabel(l)+' Strategist';
 $('locker-experience').textContent=`${stats.xp.toLocaleString()} lifetime XP · ${stats.games} games played`;
 $('locker-total').textContent=`LEVEL ${l} · ${stats.xp.toLocaleString()} XP`;
 $('locker-progress').style.width=`${Math.min(100,100*(stats.xp-start)/(end-start))}%`;
 drawCosmetics();
 const host=$('achievement-list');host.className='achievement-list';host.replaceChildren();badges.forEach(b=>{
  const achieved=b.test();const a=document.createElement('div');a.className='achievement-item'+(achieved?'':' locked');
  const symbol=document.createElement('span');symbol.className='achievement-symbol';symbol.textContent=achieved?b.symbol:'?';
  const details=document.createElement('div');const title=document.createElement('b');title.textContent=b.name;
  const description=document.createElement('p');description.textContent=b.desc;details.append(title,description);a.append(symbol,details);host.appendChild(a);
 });
}
function renderCoordsButton(){const button=$('coords-btn');button.textContent=stats.coordinates?'▦  Coordinates on':'▤  Coordinates off';button.setAttribute('aria-pressed',String(stats.coordinates));}
function showView(view){if(!['play','puzzles','learn','locker'].includes(view))view='play';currentView=view;
 document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===`view-${view}`));
 document.querySelectorAll('[data-view]').forEach(x=>{const active=x.dataset.view===view;x.classList.toggle('active',active);x.setAttribute('aria-current',active?'page':'false');});
 if(view==='locker')renderLocker();if(view==='puzzles')renderPuzzle();
 if(location.hash!==`#${view}`)history.replaceState(null,'',`#${view}`);
 window.scrollTo({top:0,behavior:'instant'});
}
function init(){
 setCosmetics();drawLessons();loadPuzzle(0);newGame();renderLocker();renderStats();renderCoordsButton();
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
 $('mode-ai').addEventListener('click',()=>{ui.mode='ai';newGame();});
 $('mode-local').addEventListener('click',()=>{ui.mode='local';newGame();});
 $('difficulty').addEventListener('change',e=>{ui.difficulty=e.target.value;newGame();});
 $('side-black').addEventListener('click',()=>{ui.playerSide=1;newGame();});
 $('side-red').addEventListener('click',()=>{ui.playerSide=-1;newGame();});
 $('new-game').addEventListener('click',newGame);
 $('undo-btn').addEventListener('click',userUndo);
 $('hint-btn').addEventListener('click',requestHint);
 $('resign-btn').addEventListener('click',resign);
 $('sound-btn').addEventListener('click',()=>{stats.sound=!stats.sound;saveStats();$('sound-btn').innerHTML=stats.sound?'<span>♫</span> Sound on':'<span>♫</span> Sound off';if(stats.sound)sound();$('sound-btn').setAttribute('aria-pressed',String(stats.sound));});
 $('sound-btn').innerHTML=stats.sound?'<span>♫</span> Sound on':'<span>♫</span> Sound off';$('sound-btn').setAttribute('aria-pressed',String(stats.sound));
 $('flip-board').addEventListener('click',()=>{game.flipped=!game.flipped;renderGame();});
 $('coords-btn').addEventListener('click',()=>{stats.coordinates=!stats.coordinates;saveStats();renderCoordsButton();renderGame();renderPuzzle();});
 $('rules-toggle').addEventListener('click',()=>{$('rules-panel').classList.toggle('hidden');});
 $('open-puzzles').addEventListener('click',()=>showView('puzzles'));
 $('puzzle-hint').addEventListener('click',hintPuzzle);
 $('puzzle-reset').addEventListener('click',()=>loadPuzzle(ui.puzzleIndex));
 $('puzzle-next').addEventListener('click',()=>loadPuzzle(ui.puzzleIndex+1));
 $('reset-progress').addEventListener('click',()=>modal('Reset academy progress?','This deletes your saved XP, unlocked boards, achievements and match statistics on this browser. This cannot be undone.',[
  {label:'Cancel',secondary:true,fn:()=>{}},{label:'Reset everything',fn:()=>{stats={...START_STATS,solved:[]};saveStats();setCosmetics();renderStats();renderLocker();renderGame();renderPuzzle();toast('Academy progress reset.');}}
 ],'⚠'));
 window.addEventListener('hashchange',()=>showView(location.hash.slice(1)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal').classList.contains('hidden'))$('modal').classList.add('hidden');});
 showView(location.hash.slice(1)||'play');
}
window.CheckersEngine={makeStart,getLegalMoves,applyMove,parsePosition,xy,fromXY,aiChoose,gameWinner,puzzles};
window.addEventListener('DOMContentLoaded',init);
