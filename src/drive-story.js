import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getLocale } from './locale.js';

function createFace(card, index, total) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 304;
  const ctx = canvas.getContext('2d');
  const wash = ctx.createLinearGradient(0, 0, 1024, 304);
  wash.addColorStop(0, '#15292f');
  wash.addColorStop(.67, '#1c3036');
  wash.addColorStop(1, '#273a3f');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 1024, 304);
  ctx.strokeStyle = '#b49c72';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 984, 264);
  ctx.strokeStyle = '#50605b';
  ctx.beginPath();
  ctx.moveTo(47, 92);
  ctx.lineTo(974, 92);
  ctx.stroke();
  ctx.fillStyle = '#efcf9a';
  ctx.font = '600 30px system-ui';
  ctx.fillText(card.chapter.toLocaleUpperCase(), 49, 70, 725);
  ctx.textAlign = 'right';
  ctx.font = '28px monospace';
  ctx.fillText(String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0'), 973, 69);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fbf7ed';
  ctx.font = '650 70px system-ui';
  ctx.fillText(card.title, 48, 174, 929);
  ctx.fillStyle = '#d3deda';
  ctx.font = '420 32px system-ui';
  ctx.fillText(card.subtitle, 49, 235, 924);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshBasicMaterial({ map, toneMapped: false });
}

export function createSkyStories(scene, language) {
  const { profile, experience, education, projects, towers, stops } = getLocale(language);
  const content = {
    about: [[profile.name, profile.focus]],
    career: experience.map(job => [job.title, job.organization]),
    education: [[education[0].title, education[0].dates]],
    projects: [0, 4, 9].map(index => [projects[index].name, projects[index].type]),
    qualifications: [[language === 'hr' ? 'Tehnologije' : 'Technologies', towers.slice(0, 5).map(tech => tech.name).join('  ·  ')]],
    contact: [[profile.name, 'GitHub · LinkedIn']],
  };
  const cards = stops.flatMap(stop => content[stop.id].map(([title, subtitle]) => ({ chapter: stop.title, title, subtitle })));
  const faces = cards.map((card, index) => createFace(card, index, cards.length));
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new RoundedBoxGeometry(11.2, 3.43, .33, 3, .12),
    new THREE.MeshStandardMaterial({ color: 0xa69572, metalness: .63, roughness: .31 }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(10.9, 3.23), faces[0]);
  face.position.z = .171;
  group.add(frame, face);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(9.85, .031, .025),
    new THREE.MeshBasicMaterial({ color: 0xe9cd9c, toneMapped: false }));
  edge.position.set(0, -1.71, .113);
  group.add(edge);
  scene.add(group);
  let index = 0;
  let misplaced = 0;
  let reveal = 1;
  let travelled = 0;
  let animationTime = 0;
  const last = new THREE.Vector2();
  const anchor = new THREE.Vector2();

  function place(position, direction, revealNow) {
    anchor.set(position.x + direction.x * 27.5, position.z + direction.z * 27.5);
    reveal = revealNow ? 0 : 1;
    misplaced = 0;
  }

  function reset(position, direction) {
    index = 0;
    travelled = 0;
    last.set(position.x, position.z);
    face.material = faces[0];
    place(position, direction, false);
  }

  function update(position, direction, camera, dt, reduced) {
    travelled += Math.min(4, Math.hypot(last.x - position.x, last.y - position.z));
    last.set(position.x, position.z);
    const dx = anchor.x - position.x;
    const dz = anchor.y - position.z;
    const depth = dx * direction.x + dz * direction.z;
    const lateral = dx * direction.z - dz * direction.x;
    if ((depth < 12 && depth > -5 && Math.abs(lateral) < 12 && travelled > 14) || travelled > 52) {
      index = (index + 1) % cards.length;
      face.material = faces[index];
      travelled = 0;
      place(position, direction, true);
    } else if (depth < 8 || Math.abs(lateral) > depth * .48) {
      misplaced += dt;
      if (misplaced > .42) place(position, direction, true);
    } else {
      misplaced = 0;
    }
    reveal = reduced ? 1 : Math.min(1, reveal + dt * 1.9);
    const t = THREE.MathUtils.smootherstep(reveal, 0, 1);
    animationTime += dt;
    const bob = reduced ? 0 : Math.sin(animationTime * 1.4) * .13;
    group.position.set(anchor.x, 6.9 - (1 - t) * 2.75 + bob, anchor.y);
    group.rotation.y = Math.atan2(camera.position.x - anchor.x, camera.position.z - anchor.y);
    group.scale.setScalar(.72 + t * .28);
    return { card: cards[index], index, total: cards.length };
  }

  return { update, reset };
}
