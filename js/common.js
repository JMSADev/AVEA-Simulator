/* =========================================================
   Arton Toolkit — utilidades compartilhadas
========================================================= */

function uid(){
  return 'f_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
}

/* ---------- dice ---------- */

function rollDie(sides){
  return 1 + Math.floor(Math.random() * sides);
}

// Rolls a single d20, returns {value}
function rollD20(){
  return rollDie(20);
}

// Parses an expression like "3d8+1d6+12" -> { total, breakdown, diceTerms:[{count,sides,rolls,sum}], flat }
// critMultiplier (default 1) multiplies the DICE portion only, not the flat modifier — a common Tormenta-style house rule.
function rollDamageExpression(expr, critMultiplier){
  critMultiplier = critMultiplier || 1;
  const clean = (expr || '').replace(/\s+/g, '');
  const terms = clean.split('+').filter(Boolean);
  let diceTotal = 0;
  let flat = 0;
  const diceTerms = [];
  terms.forEach(term => {
    const m = term.match(/^(\d+)d(\d+)$/i);
    if(m){
      const count = parseInt(m[1], 10);
      const sides = parseInt(m[2], 10);
      const rolls = [];
      for(let i=0;i<count;i++) rolls.push(rollDie(sides));
      const sum = rolls.reduce((a,b)=>a+b, 0);
      diceTotal += sum;
      diceTerms.push({ count, sides, rolls, sum });
    } else if(/^\d+$/.test(term)){
      flat += parseInt(term, 10);
    }
  });
  const total = diceTotal * critMultiplier + flat;
  return { total, diceTotal, flat, diceTerms, critMultiplier, expr: clean };
}

// Parses a weapon/inventory description string such as:
//   "3d8+1d6+12/x3/12m"  or  "5d6+1d8 +6 x3"  or  "1d8/x2"
// into { diceExpr, critMultiplier, range }. Lenient: pulls dice+flat tokens
// and an "xN" crit multiplier out of the whole string regardless of separators.
function parseWeaponString(str){
  const s = str || '';
  const critMatch = s.match(/x\s*(\d+)/i);
  const critMultiplier = critMatch ? parseInt(critMatch[1], 10) : 2;

  const rangeMatch = s.match(/(\d+)\s*m\b/i);
  const range = rangeMatch ? (rangeMatch[1] + 'm') : '';

  // collect every NdM and standalone flat-number token, in order, ignoring
  // the range number and the crit-multiplier number so they aren't double counted.
  const withoutCrit = critMatch ? s.replace(critMatch[0], ' ') : s;
  const withoutRange = rangeMatch ? withoutCrit.replace(rangeMatch[0], ' ') : withoutCrit;

  const tokens = [];
  const diceRe = /(\d+)\s*d\s*(\d+)/gi;
  let m;
  let consumed = withoutRange;
  while((m = diceRe.exec(withoutRange)) !== null){
    tokens.push(`${m[1]}d${m[2]}`);
    consumed = consumed.replace(m[0], ' ');
  }
  const flatRe = /[+-]?\s*\d+/g;
  let f;
  while((f = flatRe.exec(consumed)) !== null){
    const val = f[0].replace(/\s+/g,'');
    if(val !== '' && val !== '+' && val !== '-') tokens.push(val.startsWith('-') ? val : val.replace('+',''));
  }
  const diceExpr = tokens.join('+').replace(/\+-/g, '-') || '0';
  return { diceExpr, critMultiplier, range };
}

/* ---------- small dom helpers ---------- */

function el(tag, attrs, children){
  const node = document.createElement(tag);
  attrs = attrs || {};
  Object.keys(attrs).forEach(k => {
    const v = attrs[k];
    if(v === undefined || v === null || v === false) return;
    if(k === 'class') node.className = v;
    else if(k === 'html') node.innerHTML = v;
    else if(k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if(v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  });
  (children || []).forEach(c => {
    if(c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function clamp(n, min, max){
  return Math.max(min, Math.min(max, n));
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}
