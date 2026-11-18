import { castleBridges, castleIsland, castleIslandDistance } from './drive-rally-terrain.js';

function drawChart(canvas, campaign, position, parked, next, stage) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const detail = campaign.id === 'castle' && castleIslandDistance(position.x, position.z) < .98;
  const scale = detail ? 4.7 : .83;
  const x = point => width / 2 + point.x * scale;
  const y = point => height / 2 + point.z * scale;
  ctx.fillStyle = detail ? '#233e35' : '#163f43';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#286064';
  ctx.lineWidth = 1;
  for (let i = 16; i < width; i += 22) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
  }
  for (let i = 16; i < height; i += 22) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
  }

  if (detail) {
    ctx.fillStyle = '#567660';
    ctx.fillRect(width / 2 - 23.5 * scale, height / 2 - 23.5 * scale, 47 * scale, 47 * scale);
    ctx.fillStyle = '#b5ab81';
    for (const side of [-1, 1]) {
      const end = 23.5 * scale, halfGate = 3.1 * scale;
      for (const wing of [-1, 1]) {
        const start = wing < 0 ? -end : halfGate;
        ctx.fillRect(width / 2 + start, height / 2 + side * end, end - halfGate, 4);
        ctx.fillRect(width / 2 + side * end, height / 2 + start, 4, end - halfGate);
      }
    }
  } else {
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const [index, point] of campaign.game.route.checkpoints.entries()) {
      if (index) ctx.lineTo(x(point), y(point));
      else ctx.moveTo(x(point), y(point));
    }
    ctx.closePath();
    ctx.strokeStyle = '#587b5d'; ctx.lineWidth = 44; ctx.stroke();
    ctx.strokeStyle = '#c0a676'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#587b5d';
    ctx.beginPath();
    ctx.ellipse(x(castleIsland), y(castleIsland), castleIsland.width * scale, castleIsland.length * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d6bc86';
    ctx.lineWidth = 2;
    for (const { outer, inner } of castleBridges) {
      ctx.beginPath(); ctx.moveTo(x(outer), y(outer)); ctx.lineTo(x(inner), y(inner)); ctx.stroke();
    }
    ctx.fillStyle = '#d9c6a1';
    ctx.fillRect(width / 2 - 12, height / 2 - 12, 24, 24);
  }

  if (campaign.id === 'beach' || detail) for (const [i, point] of Object.values(campaign.game.stops).entries()) {
    ctx.beginPath();
    ctx.fillStyle = point === next ? '#ffe5a0' : i < stage ? '#bbd49f' : '#193a38';
    ctx.arc(x(point), y(point), 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = i <= stage ? '#132d2b' : '#e9dbba';
    ctx.fillText(String(i + 1), x(point), y(point) + .5);
  }
  if (next) {
    ctx.beginPath();
    ctx.strokeStyle = '#fff5bd';
    ctx.lineWidth = 1.7;
    ctx.arc(x(next), y(next), detail ? 7 : 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#f1ab80';
  ctx.fillRect(x(parked) - 3.5, y(parked) - 3.5, 7, 7);
  ctx.beginPath();
  ctx.fillStyle = '#86e8f3';
  ctx.arc(x(position), y(position), 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#183034'; ctx.stroke();
}

export function bindHuntHud(hunt, castle, copy, castleCopy, {
  game, announce, setPaused, canPlay, position, parkedPosition, rewardCoins, nearbyNotes, openNotes,
}) {
  if (!hunt) return null;
  const find = id => document.getElementById(id);
  const dialog = find('hunt-log');
  const open = find('hunt-open');
  const action = find('hunt-action');
  const objective = find('hunt-next');
  const meter = find('hunt-distance');
  const arrow = find('hunt-arrow');
  const arrowHead = arrow.firstElementChild;
  const count = find('hunt-count');
  const selector = find('hunt-campaign');
  const campaigns = new Map([
    ['beach', { id:'beach', game:hunt, copy, reward:'treasureFound', coins:25 }],
    ['castle', { id:'castle', game:castle, copy:castleCopy, reward:'treasuryDone', coins:50 }],
  ]);
  let active, labelNodes, lastStage, lastHint, lastAction;
  let visible = false, inCastle = false, walking = false, heading = 0;

  function choose(id) {
    const campaign = campaigns.get(id);
    if (!campaign || active === campaign) return;
    active = campaign;
    selector.value = id;
    const list = find('hunt-stops');
    list.replaceChildren();
    labelNodes = Object.values(active.copy.stages).map(label => {
      const li = document.createElement('li');
      li.textContent = label;
      list.append(li);
      return li;
    });
    find('hunt-active-title').textContent = active.copy.title;
    lastStage = -1;
    lastHint = lastAction = '';
  }
  choose('beach');

  function hintFor(state) {
    const words = active.copy;
    if (state.seconds > 0) return words.running.replace('{gate}', String(state.gate)).replace('{total}', String(state.gates))
      .replace('{time}', String(Math.ceil(state.seconds)));
    if (state.solving) return words.order + ' · ' + state.combination + ' / 3';
    const hint = words.hints[state.stage];
    return state.total > 1 ? hint + ' · ' + state.progress + ' / ' + state.total : hint;
  }
  function bridgeHint(target) {
    if (target?.id === 'bridge') return walking ? castleCopy.walkToBridge : castleCopy.bridgeHint;
    if (target?.id === 'crossing') return walking ? castleCopy.crossingHint : castleCopy.bridgeHint;
    return null;
  }

  function update(onFoot, yaw) {
    walking = onFoot;
    heading = yaw;
    const player = position();
    const inside = castle.contains(player);
    if (onFoot && inside && !inCastle && active.id !== 'castle') choose('castle');
    inCastle = inside;
    const state = active.game.status();
    const target = active.game.target(player);
    if (state.stage !== lastStage) {
      count.textContent = String(state.stage) + ' / ' + labelNodes.length;
      labelNodes.forEach((li, index) => {
        li.toggleAttribute('data-complete', index < state.stage);
        if (index === state.stage) li.setAttribute('aria-current', 'step');
        else li.removeAttribute('aria-current');
      });
      lastStage = state.stage;
    }
    const hint = bridgeHint(target) ?? hintFor(state);
    if (hint !== lastHint) objective.textContent = lastHint = hint;
    arrow.hidden = !target || state.solving;
    if (!arrow.hidden) {
      const x = target.point.x - player.x, z = target.point.z - player.z;
      const distance = Math.round(Math.hypot(x, z)) + ' m';
      if (meter.textContent !== distance) meter.textContent = distance;
      arrowHead.style.rotate = (Math.atan2(x, -z) + heading) + 'rad';
    } else meter.textContent = '';
    const nearby = visible && (active.game.nearby(player, walking) || walking && nearbyNotes(player) && 'notes');
    action.hidden = !nearby;
    if (nearby && nearby !== lastAction) {
      action.textContent = nearby === 'notes' ? castleCopy.readNotes : active.copy.actions[nearby];
      lastAction = nearby;
    }
  }

  function press(onFoot) {
    if (!canPlay()) return;
    const player = position();
    const result = active.game.interact(player, onFoot);
    if (!result && onFoot) {
      const notes = nearbyNotes(player);
      if (notes) {
        openNotes(notes);
        return;
      }
    }
    if (result === active.reward) rewardCoins(active.coins);
    if (result) announce(active.copy.messages[result], result === active.reward ? 6 : 3.5);
    update(onFoot, heading);
  }

  function updateLog() {
    const state = active.game.status();
    const player = position();
    const parked = parkedPosition();
    const target = active.game.target(player);
    drawChart(find('hunt-map'), active, player, parked, target?.point, state.stage);
    const detail = active.copy.details?.[state.stage];
    find('hunt-instructions').textContent = bridgeHint(target) ?? (state.solving ? copy.order :
      state.seconds > 0 ? active.copy.trailDetails : detail ?? hintFor(state));
    const distance = Math.round(Math.hypot(player.x - parked.x, player.z - parked.z));
    find('hunt-parking').textContent = copy.parking.replace('{distance}', String(distance));
  }
  action.addEventListener('click', () => {
    press(walking);
    game.focus({ preventScroll: true });
  });
  selector.addEventListener('change', () => {
    choose(selector.value);
    update(walking, heading);
    action.hidden = true;
    updateLog();
  });
  open.addEventListener('click', () => {
    if (!canPlay()) return;
    setPaused(true);
    action.hidden = true;
    updateLog();
    dialog.showModal();
  });
  dialog.addEventListener('close', () => {
    game.focus({ preventScroll: true });
    setPaused(false);
  });
  return {
    update, press,
    start() {
      visible = true;
      find('hunt-hud').hidden = false;
    },
    tick(dt, onFoot) {
      for (const campaign of campaigns.values()) {
        const message = campaign.game.update(dt, position(), onFoot);
        if (message && message !== 'gatePassed') announce(campaign.copy.messages[message], 3.5);
      }
    },
  };
}
