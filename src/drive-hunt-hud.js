function drawChart(canvas, hunt, position, parked, next, stage) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const { checkpoints } = hunt.route;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#163f43';
  ctx.fillRect(0, 0, width, height);
  const scale = .83;
  const x = point => width / 2 + point.x * scale;
  const y = point => height / 2 + point.z * scale;
  ctx.strokeStyle = '#276064';
  ctx.lineWidth = 1;
  for (let i = 16; i < width; i += 22) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 16; i < height; i += 22) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const [index, point] of checkpoints.entries()) {
    if (index) ctx.lineTo(x(point), y(point));
    else ctx.moveTo(x(point), y(point));
  }
  ctx.closePath();
  ctx.strokeStyle = '#587b5d';
  ctx.lineWidth = 44;
  ctx.stroke();
  ctx.strokeStyle = '#c0a676';
  ctx.lineWidth = 3;
  ctx.stroke();
  for (const [i, point] of Object.values(hunt.stops).entries()) {
    ctx.beginPath();
    ctx.fillStyle = point === next ? '#ffe5a0' : i < stage ? '#bbd49f' : '#193a38';
    ctx.arc(x(point), y(point), 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = i <= stage ? '#132d2b' : '#e9dbba';
    ctx.fillText(String(i + 1), x(point), y(point) + .5);
  }
  ctx.fillStyle = '#f1ab80';
  ctx.fillRect(x(parked) - 3.5, y(parked) - 3.5, 7, 7);
  ctx.beginPath();
  ctx.fillStyle = '#86e8f3';
  ctx.arc(x(position), y(position), 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#183034';
  ctx.stroke();
}

export function bindHuntHud(hunt, copy, { game, announce, setPaused, canPlay, position, parkedPosition, rewardCoins }) {
  if (!hunt) return null;
  const find = id => document.getElementById(id);
  const dialog = find('hunt-log');
  const open = find('hunt-open');
  const action = find('hunt-action');
  const objective = find('hunt-next');
  const meter = find('hunt-distance');
  const arrow = find('hunt-arrow');
  const count = find('hunt-count');
  const labels = Object.values(copy.stages);
  const labelNodes = labels.map((label, index) => {
    const li = document.createElement('li');
    li.textContent = label;
    li.dataset.stop = String(index + 1);
    find('hunt-stops').append(li);
    return li;
  });
  let lastStage = -1;
  let lastHint = '';
  let lastAction = '';
  let visible = false;

  function update(walking, yaw) {
    const { stage, seconds, gate, gates, combination, solving } = hunt.status();
    const target = hunt.target();
    if (stage !== lastStage) {
      count.textContent = String(stage) + ' / ' + labels.length;
      labelNodes.forEach((li, index) => {
        li.toggleAttribute('data-complete', index < stage);
        if (index === stage) li.setAttribute('aria-current', 'step');
        else li.removeAttribute('aria-current');
      });
      lastStage = stage;
    }
    const hint = seconds > 0 ? copy.running.replace('{gate}', String(gate)).replace('{total}', String(gates)).replace('{time}', String(Math.ceil(seconds))) :
      solving ? copy.order + ' · ' + combination + ' / 3' : copy.hints[stage];
    if (hint !== lastHint) objective.textContent = lastHint = hint;
    const player = position();
    arrow.hidden = !target || solving;
    if (target && !solving) {
      const x = target.point.x - player.x, z = target.point.z - player.z;
      const label = Math.round(Math.hypot(x, z)) + ' m';
      if (meter.textContent !== label) meter.textContent = label;
      arrow.querySelector('span').style.rotate = (Math.atan2(x, -z) + yaw) + 'rad';
    } else meter.textContent = '';
    const nearby = visible && hunt.nearby(player, walking);
    action.hidden = !nearby;
    if (nearby && nearby !== lastAction) {
      action.textContent = copy.actions[nearby];
      lastAction = nearby;
    }
  }

  function press(walking) {
    if (!canPlay()) return;
    const result = hunt.interact(position(), walking);
    if (result === 'treasureFound') rewardCoins(25);
    if (result) announce(copy.messages[result], result === 'treasureFound' ? 6 : 3.5);
  }

  action.addEventListener('click', () => {
    press(true);
    game.focus({ preventScroll: true });
  });
  open.addEventListener('click', () => {
    if (!canPlay()) return;
    setPaused(true);
    action.hidden = true;
    const state = hunt.status();
    const target = hunt.target()?.point;
    const player = position();
    const parked = parkedPosition();
    drawChart(find('hunt-map'), hunt, player, parked, target, state.stage);
    find('hunt-instructions').textContent = state.solving ? copy.order :
      state.seconds > 0 ? copy.trailDetails : copy.hints[state.stage];
    const distance = Math.round(Math.hypot(player.x - parked.x, player.z - parked.z));
    find('hunt-parking').textContent = copy.parking.replace('{distance}', String(distance));
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
    tick(dt, walking) {
      const message = hunt.update(dt, position(), walking);
      if (message && message !== 'gatePassed') announce(copy.messages[message], 3.5);
    },
  };
}
